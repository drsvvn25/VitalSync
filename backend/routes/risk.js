const express = require('express');
const router = express.Router();
const { getMyRisk, getPatientRisk } = require('../controllers/riskController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my', verifyToken, requireRole('patient'), getMyRisk);
router.get('/:patientId', verifyToken, requireRole('doctor', 'patient'), getPatientRisk);

module.exports = router;
