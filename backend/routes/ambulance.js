const express = require('express');
const router = express.Router();
const { requestAmbulance, getPatientAmbulanceRequests, getAllRequests } = require('../controllers/ambulanceController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/request', verifyToken, requireRole('patient', 'doctor', 'admin'), requestAmbulance);
router.get('/my', verifyToken, requireRole('patient'), getPatientAmbulanceRequests);
router.get('/all', verifyToken, requireRole('doctor', 'admin'), getAllRequests);

module.exports = router;
