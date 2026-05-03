const express = require('express');
const router = express.Router();
const { getMyTrends, getPatientTrends } = require('../controllers/trendController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my', verifyToken, requireRole('patient'), getMyTrends);
router.get('/:patientId', verifyToken, requireRole('doctor', 'patient'), getPatientTrends);

module.exports = router;
