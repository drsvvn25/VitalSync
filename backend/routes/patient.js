const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getAllPatients, getPatientById } = require('../controllers/patientController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/profile', verifyToken, requireRole('patient'), getProfile);
router.put('/update', verifyToken, requireRole('patient'), updateProfile);
router.get('/all', verifyToken, requireRole('doctor'), getAllPatients);
router.get('/:id', verifyToken, requireRole('doctor'), getPatientById);

module.exports = router;
