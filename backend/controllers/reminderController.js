const db = require('../config/db');

// Track which reminders have been sent this session (avoid duplicates during interval)
const remindersSentThisSession = new Set();

// Parse medicine names from prescription text
function parseMedicines(prescription) {
    if (!prescription) return [];
    // Split by common delimiters: comma, semicolon, newline
    return prescription.split(/[,;\n]/).map(m => m.trim()).filter(m => m.length > 2).slice(0, 5);
}

// Schedule reminders – called once at server boot
function scheduleReminders(io) {
    console.log('⏰ Medication Reminder Scheduler started.');

    const run = async () => {
        try {
            // Get active medication schedules that need a reminder
            // Logic: is_active=1 AND (last_reminder_sent is NULL OR last_reminder_sent < NOW - frequency)
            // AND (start_date + duration > NOW)
            const [schedules] = await db.query(
                `SELECT ms.*, u.name as patient_name, u.id as patient_user_id, ud.name as doctor_name
                 FROM medication_schedules ms
                 JOIN patients p ON ms.patient_id = p.patient_id
                 JOIN users u ON p.user_id = u.id
                 JOIN doctors d ON ms.doctor_id = d.doctor_id
                 JOIN users ud ON d.user_id = ud.id
                 WHERE ms.is_active = 1 
                 AND (ms.last_reminder_sent IS NULL OR ms.last_reminder_sent <= DATE_SUB(NOW(), INTERVAL ms.frequency_hours HOUR))
                 AND DATE_ADD(ms.start_date, INTERVAL ms.duration_days DAY) >= NOW()`
            );

            for (const sched of schedules) {
                const message = `💊 Time to take your medicine: ${sched.medicine_name}`;

                // 1. Save reminder notification for patient
                await db.query(
                    `INSERT INTO notifications (recipient_id, patient_id, type, vital_type, value, message)
                     VALUES (?, ?, 'reminder', 'Medication', ?, ?)`,
                    [sched.patient_user_id, sched.patient_id, sched.medicine_name, message]
                );

                // 2. Insert into reminders_sent for tracking (Advanced Feature)
                const [remResult] = await db.query(
                    `INSERT INTO reminders_sent (schedule_id, patient_id, status, sent_at)
                     VALUES (?, ?, 'pending', NOW())`,
                    [sched.id, sched.patient_id]
                );

                // 3. Socket notification to patient
                if (io) {
                    io.to(`user_${sched.patient_user_id}`).emit('medication_reminder', {
                        reminder_id: remResult.insertId,
                        schedule_id: sched.id,
                        medicine: sched.medicine_name,
                        message,
                        doctor_name: sched.doctor_name,
                        timestamp: new Date().toISOString(),
                    });
                }

                // 4. Update last_reminder_sent
                await db.query(
                    `UPDATE medication_schedules SET last_reminder_sent = NOW() WHERE id = ?`,
                    [sched.id]
                );

                console.log(`⏰ Medication reminder tracked/sent to patient ${sched.patient_name}: ${sched.medicine_name}`);
            }

            // Also, auto-deactivate expired schedules
            await db.query(
                `UPDATE medication_schedules 
                 SET is_active = 0 
                 WHERE is_active = 1 AND DATE_ADD(start_date, INTERVAL duration_days DAY) < NOW()`
            );

        } catch (err) {
            console.error('Reminder scheduler error:', err.message);
        }
    };

    // Run every 10 minutes (600,000 ms) in production
    // For demo/testing: every 1 minute
    setInterval(run, 60000);
    setTimeout(run, 5000); // Initial run
}

// GET /api/reminders/my  → patient's past reminder notifications
const getMyReminders = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT n.*, u.name as patient_name
             FROM notifications n
             LEFT JOIN patients p ON n.patient_id = p.patient_id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE n.recipient_id = ? AND n.type = 'reminder'
             ORDER BY n.created_at DESC LIMIT 20`,
            [req.user.id]
        );
        res.json({ success: true, reminders: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/reminders/active  → patient's active schedules
const getActiveSchedules = async (req, res) => {
    try {
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });

        const [rows] = await db.query(
            `SELECT ms.*, ud.name as doctor_name
             FROM medication_schedules ms
             JOIN doctors d ON ms.doctor_id = d.doctor_id
             JOIN users ud ON d.user_id = ud.id
             WHERE ms.patient_id = ? AND ms.is_active = 1
             ORDER BY ms.start_date DESC`,
            [patientRows[0].patient_id]
        );
        res.json({ success: true, schedules: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// POST /api/reminders/take/:reminder_id  → patient marks as taken
const markAsTaken = async (req, res) => {
    try {
        const { reminder_id } = req.params;
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0) return res.status(404).json({ success: false });

        const [result] = await db.query(
            "UPDATE reminders_sent SET status = 'taken', taken_at = NOW() WHERE reminder_id = ? AND patient_id = ?",
            [reminder_id, patientRows[0].patient_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Reminder record not found or already processed.' });
        }

        res.json({ success: true, message: 'Medication marked as taken! Stay healthy.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { scheduleReminders, getMyReminders, getActiveSchedules, markAsTaken };
