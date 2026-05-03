const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
require('dotenv').config();

// POST /api/auth/register
const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, phone, age, gender, blood_group, address, specialization, experience } = req.body;

    try {
        // Check duplicate email
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user
        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'patient', phone || null]
        );
        const userId = userResult.insertId;

        // Create role-specific record
        if (role === 'doctor') {
            await db.query(
                'INSERT INTO doctors (user_id, specialization, experience) VALUES (?, ?, ?)',
                [userId, specialization || '', experience || 0]
            );
        } else {
            await db.query(
                'INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?, ?, ?, ?, ?)',
                [userId, age || null, gender || null, blood_group || null, address || null]
            );
        }

        // Generate JWT
        const token = jwt.sign(
            { id: userId, email, role: role || 'patient', name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            token,
            user: { id: userId, name, email, role: role || 'patient' },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful.',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({ success: true, user: users[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Validation rules
const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

module.exports = { register, login, getMe, registerValidation };
