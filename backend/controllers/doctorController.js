const db = require('../config/db');

// GET /api/doctor/profile
const getDoctorProfile = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              d.doctor_id, d.specialization, d.experience,
              c.clinic_id, c.name AS clinic_name, c.address AS clinic_address, c.contact AS clinic_contact
             FROM users u
             LEFT JOIN doctors d ON u.id = d.user_id
             LEFT JOIN clinics c ON d.clinic_id = c.clinic_id
             WHERE u.id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Doctor not found.' });
        res.json({ success: true, doctor: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/doctor/patients  – all patients assigned to this doctor via appointments
const getDoctorPatients = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT DISTINCT u.id, u.name, u.email, u.phone,
              p.patient_id, p.age, p.gender, p.blood_group
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN users u ON p.user_id = u.id
       WHERE d.user_id = ?
       ORDER BY u.name`,
            [req.user.id]
        );
        res.json({ success: true, patients: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/doctor/all  (for patient booking)
const getAllDoctors = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, d.doctor_id, d.specialization, d.experience,
              c.clinic_id, c.name AS clinic_name, c.address AS clinic_address, c.latitude, c.longitude, c.city, c.district, c.contact
             FROM users u
             JOIN doctors d ON u.id = d.user_id
             LEFT JOIN clinics c ON d.clinic_id = c.clinic_id
             WHERE u.role = 'doctor'
             ORDER BY u.name`
        );
        res.json({ success: true, doctors: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/doctor/update
const updateDoctorProfile = async (req, res) => {
    const { name, phone, specialization, experience } = req.body;
    try {
        await db.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
        await db.query(
            'UPDATE doctors SET specialization = ?, experience = ? WHERE user_id = ?',
            [specialization, experience, req.user.id]
        );
        res.json({ success: true, message: 'Doctor profile updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/doctor/stats
const getDoctorStats = async (req, res) => {
    try {
        const [[{ totalPatients }]] = await db.query(
            `SELECT COUNT(DISTINCT p.patient_id) AS totalPatients
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE d.user_id = ?`,
            [req.user.id]
        );
        const [[{ pendingAppointments }]] = await db.query(
            `SELECT COUNT(*) AS pendingAppointments
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       WHERE d.user_id = ? AND a.status = 'pending'`,
            [req.user.id]
        );
        res.json({ success: true, stats: { totalPatients, pendingAppointments } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getDoctorProfile, getDoctorPatients, getAllDoctors, updateDoctorProfile, getDoctorStats };
