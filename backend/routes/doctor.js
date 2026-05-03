const express = require('express');
const router = express.Router();
const { getDoctorProfile, getDoctorPatients, getAllDoctors, updateDoctorProfile, getDoctorStats } = require('../controllers/doctorController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/profile', verifyToken, requireRole('doctor'), getDoctorProfile);
router.put('/update', verifyToken, requireRole('doctor'), updateDoctorProfile);
router.get('/patients', verifyToken, requireRole('doctor'), getDoctorPatients);
router.get('/stats', verifyToken, requireRole('doctor'), getDoctorStats);
router.get('/all', verifyToken, requireRole('doctor', 'patient'), getAllDoctors);

module.exports = router;
