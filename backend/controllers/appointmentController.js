const db = require('../config/db');
const { sendAppointmentConfirmation } = require('../services/emailService');

// ── AI Triage Engine ──────────────────────────────────────────────────────────
const EMERGENCY_KEYWORDS = [
    'emergency', 'urgent', 'severe', 'chest pain', 'heart attack', 'stroke',
    'unconscious', 'faint', 'fainting', 'can\'t breathe', 'cannot breathe',
    'difficulty breathing', 'high fever', 'bleeding', 'vomiting blood',
    'accident', 'fracture', 'broken', 'paralysis', 'seizure', 'convulsion',
    'allergic reaction', 'anaphylaxis', 'high sugar', 'diabetic',
    'very high bp', 'very low bp', 'oxygen low', 'critical', 'serious',
    'immediate', 'sudden', 'extreme pain', 'unbearable',
];

function runAITriage(text) {
    if (!text) return { priority: 'normal', triageResult: 'Routine', isEmergency: false };
    const lower = text.toLowerCase();
    const matched = EMERGENCY_KEYWORDS.find(kw => lower.includes(kw));
    if (matched) {
        return { priority: 'high', triageResult: `Emergency (${matched})`, isEmergency: true };
    }
    return { priority: 'normal', triageResult: 'Routine', isEmergency: false };
}

// Generate a unique queue token: VS-YYYYMMDD-NNN
function generateToken(sequenceNum) {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `VS-${dateStr}-${String(sequenceNum).padStart(3, '0')}`;
}

// POST /api/appointments/book
const bookAppointment = async (req, res) => {
    const { doctor_id, appointment_date, notes, symptoms } = req.body;
    const io = req.app.get('io');

    if (!doctor_id || !appointment_date)
        return res.status(400).json({ success: false, message: 'Doctor ID and appointment date are required.' });

    try {
        // Get patient info
        const [patientRows] = await db.query(
            `SELECT p.patient_id, u.name, u.email, u.phone
             FROM patients p JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ?`,
            [req.user.id]
        );
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const { patient_id, name: patientName, email: patientEmail } = patientRows[0];

        // Get doctor info
        const [doctorRows] = await db.query(
            `SELECT u.name, u.id as user_id, d.specialization
             FROM doctors d JOIN users u ON d.user_id = u.id
             WHERE d.doctor_id = ?`,
            [doctor_id]
        );
        if (doctorRows.length === 0)
            return res.status(404).json({ success: false, message: 'Doctor not found.' });

        const { name: doctorName, user_id: doctorUserId } = doctorRows[0];

        // ── AI Triage ───────────────────────────────────────────────
        const triageInput = [symptoms, notes].filter(Boolean).join(' ');
        const { priority, triageResult, isEmergency } = runAITriage(triageInput);

        // ── Queue Position ──────────────────────────────────────────
        const [countRows] = await db.query(
            `SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND DATE(appointment_date) = CURDATE()`,
            [doctor_id]
        );
        const queuePosition = (countRows[0].count || 0) + 1;
        const queueToken = generateToken(queuePosition);

        // ── Insert appointment ──────────────────────────────────────
        const [result] = await db.query(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes, priority, queue_token, queue_position, triage_result)
             VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
            [patient_id, doctor_id, appointment_date, notes || symptoms || null,
                priority, queueToken, queuePosition, triageResult]
        );

        // ── Socket alert to doctor if high priority ─────────────────
        if (isEmergency && io) {
            const alertMsg = `🚨 Emergency appointment booked by ${patientName}! Token: ${queueToken}`;
            io.to(`user_${doctorUserId}`).emit('critical_alert', {
                patient_name: patientName, patient_id, vital_type: 'Appointment',
                value: 'HIGH PRIORITY', message: alertMsg, timestamp: new Date().toISOString(),
            });
            io.to('doctors').emit('emergency_appointment', {
                patient_name: patientName, patient_id, doctor_name: doctorName,
                queue_token: queueToken, triage_result: triageResult,
                appointment_date, message: alertMsg, timestamp: new Date().toISOString(),
            });

            // Save notification for doctor
            await db.query(
                `INSERT INTO notifications (recipient_id, patient_id, type, vital_type, value, message)
                 VALUES (?, ?, 'critical', 'Triage', ?, ?)`,
                [doctorUserId, patient_id, triageResult, alertMsg]
            );
        }

        // ── Email notification ──────────────────────────────────────
        const emailData = sendAppointmentConfirmation({
            patientName, patientEmail, doctorName, appointmentDate: appointment_date,
            queueToken, queuePosition, priority, triageResult,
        });

        res.status(201).json({
            success: true,
            message: `Appointment booked! ${isEmergency ? '🚨 HIGH PRIORITY – Doctor alerted.' : 'Awaiting confirmation.'}`,
            appointment_id: result.insertId,
            triage: { priority, triageResult, isEmergency },
            queue: { token: queueToken, position: queuePosition },
            email: emailData, // returned for frontend to show preview
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/appointments/list
const listAppointments = async (req, res) => {
    try {
        let query, params;
        if (req.user.role === 'patient') {
            query = `
                SELECT a.id, a.appointment_date, a.status, a.notes,
                       a.priority, a.queue_token, a.queue_position, a.triage_result,
                       u.name AS doctor_name, d.specialization
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.doctor_id
                JOIN users u ON d.user_id = u.id
                JOIN patients p ON a.patient_id = p.patient_id
                WHERE p.user_id = ?
                ORDER BY a.priority DESC, a.appointment_date DESC`;
            params = [req.user.id];
        } else {
            query = `
                SELECT a.id, a.appointment_date, a.status, a.notes,
                       a.priority, a.queue_token, a.queue_position, a.triage_result,
                       u.name AS patient_name, p.age, p.gender, p.blood_group, p.patient_id
                FROM appointments a
                JOIN patients p ON a.patient_id = p.patient_id
                JOIN users u ON p.user_id = u.id
                JOIN doctors d ON a.doctor_id = d.doctor_id
                WHERE d.user_id = ?
                ORDER BY a.priority DESC, a.appointment_date ASC`;
            params = [req.user.id];
        }
        const [rows] = await db.query(query, params);
        res.json({ success: true, appointments: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/appointments/update/:id  (doctor only)
const updateAppointment = async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'rejected', 'completed'];
    if (!validStatuses.includes(status))
        return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}.` });

    try {
        const [rows] = await db.query(
            `SELECT a.id, a.queue_token, a.queue_position, a.priority, a.triage_result,
                    u_p.name as patient_name, u_p.email as patient_email,
                    u_d.name as doctor_name, a.appointment_date
             FROM appointments a
             JOIN doctors d ON a.doctor_id = d.doctor_id
             JOIN patients p ON a.patient_id = p.patient_id
             JOIN users u_p ON p.user_id = u_p.id
             JOIN users u_d ON d.user_id = u_d.id
             WHERE a.id = ? AND d.user_id = ?`,
            [req.params.id, req.user.id]
        );
        if (rows.length === 0)
            return res.status(403).json({ success: false, message: 'Appointment not found or unauthorized.' });

        await db.query('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);

        // ── Socket notification to patient ──────────────────────────
        const io = req.app.get('io');
        if (io && rows[0]) {
            const appointment = rows[0];
            // Get patient user_id from patient_id
            const [pUser] = await db.query('SELECT user_id FROM patients WHERE patient_id = (SELECT patient_id FROM appointments WHERE id = ?)', [req.params.id]);
            if (pUser.length > 0) {
                io.to(`user_${pUser[0].user_id}`).emit('appointment_status_update', {
                    appointment_id: req.params.id,
                    status: status,
                    doctor_name: appointment.doctor_name,
                    message: `Your appointment with Dr. ${appointment.doctor_name} has been ${status}.`
                });
            }
        }

        // Log email when doctor confirms
        if (status === 'confirmed') {
            const a = rows[0];
            const { sendAppointmentConfirmation: sendConf } = require('../services/emailService');
            sendConf({
                patientName: a.patient_name, patientEmail: a.patient_email,
                doctorName: a.doctor_name, appointmentDate: a.appointment_date,
                queueToken: a.queue_token, queuePosition: a.queue_position,
                priority: a.priority, triageResult: a.triage_result,
            });
        }

        res.json({ success: true, message: `Appointment ${status} successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/appointments/stats  (doctor)
const getAppointmentStats = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT status, COUNT(*) as count FROM appointments a
             JOIN doctors d ON a.doctor_id = d.doctor_id
             WHERE d.user_id = ? GROUP BY status`,
            [req.user.id]
        );
        const stats = { pending: 0, confirmed: 0, rejected: 0, completed: 0 };
        rows.forEach(r => { stats[r.status] = r.count; });

        // Also count high-priority pending
        const [highRows] = await db.query(
            `SELECT COUNT(*) as count FROM appointments a
             JOIN doctors d ON a.doctor_id = d.doctor_id
             WHERE d.user_id = ? AND a.priority = 'high' AND a.status = 'pending'`,
            [req.user.id]
        );
        stats.high_priority = highRows[0].count;

        res.json({ success: true, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE /api/appointments/delete/:id (doctor only)
const deleteAppointment = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.id FROM appointments a
             JOIN doctors d ON a.doctor_id = d.doctor_id
             WHERE a.id = ? AND d.user_id = ?`,
            [req.params.id, req.user.id]
        );
        if (rows.length === 0)
            return res.status(403).json({ success: false, message: 'Appointment not found or unauthorized.' });

        await db.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Appointment deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { bookAppointment, listAppointments, updateAppointment, getAppointmentStats, deleteAppointment };
