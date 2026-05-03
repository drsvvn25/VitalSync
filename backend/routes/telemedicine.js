const express = require('express');
const router = express.Router();
const { startSession, getSession, endSession } = require('../controllers/telemedicineController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/start', verifyToken, requireRole('doctor'), startSession);
router.get('/session/:appointment_id', verifyToken, getSession);
router.post('/end', verifyToken, requireRole('doctor'), endSession);

module.exports = router;
