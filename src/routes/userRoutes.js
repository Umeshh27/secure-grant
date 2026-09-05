const express = require('express');
const UserController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateRoleAssignment } = require('../middleware/validator');

const router = express.Router();

// Get own profile (Any authenticated user)
router.get('/profile', authenticate, UserController.getProfile);

// Admin-only: List all users
router.get('/', authenticate, requireRole('ADMIN'), UserController.getAllUsers);

// Admin-only: Assign role to user (Contract Requirement 8)
// POST /api/users/:userId/roles -> { "roleName": "GRANTOR" }
router.post('/:userId/roles', authenticate, requireRole('ADMIN'), validateRoleAssignment, UserController.assignRole);

// Get single user by ID (Self or Admin)
router.get('/:userId', authenticate, UserController.getUserById);

module.exports = router;
