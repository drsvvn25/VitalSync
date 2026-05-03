const express = require('express');
const router = express.Router();
const {
    getSystemStats, getAllDoctors, addDoctor, deleteUser,
    getAllPatients, getAllAppointments, getAllTransactions, getAllMedicalRecords
} = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All admin routes require admin role
// router.use(verifyToken, requireRole('admin')); // This line is removed as middleware is applied per route

router.get('/stats', verifyToken, requireRole('admin'), getSystemStats);
router.get('/doctors', verifyToken, requireRole('admin'), getAllDoctors);
router.get('/patients', verifyToken, requireRole('admin'), getAllPatients);
router.get('/appointments', verifyToken, requireRole('admin'), getAllAppointments);
router.get('/transactions', verifyToken, requireRole('admin'), getAllTransactions);
router.get('/records', verifyToken, requireRole('admin'), getAllMedicalRecords);
router.post('/doctors/add', verifyToken, requireRole('admin'), addDoctor);
router.delete('/users/:id', verifyToken, requireRole('admin'), deleteUser);

module.exports = router;
