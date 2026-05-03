const express = require('express');
const router = express.Router();
const { bookAppointment, listAppointments, updateAppointment, getAppointmentStats, deleteAppointment } = require('../controllers/appointmentController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/book', verifyToken, requireRole('patient'), bookAppointment);
router.get('/list', verifyToken, requireRole('patient', 'doctor'), listAppointments);
router.put('/update/:id', verifyToken, requireRole('doctor'), updateAppointment);
router.get('/stats', verifyToken, requireRole('doctor'), getAppointmentStats);
router.delete('/delete/:id', verifyToken, requireRole('doctor'), deleteAppointment);

module.exports = router;
