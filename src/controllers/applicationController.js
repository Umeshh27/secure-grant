const ApplicationService = require('../services/applicationService');

const ApplicationController = {
  /**
   * Submit an application to a grant (Grantee only)
   * POST /api/grants/:grantId/apply
   */
  async apply(req, res, next) {
    try {
      const { grantId } = req.params;
      const { proposal } = req.body;
      const application = await ApplicationService.applyToGrant(
        Number(grantId),
        req.user.userId,
        proposal
      );
      return res.status(201).json(application);
    } catch (error) {
      next(error);
    }
  },

  /**
   * List all applications for a grant (Grantor creator only)
   * GET /api/grants/:grantId/applications
   */
  async listByGrant(req, res, next) {
    try {
      const { grantId } = req.params;
      const applications = await ApplicationService.getApplicationsForGrant(
        Number(grantId),
        req.user
      );
      return res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single application by ID (Grantee submitter or Grantor owner)
   * GET /api/applications/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const application = await ApplicationService.getApplicationById(
        Number(id),
        req.user
      );
      return res.status(200).json(application);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all applications submitted by current user (Grantee)
   * GET /api/applications/my
   */
  async getMyApplications(req, res, next) {
    try {
      const applications = await ApplicationService.getMyApplications(req.user.userId);
      return res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update application review status
   * PUT /api/applications/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['submitted', 'under_review', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Status must be one of: submitted, under_review, approved, rejected'
        });
      }

      const updated = await ApplicationService.updateStatus(
        Number(id),
        status,
        req.user
      );
      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = ApplicationController;
