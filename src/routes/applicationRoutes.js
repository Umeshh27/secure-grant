const express = require('express');
const ApplicationController = require('../controllers/applicationController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Get My Applications (Only GRANTEE)
router.get(
  '/my',
  authenticate,
  requireRole('GRANTEE'),
  ApplicationController.getMyApplications
);

// Get Application by ID (GRANTEE who submitted, parent GRANTOR, or ADMIN)
router.get(
  '/:id',
  authenticate,
  ApplicationController.getById
);

// Update Application Status (Parent GRANTOR or ADMIN)
router.put(
  '/:id/status',
  authenticate,
  requireRole('GRANTOR', 'ADMIN'),
  ApplicationController.updateStatus
);

module.exports = router;
