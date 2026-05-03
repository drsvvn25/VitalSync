const db = require('../config/db');

// Start a telemedicine session (Doctor only)
const startSession = async (req, res) => {
    try {
        const { appointment_id } = req.body;
        if (!appointment_id) return res.status(400).json({ success: false, message: 'Appointment ID required.' });

        const [apptRows] = await db.query(
            'SELECT a.*, u.name as patient_name, u.id as patient_user_id FROM appointments a JOIN patients p ON a.patient_id = p.patient_id JOIN users u ON p.user_id = u.id WHERE a.id = ?',
            [appointment_id]
        );
        if (apptRows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });

        // Generate a mock meeting link (e.g., Jitsi Meet)
        const roomName = `VitalSync-Session-${appointment_id}-${Math.floor(Math.random() * 10000)}`;
        const meeting_link = `https://meet.jit.si/${roomName}`;

        // Insert or Update session
        await db.query(
            'INSERT INTO telemedicine_sessions (appointment_id, meeting_link, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE meeting_link = VALUES(meeting_link), status = "active"',
            [appointment_id, meeting_link]
        );

        // Notify patient via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${apptRows[0].patient_user_id}`).emit('telemedicine_session_started', {
                appointment_id,
                meeting_link,
                doctor_name: req.user.name,
                message: `Dr. ${req.user.name} has started your video consultation. Click here to join.`
            });
        }

        res.json({ success: true, meeting_link, message: 'Telemedicine session started and patient notified.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get session details
const getSession = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM telemedicine_sessions WHERE appointment_id = ? AND status = "active"',
            [req.params.appointment_id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'No active session found.' });
        res.json({ success: true, session: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// End a session
const endSession = async (req, res) => {
    try {
        await db.query(
            'UPDATE telemedicine_sessions SET status = "ended" WHERE appointment_id = ?',
            [req.body.appointment_id]
        );
        res.json({ success: true, message: 'Session ended.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { startSession, getSession, endSession };
