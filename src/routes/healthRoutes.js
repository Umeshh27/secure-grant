const express = require('express');
const HealthController = require('../controllers/healthController');

const router = express.Router();

router.get('/', HealthController.check);

module.exports = router;
