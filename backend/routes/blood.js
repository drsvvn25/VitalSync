const express = require('express');
const router = express.Router();
const { getInventory, updateInventory, requestBlood, getRequests } = require('../controllers/bloodController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/inventory', verifyToken, requireRole('doctor', 'admin'), getInventory);
router.post('/inventory', verifyToken, requireRole('admin', 'doctor'), updateInventory);
router.post('/request', verifyToken, requireRole('doctor'), requestBlood);
router.get('/requests', verifyToken, requireRole('doctor', 'admin'), getRequests);

module.exports = router;
