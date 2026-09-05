const express = require('express');
const GrantController = require('../controllers/grantController');
const ApplicationController = require('../controllers/applicationController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateGrant, validateGrantUpdate, validateApply } = require('../middleware/validator');

const router = express.Router();

// Create Grant (Only GRANTOR)
router.post(
  '/',
  authenticate,
  requireRole('GRANTOR'),
  validateGrant,
  GrantController.create
);

// Get All Grants (GRANTEE, GRANTOR, ADMIN)
router.get(
  '/',
  authenticate,
  requireRole('GRANTEE', 'GRANTOR', 'ADMIN'),
  GrantController.getAll
);

// Get Grant by ID (GRANTEE, GRANTOR, ADMIN)
router.get(
  '/:id',
  authenticate,
  requireRole('GRANTEE', 'GRANTOR', 'ADMIN'),
  GrantController.getById
);

// Update Grant (Only GRANTOR who owns the grant)
router.put(
  '/:id',
  authenticate,
  requireRole('GRANTOR'),
  validateGrantUpdate,
  GrantController.update
);

// Delete Grant (GRANTOR who owns the grant or ADMIN)
router.delete(
  '/:id',
  authenticate,
  requireRole('GRANTOR', 'ADMIN'),
  GrantController.delete
);

// Apply to Grant (Only GRANTEE)
router.post(
  '/:grantId/apply',
  authenticate,
  requireRole('GRANTEE'),
  validateApply,
  ApplicationController.apply
);

// Get Applications for Grant (Only GRANTOR who owns the grant or ADMIN)
router.get(
  '/:grantId/applications',
  authenticate,
  requireRole('GRANTOR', 'ADMIN'),
  ApplicationController.listByGrant
);

module.exports = router;
