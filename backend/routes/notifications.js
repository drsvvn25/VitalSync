const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCritical, markRead, markAllRead, triggerSOS } = require('../controllers/notificationsController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my', verifyToken, requireRole('doctor', 'patient'), getNotifications);
router.get('/unread-critical', verifyToken, requireRole('doctor'), getUnreadCritical);
router.put('/read/:id', verifyToken, requireRole('doctor', 'patient'), markRead);
router.put('/read-all', verifyToken, requireRole('doctor', 'patient'), markAllRead);
router.post('/sos', verifyToken, requireRole('patient'), triggerSOS);

module.exports = router;
