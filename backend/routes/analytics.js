const express = require('express');
const router = express.Router();
const { getMyRisk, getDoctorPatientRisks } = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/risk/my', verifyToken, requireRole('patient'), getMyRisk);
router.get('/risk/doctor', verifyToken, requireRole('doctor'), getDoctorPatientRisks);

module.exports = router;
