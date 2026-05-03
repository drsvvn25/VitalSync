const db = require('../config/db');
const path = require('path');
const { sendPrescriptionEmail } = require('../services/emailService');
const { autoGenerateBill } = require('./walletController');

// POST /api/records/add  (doctor only)
const addRecord = async (req, res) => {
    const { patient_id, diagnosis, prescription, notes, medications } = req.body;

    if (!patient_id || !diagnosis) {
        return res.status(400).json({ success: false, message: 'Patient ID and diagnosis are required.' });
    }

    try {
        // Get doctor_id
        const [doctorRows] = await db.query('SELECT doctor_id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (doctorRows.length === 0)
            return res.status(404).json({ success: false, message: 'Doctor record not found.' });

        const doctor_id = doctorRows[0].doctor_id;

        const [result] = await db.query(
            `INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes)
       VALUES (?, ?, ?, ?, ?)`,
            [patient_id, doctor_id, diagnosis, prescription || null, notes || null]
        );

        const record_id = result.insertId;

        // Save structured medications if provided
        if (medications && Array.isArray(medications)) {
            for (const med of medications) {
                if (med.name && med.frequency && med.duration) {
                    await db.query(
                        `INSERT INTO medication_schedules (patient_id, doctor_id, record_id, medicine_name, frequency_hours, duration_days)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [patient_id, doctor_id, record_id, med.name, med.frequency, med.duration]
                    );
                }
            }
        }

        // --- AUTOMATION: Auto-complete appointment ---
        await db.query(`
            UPDATE appointments 
            SET status = 'completed' 
            WHERE patient_id = ? AND doctor_id = ? AND status = 'confirmed' AND DATE(appointment_date) = CURDATE()
        `, [patient_id, doctor_id]);

        // --- AUTOMATION: Real-time patient update ---
        const io = req.app.get('io');
        if (io) {
            const [pUser] = await db.query('SELECT user_id, name FROM patients JOIN users ON patients.user_id = users.id WHERE patient_id = ?', [patient_id]);
            const [dUser] = await db.query('SELECT name FROM doctors JOIN users ON doctors.user_id = users.id WHERE doctor_id = ?', [doctor_id]);
            if (pUser.length > 0 && dUser.length > 0) {
                io.to(`user_${pUser[0].user_id}`).emit('record_added', {
                    doctor_name: dUser[0].name,
                    message: `Dr. ${dUser[0].name} has added a new medical prescription to your profile.`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // --- AUTOMATION: Auto Generate Bill ---
        // For demonstration, standard consultation fee is 150, meds roughly 50.
        const consultation_fee = 150.00;
        const medicines_cost = (medications && medications.length > 0) ? medications.length * 20.00 : 50.00;
        const billResult = await autoGenerateBill(patient_id, record_id, consultation_fee, medicines_cost);

        res.status(201).json({
            success: true,
            message: 'Medical record added successfully.',
            record_id: record_id,
            billing: billResult
        });

        // Async email sending
        (async () => {
            try {
                // Fetch patient info
                const [patientRows] = await db.query(
                    `SELECT u.name, u.email FROM users u 
                     JOIN patients p ON u.id = p.user_id 
                     WHERE p.patient_id = ?`,
                    [patient_id]
                );

                // Fetch doctor info
                const [doctorRowsInfo] = await db.query(
                    'SELECT name FROM users WHERE id = ?',
                    [req.user.id]
                );

                if (patientRows.length > 0 && doctorRowsInfo.length > 0) {
                    const patient = patientRows[0];
                    const doctor = doctorRowsInfo[0];

                    await sendPrescriptionEmail({
                        patientName: patient.name,
                        patientEmail: patient.email,
                        doctorName: doctor.name,
                        diagnosis,
                        prescription,
                        notes,
                        date: new Date(),
                        medications: medications || []
                    });
                }
            } catch (emailErr) {
                console.error('Failed to send prescription email:', emailErr);
            }
        })();
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/records/:patientId
const getRecords = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT mr.id, mr.diagnosis, mr.prescription, mr.notes, mr.date,
              u.name AS doctor_name, d.specialization
       FROM medical_records mr
       JOIN doctors d ON mr.doctor_id = d.doctor_id
       JOIN users u ON d.user_id = u.id
       WHERE mr.patient_id = ?
       ORDER BY mr.date DESC`,
            [req.params.patientId]
        );
        res.json({ success: true, records: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/records/my/all  – patients see own records; doctors see records they wrote
const getMyRecords = async (req, res) => {
    try {
        if (req.user.role === 'doctor') {
            // Doctor: return all records this doctor has written (for prescriptions page)
            const [doctorRows] = await db.query('SELECT doctor_id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (doctorRows.length === 0)
                return res.status(404).json({ success: false, message: 'Doctor record not found.' });

            const doctor_id = doctorRows[0].doctor_id;
            const [rows] = await db.query(
                `SELECT mr.id, mr.diagnosis, mr.prescription, mr.notes, mr.date,
                  u.name AS doctor_name, d.specialization,
                  up.name AS patient_name
         FROM medical_records mr
         JOIN doctors d ON mr.doctor_id = d.doctor_id
         JOIN users u ON d.user_id = u.id
         JOIN patients p ON mr.patient_id = p.patient_id
         JOIN users up ON p.user_id = up.id
         WHERE mr.doctor_id = ?
         ORDER BY mr.date DESC`,
                [doctor_id]
            );
            return res.json({ success: true, records: rows });
        }

        // Patient: return own medical records
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const patient_id = patientRows[0].patient_id;
        const [rows] = await db.query(
            `SELECT mr.id, mr.diagnosis, mr.prescription, mr.notes, mr.date,
              u.name AS doctor_name, d.specialization
     FROM medical_records mr
     JOIN doctors d ON mr.doctor_id = d.doctor_id
     JOIN users u ON d.user_id = u.id
     WHERE mr.patient_id = ?
     ORDER BY mr.date DESC`,
            [patient_id]
        );
        res.json({ success: true, records: rows, patient_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE /api/records/:id  (doctor or patient)
const deleteRecord = async (req, res) => {
    try {
        if (req.user.role === 'doctor') {
            const [doctorRows] = await db.query('SELECT doctor_id FROM doctors WHERE user_id = ?', [req.user.id]);
            const [rows] = await db.query(
                'SELECT id FROM medical_records WHERE id = ? AND doctor_id = ?',
                [req.params.id, doctorRows[0]?.doctor_id]
            );
            if (rows.length === 0)
                return res.status(403).json({ success: false, message: 'Record not found or unauthorized.' });

            await db.query('DELETE FROM medical_records WHERE id = ?', [req.params.id]);
            return res.json({ success: true, message: 'Record deleted.' });
        } else if (req.user.role === 'patient') {
            const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
            const [rows] = await db.query(
                'SELECT id FROM medical_records WHERE id = ? AND patient_id = ?',
                [req.params.id, patientRows[0]?.patient_id]
            );
            if (rows.length === 0)
                return res.status(403).json({ success: false, message: 'Record not found or unauthorized.' });

            await db.query('DELETE FROM medical_records WHERE id = ?', [req.params.id]);
            return res.json({ success: true, message: 'Record deleted.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { addRecord, getRecords, getMyRecords, deleteRecord };
