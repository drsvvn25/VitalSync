const express = require('express');
const router = express.Router();
const { addRecord, getRecords, getMyRecords, deleteRecord } = require('../controllers/recordsController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ⚠️ Specific literal routes MUST come before wildcard /:patientId
router.post('/add', verifyToken, requireRole('doctor'), addRecord);

// Both patients AND doctors can view records via /my/all
// (doctors use it for the Prescriptions page to see records they wrote)
router.get('/my/all', verifyToken, requireRole('patient', 'doctor'), getMyRecords);

// Wildcard last — accessible by both roles
router.get('/:patientId', verifyToken, requireRole('doctor', 'patient'), getRecords);
router.delete('/:id', verifyToken, requireRole('doctor', 'patient'), deleteRecord);

module.exports = router;
