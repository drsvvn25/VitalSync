const db = require('../config/db');
const { autoReserveBed } = require('./bedsController');

// ── Critical Health Alert thresholds ─────────────────────────
const CRITICAL = {
    heart_rate: { min: 50, max: 120 },
    oxygen_level: { min: 90 },
    temperature: { max: 39 },
    sugar_level: { max: 250 },
};

// Check if any vital is critical and return list of issues
function checkCritical(vitals) {
    const issues = [];
    if (vitals.heart_rate != null && (vitals.heart_rate < CRITICAL.heart_rate.min || vitals.heart_rate > CRITICAL.heart_rate.max))
        issues.push({ type: 'Heart Rate', value: `${vitals.heart_rate} bpm`, message: `Heart rate ${vitals.heart_rate} bpm is critical (safe: 50–120 bpm)` });
    if (vitals.oxygen_level != null && vitals.oxygen_level < CRITICAL.oxygen_level.min)
        issues.push({ type: 'Oxygen Level', value: `${vitals.oxygen_level}%`, message: `Oxygen level ${vitals.oxygen_level}% is critically low (safe: ≥90%)` });
    if (vitals.temperature != null && vitals.temperature > CRITICAL.temperature.max)
        issues.push({ type: 'Temperature', value: `${vitals.temperature}°C`, message: `Temperature ${vitals.temperature}°C is critically high (safe: ≤39°C)` });
    if (vitals.sugar_level != null && vitals.sugar_level > CRITICAL.sugar_level.max)
        issues.push({ type: 'Sugar Level', value: `${vitals.sugar_level} mg/dL`, message: `Sugar level ${vitals.sugar_level} mg/dL is critically high (safe: ≤250 mg/dL)` });
    return issues;
}

// Normal (abnormal but not critical) thresholds for informational alerts
const NORMAL = {
    heart_rate: { min: 60, max: 100 },
    oxygen_level: { min: 95 },
    temperature: { min: 36.1, max: 37.2 },
};

function checkAbnormal(vitals) {
    const alerts = [];
    if (vitals.heart_rate != null && (vitals.heart_rate < NORMAL.heart_rate.min || vitals.heart_rate > NORMAL.heart_rate.max))
        alerts.push(`Heart rate ${vitals.heart_rate} bpm is outside normal range (60–100 bpm).`);
    if (vitals.oxygen_level != null && vitals.oxygen_level < NORMAL.oxygen_level.min)
        alerts.push(`Oxygen level ${vitals.oxygen_level}% is below normal (≥95%).`);
    if (vitals.temperature != null && (vitals.temperature < NORMAL.temperature.min || vitals.temperature > NORMAL.temperature.max))
        alerts.push(`Temperature ${vitals.temperature}°C is outside normal range (36.1–37.2°C).`);
    return alerts;
}

// POST /api/vitals/add
const addVitals = async (req, res) => {
    const { heart_rate, blood_pressure, oxygen_level, temperature, sugar_level } = req.body;
    const io = req.app.get('io');

    try {
        // Get patient info
        const [patientRows] = await db.query(
            `SELECT p.patient_id, u.name as patient_name
             FROM patients p JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ?`,
            [req.user.id]
        );
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const { patient_id, patient_name } = patientRows[0];

        const [result] = await db.query(
            `INSERT INTO vital_stats (patient_id, heart_rate, blood_pressure, oxygen_level, temperature, sugar_level)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [patient_id, heart_rate, blood_pressure, oxygen_level, temperature, sugar_level || null]
        );

        // Normal alerts (for response)
        const alerts = checkAbnormal({ heart_rate, oxygen_level, temperature });

        // Critical alerts → notify doctor
        const criticalIssues = checkCritical({ heart_rate, oxygen_level, temperature, sugar_level });

        if (criticalIssues.length > 0) {
            // Find assigned doctor(s) via appointments
            const [doctorRows] = await db.query(
                `SELECT DISTINCT d.doctor_id, d.user_id as doctor_user_id, u.name as doctor_name, u.phone as doctor_phone
                 FROM appointments a
                 JOIN doctors d ON a.doctor_id = d.doctor_id
                 JOIN users u ON d.user_id = u.id
                 WHERE a.patient_id = ?
                 LIMIT 5`,
                [patient_id]
            );

            for (const issue of criticalIssues) {
                const msg = `🚨 Critical health alert for patient ${patient_name}: ${issue.message}`;

                // Save notification for each assigned doctor
                for (const doc of doctorRows) {
                    const [notifResult] = await db.query(
                        `INSERT INTO notifications (recipient_id, patient_id, type, vital_type, value, message)
                         VALUES (?, ?, 'critical', ?, ?, ?)`,
                        [doc.doctor_user_id, patient_id, issue.type, issue.value, msg]
                    );

                    const notification_id = notifResult.insertId;

                    // Real-time socket alert
                    if (io) {
                        io.to(`user_${doc.doctor_user_id}`).emit('critical_alert', {
                            id: notification_id,
                            patient_name,
                            patient_id,
                            vital_type: issue.type,
                            value: issue.value,
                            message: msg,
                            timestamp: new Date().toISOString(),
                        });
                    }

                    // Simulated mobile push notification
                    console.log(`\n📱 Mobile notification sent to doctor ${doc.doctor_name} (${doc.doctor_phone})`);
                    console.log(`   📋 Alert: ${msg}\n`);
                }
            }
        }

            // --- AUTOMATION: Auto-book emergency appointment & reserve bed ---
        for (const doc of doctorRows) {
            // Generate queue token
            const [countRows] = await db.query(
                `SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND DATE(appointment_date) = CURDATE()`,
                [doc.doctor_id]
            );
            const queuePosition = (countRows[0].count || 0) + 1;
            const dDate = new Date();
            const dMonth = String(dDate.getMonth() + 1).padStart(2, '0');
            const dDay = String(dDate.getDate()).padStart(2, '0');
            const dateStr = `${dDate.getFullYear()}${dMonth}${dDay}`;
            const queueToken = `VS-${dateStr}-${String(queuePosition).padStart(3, '0')}`;

            const triageResult = 'Emergency (Critical Vitals)';
            
            await db.query(`
                INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes, priority, queue_token, queue_position, triage_result)
                VALUES (?, ?, NOW(), 'pending', 'Automated Emergency Appointment due to critical vitals log.', 'high', ?, ?, ?)
            `, [patient_id, doc.doctor_id, queueToken, queuePosition, triageResult]);

            // Try to auto reserve a bed at this doctor's clinic
            let bedMessage = '';
            if (doc.clinic_id) {
                const bed = await autoReserveBed(patient_id, doc.clinic_id);
                if (bed) {
                    bedMessage = ` A ${bed.ward_type} bed (${bed.bed_number}) has been auto-reserved at your clinic.`;
                }
            }
            
            if (io) {
                io.to('doctors').emit('emergency_appointment', {
                    patient_name: patient_name, patient_id, doctor_name: doc.doctor_name,
                    queue_token: queueToken, triage_result: triageResult,
                    appointment_date: new Date().toISOString(), message: 'Automated Emergency Booking.' + bedMessage, timestamp: new Date().toISOString(),
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Vital stats recorded successfully.',
            id: result.insertId,
            alerts: alerts.length > 0 ? alerts : null,
            critical: criticalIssues.length > 0 ? criticalIssues : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/vitals/:patientId
const getVitals = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT v.*, u.name as patient_name
             FROM vital_stats v
             JOIN patients p ON v.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.id
             WHERE v.patient_id = ?
             ORDER BY v.record_date DESC
             LIMIT 50`,
            [req.params.patientId]
        );
        res.json({ success: true, vitals: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/vitals/my/all  → patient's own vitals
const getMyVitals = async (req, res) => {
    try {
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const patient_id = patientRows[0].patient_id;

        const [rows] = await db.query(
            'SELECT * FROM vital_stats WHERE patient_id = ? ORDER BY record_date DESC LIMIT 30',
            [patient_id]
        );
        res.json({ success: true, vitals: rows, patient_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/vitals/my/latest-single
const getLatestVital = async (req, res) => {
    try {
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const [rows] = await db.query(
            'SELECT * FROM vital_stats WHERE patient_id = ? ORDER BY record_date DESC LIMIT 1',
            [patientRows[0].patient_id]
        );
        res.json({ success: true, vital: rows[0] || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE /api/vitals/delete/:id (doctor or patient)
const deleteVital = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT patient_id FROM vital_stats WHERE id = ?', [req.params.id]);
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: 'Vital record not found.' });
        
        // Since doctors manage patients, we trust them to delete erroneous vitals that show up on their dashboard
        await db.query('DELETE FROM vital_stats WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Vital record deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { addVitals, getVitals, getMyVitals, getLatestVital, deleteVital };
