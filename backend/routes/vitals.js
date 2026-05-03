const express = require('express');
const router = express.Router();
const { addVitals, getVitals, getMyVitals, getLatestVital, deleteVital } = require('../controllers/vitalsController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ⚠️ Specific literal routes MUST come before wildcard /:patientId
// otherwise Express matches /my/all as patientId="my"
router.post('/add', verifyToken, requireRole('patient'), addVitals);
router.get('/my/all', verifyToken, requireRole('patient'), getMyVitals);
router.get('/my/latest', verifyToken, requireRole('patient'), getLatestVital);
router.delete('/delete/:id', verifyToken, requireRole('doctor', 'patient'), deleteVital);

// Wildcard last
router.get('/:patientId', verifyToken, requireRole('patient', 'doctor'), getVitals);

module.exports = router;
