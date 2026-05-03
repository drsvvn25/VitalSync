const express = require('express');
const router = express.Router();
const { getAllClinics, seedClinics, seedClinicsV2 } = require('../controllers/clinicsController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getAllClinics);
router.post('/seed', seedClinics);
router.post('/seed2', seedClinicsV2);

module.exports = router;

