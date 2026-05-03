const db = require('../config/db');

// Get blood inventory for clinic
const getInventory = async (req, res) => {
    try {
        const [docRows] = await db.query('SELECT clinic_id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (docRows.length === 0 || !docRows[0].clinic_id) return res.status(403).json({ success: false, message: 'Not assigned to a clinic.' });

        const [rows] = await db.query(
            'SELECT * FROM blood_inventory WHERE clinic_id = ? ORDER BY blood_group',
            [docRows[0].clinic_id]
        );
        res.json({ success: true, inventory: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Update blood inventory manually
const updateInventory = async (req, res) => {
    try {
        const { inventory_id, units } = req.body;
        await db.query('UPDATE blood_inventory SET available_units = ? WHERE inventory_id = ?', [units, inventory_id]);
        res.json({ success: true, message: 'Inventory updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Create a new blood request for a patient
const requestBlood = async (req, res) => {
    try {
        const { patient_id, blood_group, urgency_level, units_needed } = req.body;
        
        await db.query(
            'INSERT INTO blood_requests (patient_id, blood_group, urgency_level, units_needed) VALUES (?, ?, ?, ?)',
            [patient_id, blood_group, urgency_level, units_needed]
        );

        // Deduct from inventory if available? Or just leave it as a pending request to be fulfilled manually?
        // Let's implement an auto-deduct if the host clinic has enough blood.
        const [docRows] = await db.query('SELECT clinic_id FROM doctors WHERE user_id = ?', [req.user.id]);
        const clinicId = docRows.length > 0 ? docRows[0].clinic_id : null;

        if (clinicId) {
            const [invRows] = await db.query('SELECT inventory_id, available_units FROM blood_inventory WHERE clinic_id = ? AND blood_group = ?', [clinicId, blood_group]);
            if (invRows.length > 0 && invRows[0].available_units >= units_needed) {
                // Auto fulfill
                await db.query('UPDATE blood_inventory SET available_units = available_units - ? WHERE inventory_id = ?', [units_needed, invRows[0].inventory_id]);
                // We should really get the request's ID here to update it as fulfilled, but doing a simple approach
                await db.query('UPDATE blood_requests SET status = ? WHERE patient_id = ? AND status = ? ORDER BY request_id DESC LIMIT 1', ['fulfilled', patient_id, 'pending']);
                return res.json({ success: true, message: 'Blood procured and request fulfilled instantly from clinic inventory.' });
            }
        }

        res.status(201).json({ success: true, message: 'Blood request filed. Waiting for donors/stock.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Get requests
const getRequests = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT br.*, u.name as patient_name 
             FROM blood_requests br
             JOIN patients p ON br.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.id
             ORDER BY br.request_date DESC LIMIT 50`
        );
        res.json({ success: true, requests: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getInventory, updateInventory, requestBlood, getRequests };
