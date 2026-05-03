const express = require('express');
const router = express.Router();
const { getMyReminders, getActiveSchedules, markAsTaken } = require('../controllers/reminderController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my', verifyToken, requireRole('patient'), getMyReminders);
router.get('/active', verifyToken, requireRole('patient'), getActiveSchedules);
router.post('/take/:reminder_id', verifyToken, requireRole('patient'), markAsTaken);

module.exports = router;
