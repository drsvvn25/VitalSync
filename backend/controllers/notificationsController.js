const db = require('../config/db');

// GET /api/notifications/my  → doctor's notifications
const getNotifications = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT n.*, u.name as patient_name
             FROM notifications n
             LEFT JOIN patients p ON n.patient_id = p.patient_id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE n.recipient_id = ?
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [req.user.id]
        );
        const unread = rows.filter(r => !r.is_read).length;
        res.json({ success: true, notifications: rows, unread });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/notifications/unread-critical  → doctor polls for new SOS/critical alerts
const getUnreadCritical = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT n.*, u.name as patient_name
             FROM notifications n
             LEFT JOIN patients p ON n.patient_id = p.patient_id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE n.recipient_id = ? AND n.is_read = 0
               AND n.type IN ('critical','sos')
             ORDER BY n.created_at DESC
             LIMIT 10`,
            [req.user.id]
        );
        res.json({ success: true, alerts: rows, count: rows.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/notifications/read/:id
const markRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?', [req.user.id]);
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// POST /api/notifications/sos  → patient triggers SOS
const triggerSOS = async (req, res) => {
    const io = req.app.get('io');
    try {
        // Get patient info
        const [patientRows] = await db.query(
            `SELECT p.patient_id, u.name as patient_name, u.phone as patient_phone
             FROM patients p JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ?`,
            [req.user.id]
        );
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient not found.' });

        const { patient_id, patient_name, patient_phone } = patientRows[0];
        const message = `🆘 Emergency SOS triggered by patient ${patient_name}! Immediate attention required.`;

        // Find assigned doctors via appointments
        const [doctorRows] = await db.query(
            `SELECT DISTINCT d.user_id as doctor_user_id, d.doctor_id, u.name as doctor_name, u.phone as doctor_phone
             FROM appointments a
             JOIN doctors d ON a.doctor_id = d.doctor_id
             JOIN users u ON d.user_id = u.id
             WHERE a.patient_id = ?
             LIMIT 5`,
            [patient_id]
        );

        // Fallback: notify ALL doctors if none assigned
        let doctors = doctorRows;
        if (doctors.length === 0) {
            const [allDocs] = await db.query(
                `SELECT u.id as doctor_user_id, d.doctor_id, u.name as doctor_name, u.phone as doctor_phone
                 FROM users u JOIN doctors d ON u.id = d.user_id WHERE u.role = 'doctor' LIMIT 5`
            );
            doctors = allDocs;
        }

        const socketPayload = {
            patient_name,
            patient_id,
            patient_phone,
            message,
            timestamp: new Date().toISOString(),
        };

        // Auto-book an emergency appointment for the first assigned doctor
        let assignedDoctorId = doctors.length > 0 ? doctors[0].doctor_id : null;
        if (assignedDoctorId) {
            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const queueToken = `SOS-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

            // Insert highest priority appointment
            await db.query(
                `INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes, priority, queue_token, triage_result)
                 VALUES (?, ?, NOW(), 'pending', 'EMERGENCY SOS', 'high', ?, 'SOS TRIGGER')`,
                [patient_id, assignedDoctorId, queueToken]
            );
        }

        for (const doc of doctors) {
            // Save to DB (so polling fallback also works)
            const [notifResult] = await db.query(
                `INSERT INTO notifications (recipient_id, patient_id, type, vital_type, value, message)
                 VALUES (?, ?, 'sos', 'SOS', 'EMERGENCY', ?)`,
                [doc.doctor_user_id, patient_id, message]
            );

            const notification_id = notifResult.insertId;

            // Emit to personal room (exact match)
            if (io) {
                io.to(`user_${doc.doctor_user_id}`).emit('emergency_sos', {
                    ...socketPayload,
                    id: notification_id
                });
                console.log(`   📡 Emitted to room user_${doc.doctor_user_id}`);
            }

            // Simulated SMS log
            console.log(`\n📲 Emergency SMS sent to doctor ${doc.doctor_name} (${doc.doctor_phone})`);
            console.log(`   🆘 Message: ${message}\n`);
        }

        // ALSO broadcast to ALL connected doctors via shared room
        // This guarantees delivery even if personal room targeting fails
        if (io) {
            io.to('doctors').emit('emergency_sos', socketPayload);
            console.log(`   📡 Broadcast to shared 'doctors' room`);
        }

        res.json({
            success: true,
            message: 'Emergency SOS alert sent to your doctor(s).',
            doctors_notified: doctors.length,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getNotifications, getUnreadCritical, markRead, markAllRead, triggerSOS };
