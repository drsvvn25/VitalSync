const db = require('../config/db');

// GET /api/patient/profile
const getProfile = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              p.patient_id, p.age, p.gender, p.blood_group, p.address
       FROM users u
       LEFT JOIN patients p ON u.id = p.user_id
       WHERE u.id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
        res.json({ success: true, patient: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUT /api/patient/update
const updateProfile = async (req, res) => {
    const { name, phone, age, gender, blood_group, address } = req.body;
    try {
        await db.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
        await db.query(
            'UPDATE patients SET age = ?, gender = ?, blood_group = ?, address = ? WHERE user_id = ?',
            [age, gender, blood_group, address, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/patient/all  (doctor only)
const getAllPatients = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              p.patient_id, p.age, p.gender, p.blood_group, p.address
       FROM users u
       JOIN patients p ON u.id = p.user_id
       WHERE u.role = 'patient'
       ORDER BY u.created_at DESC`
        );
        res.json({ success: true, patients: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/patient/:id  (doctor only)
const getPatientById = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              p.patient_id, p.age, p.gender, p.blood_group, p.address
       FROM users u
       JOIN patients p ON u.id = p.user_id
       WHERE u.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
        res.json({ success: true, patient: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getProfile, updateProfile, getAllPatients, getPatientById };
