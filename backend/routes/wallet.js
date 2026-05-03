const express = require('express');
const router = express.Router();
const { getWallet, addFunds } = require('../controllers/walletController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my', verifyToken, requireRole('patient'), getWallet);
router.post('/add', verifyToken, requireRole('patient'), addFunds);

module.exports = router;
