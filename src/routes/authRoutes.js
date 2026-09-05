const express = require('express');
const AuthController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validator');

const router = express.Router();

// Local Authentication
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// OAuth 2.0 Authentication (Google)
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);

module.exports = router;
