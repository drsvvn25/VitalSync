const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/admin/stats
const getSystemStats = async (req, res) => {
    try {
        const [patients] = await db.query('SELECT COUNT(*) as count FROM patients');
        const [doctors] = await db.query('SELECT COUNT(*) as count FROM doctors');
        const [appointments] = await db.query('SELECT COUNT(*) as count FROM appointments');
        const [vitals] = await db.query('SELECT COUNT(*) as count FROM vital_stats');
        const [revenue] = await db.query('SELECT SUM(amount) as total FROM transactions WHERE transaction_type = "debit"');
        const [transactions] = await db.query('SELECT COUNT(*) as count FROM transactions');
        
        res.json({
            success: true,
            stats: {
                totalPatients: patients[0].count,
                totalDoctors: doctors[0].count,
                totalAppointments: appointments[0].count,
                totalRevenue: revenue[0].total || 0,
                totalTransactions: transactions[0].count
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/admin/doctors
const getAllDoctors = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, d.specialization, d.experience, c.name as clinic_name
            FROM users u
            JOIN doctors d ON u.id = d.user_id
            LEFT JOIN clinics c ON d.clinic_id = c.clinic_id
            WHERE u.role = 'doctor'
        `);
        res.json({ success: true, doctors: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/admin/doctors/add
const addDoctor = async (req, res) => {
    const { name, email, password, phone, specialization, experience, clinic_id } = req.body;
    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Email already exists.' });

        const hashedPassword = await bcrypt.hash(password || 'Doctor@123', 12);
        const [uResult] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, "doctor", ?)',
            [name, email, hashedPassword, phone]
        );
        const userId = uResult.insertId;

        await db.query(
            'INSERT INTO doctors (user_id, specialization, experience, clinic_id) VALUES (?, ?, ?, ?)',
            [userId, specialization, experience || 0, clinic_id || null]
        );

        res.status(201).json({ success: true, message: 'Doctor added successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User removed.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/admin/patients
const getAllPatients = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.name, u.email, u.phone, p.age, p.gender, p.blood_group, p.address
            FROM users u
            JOIN patients p ON u.id = p.user_id
            WHERE u.role = 'patient'
            ORDER BY u.created_at DESC
        `);
        res.json({ success: true, patients: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/admin/appointments
const getAllAppointments = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason,
                   up.name as patient_name, ud.name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN users up ON p.user_id = up.id
            JOIN doctors d ON a.doctor_id = d.doctor_id
            JOIN users ud ON d.user_id = ud.id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT 50
        `);
        res.json({ success: true, appointments: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/admin/transactions
const getAllTransactions = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, u.name as patient_name
            FROM transactions t
            JOIN patient_wallets pw ON t.wallet_id = pw.wallet_id
            JOIN patients p ON pw.patient_id = p.patient_id
            JOIN users u ON p.user_id = u.id
            ORDER BY t.transaction_date DESC
            LIMIT 50
        `);
        res.json({ success: true, transactions: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/admin/records
const getAllMedicalRecords = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT mr.id, mr.diagnosis, mr.prescription, mr.notes, mr.date,
                   up.name AS patient_name, p.patient_id,
                   ud.name AS doctor_name, d.specialization
            FROM medical_records mr
            JOIN patients p ON mr.patient_id = p.patient_id
            JOIN users up ON p.user_id = up.id
            JOIN doctors d ON mr.doctor_id = d.doctor_id
            JOIN users ud ON d.user_id = ud.id
            ORDER BY mr.date DESC
        `);
        res.json({ success: true, records: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { 
    getSystemStats, 
    getAllDoctors, 
    addDoctor, 
    deleteUser, 
    getAllPatients, 
    getAllAppointments, 
    getAllTransactions,
    getAllMedicalRecords
};
