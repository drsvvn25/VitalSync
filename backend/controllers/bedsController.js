const db = require('../config/db');

// Add a bed
const addBed = async (req, res) => {
    try {
        const { clinic_id, ward_type, bed_number } = req.body;
        const [result] = await db.query(
            'INSERT INTO beds (clinic_id, ward_type, bed_number) VALUES (?, ?, ?)',
            [clinic_id, ward_type, bed_number]
        );
        res.status(201).json({ success: true, message: 'Bed added securely.', bed_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error adding bed.' });
    }
};

// Automate bed reservation for emergencies
const autoReserveBed = async (patient_id, clinic_id) => {
    try {
        // Find an available bed (prefer Emergency ward, then ICU, then General)
        const [beds] = await db.query(
            `SELECT bed_id, bed_number, ward_type FROM beds 
             WHERE clinic_id = ? AND status = 'available' 
             ORDER BY FIELD(ward_type, 'Emergency', 'ICU', 'General') ASC 
             LIMIT 1`,
            [clinic_id]
        );

        if (beds.length === 0) return null; // No beds available

        const bed = beds[0];

        // Mark bed as occupied
        await db.query('UPDATE beds SET status = ? WHERE bed_id = ?', ['occupied', bed.bed_id]);

        // Create allocation
        await db.query(
            'INSERT INTO bed_allocations (patient_id, bed_id, admission_date) VALUES (?, ?, NOW())',
            [patient_id, bed.bed_id]
        );

        return bed;
    } catch (err) {
        console.error('Error auto-reserving bed:', err);
        return null;
    }
};

// Get allocations for doctor's clinic
const getClinicBedAllocations = async (req, res) => {
    try {
        // Find the clinic this doctor belongs to
        const [docRows] = await db.query('SELECT clinic_id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (docRows.length === 0 || !docRows[0].clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        const [rows] = await db.query(
            `SELECT ba.allocation_id, ba.admission_date, ba.discharge_date,
                    b.bed_number, b.ward_type, b.status,
                    u.name as patient_name, u.phone as patient_phone
             FROM beds b
             LEFT JOIN bed_allocations ba ON b.bed_id = ba.bed_id AND ba.discharge_date IS NULL
             LEFT JOIN patients p ON ba.patient_id = p.patient_id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE b.clinic_id = ?
             ORDER BY b.ward_type, b.bed_number`,
            [docRows[0].clinic_id]
        );
        res.json({ success: true, beds: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Discharge patient / Release Bed
const dischargePatient = async (req, res) => {
    try {
        const { allocation_id } = req.params;
        const [allocRows] = await db.query('SELECT bed_id FROM bed_allocations WHERE allocation_id = ? AND discharge_date IS NULL', [allocation_id]);
        if (allocRows.length === 0) return res.status(404).json({ success: false, message: 'Allocation not found or already discharged.' });

        const bedId = allocRows[0].bed_id;
        
        // Mark discharge
        await db.query('UPDATE bed_allocations SET discharge_date = NOW() WHERE allocation_id = ?', [allocation_id]);
        
        // Free up the bed
        await db.query('UPDATE beds SET status = ? WHERE bed_id = ?', ['available', bedId]);

        res.json({ success: true, message: 'Bed released successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { addBed, autoReserveBed, getClinicBedAllocations, dischargePatient };
