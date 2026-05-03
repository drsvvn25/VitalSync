const db = require('../config/db');

// Request an ambulance
const requestAmbulance = async (req, res) => {
    try {
        const { pickup_address, lat, lng } = req.body;
        if (!pickup_address) return res.status(400).json({ success: false, message: 'Pickup address required.' });

        const [pRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (pRows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
        const patient_id = pRows[0].patient_id;

        // Find available ambulance
        const [aRows] = await db.query("SELECT ambulance_id FROM ambulances WHERE status = 'available' LIMIT 1");
        const ambulance_id = aRows.length > 0 ? aRows[0].ambulance_id : null;

        // Submitting Request
        const [result] = await db.query(
            'INSERT INTO ambulance_requests (patient_id, ambulance_id, pickup_address, pickup_lat, pickup_lng, status) VALUES (?, ?, ?, ?, ?, ?)',
            [patient_id, ambulance_id, pickup_address, lat || null, lng || null, ambulance_id ? 'dispatched' : 'pending']
        );

        if (ambulance_id) {
            await db.query("UPDATE ambulances SET status = 'dispatched' WHERE ambulance_id = ?", [ambulance_id]);
            
            // Emit socket to patient to confirm dispatch
            const io = req.app.get('io');
            if (io) {
                // We emit back via personal room
                io.to(`user_${req.user.id}`).emit('ambulance_dispatched', {
                    request_id: result.insertId,
                    message: `Ambulance dispatched to ${pickup_address}. Help is on the way!`
                });
            }
            res.json({ success: true, message: 'Ambulance requested and dispatched!', dispatched: true });
        } else {
            res.status(201).json({ success: true, message: 'Ambulance requested. Searching for available driver...', dispatched: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Check Request Status
const getPatientAmbulanceRequests = async (req, res) => {
    try {
        const [pRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (pRows.length === 0) return res.status(404).json({ success: false });

        const [requests] = await db.query(
            `SELECT ar.*, a.vehicle_number, a.driver_name, a.driver_phone 
             FROM ambulance_requests ar 
             LEFT JOIN ambulances a ON ar.ambulance_id = a.ambulance_id 
             WHERE ar.patient_id = ? ORDER BY ar.request_time DESC LIMIT 10`,
            [pRows[0].patient_id]
        );

        res.json({ success: true, requests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// (Doctor/Admin) View list of requests
const getAllRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT ar.*, p.patient_id, u.name as patient_name, u.phone 
             FROM ambulance_requests ar 
             JOIN patients p ON ar.patient_id = p.patient_id 
             JOIN users u ON p.user_id = u.id
             ORDER BY ar.request_time DESC LIMIT 50`
        );
        res.json({ success: true, requests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { requestAmbulance, getPatientAmbulanceRequests, getAllRequests };
