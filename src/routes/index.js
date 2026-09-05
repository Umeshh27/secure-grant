const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const grantRoutes = require('./grantRoutes');
const applicationRoutes = require('./applicationRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/grants', grantRoutes);
router.use('/applications', applicationRoutes);
router.use('/health', healthRoutes);

module.exports = router;
