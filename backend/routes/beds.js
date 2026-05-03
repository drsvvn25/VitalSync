const express = require('express');
const router = express.Router();
const { addBed, getClinicBedAllocations, dischargePatient } = require('../controllers/bedsController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/add', verifyToken, requireRole('admin', 'doctor'), addBed);
router.get('/allocations', verifyToken, requireRole('doctor'), getClinicBedAllocations);
router.post('/discharge/:allocation_id', verifyToken, requireRole('doctor'), dischargePatient);

module.exports = router;
