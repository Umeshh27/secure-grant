const ApplicationModel = require('../models/applicationModel');
const GrantModel = require('../models/grantModel');

const ApplicationService = {
  /**
   * Submit an application to a grant
   */
  async applyToGrant(grantId, granteeId, proposal) {
    const grant = await GrantModel.findById(grantId);
    if (!grant) {
      const error = new Error(`Grant opportunity with ID ${grantId} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    const application = await ApplicationModel.create({
      grantId: Number(grantId),
      granteeId: Number(granteeId),
      proposal,
      status: 'submitted',
    });

    return application;
  },

  /**
   * Get all applications for a grant (restricted to the owner Grantor)
   */
  async getApplicationsForGrant(grantId, requestingUser) {
    const grant = await GrantModel.findById(grantId);
    if (!grant) {
      const error = new Error(`Grant opportunity with ID ${grantId} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    const isAdmin = requestingUser.roles && requestingUser.roles.includes('ADMIN');
    const isOwner = grant.grantor_id === requestingUser.userId;

    if (!isOwner && !isAdmin) {
      const error = new Error('Access forbidden: You are not the grantor for this grant opportunity');
      error.statusCode = 403;
      error.name = 'Forbidden';
      throw error;
    }

    const applications = await ApplicationModel.findByGrantId(grantId);
    return applications;
  },

  /**
   * Get single application by ID (restricted to the applicant Grantee or parent Grantor or ADMIN)
   */
  async getApplicationById(applicationId, requestingUser) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      const error = new Error(`Application with ID ${applicationId} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    const isApplicant = application.grantee_id === requestingUser.userId;
    const isGrantorOwner = application.grantor_id === requestingUser.userId;
    const isAdmin = requestingUser.roles && requestingUser.roles.includes('ADMIN');

    if (!isApplicant && !isGrantorOwner && !isAdmin) {
      const error = new Error('Access forbidden: You do not have permission to view this application');
      error.statusCode = 403;
      error.name = 'Forbidden';
      throw error;
    }

    return application;
  },

  /**
   * Get all applications submitted by the logged in Grantee
   */
  async getMyApplications(granteeId) {
    return await ApplicationModel.findByGranteeId(granteeId);
  },

  /**
   * Update application status (Grantor owner or Admin)
   */
  async updateStatus(applicationId, status, requestingUser) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      const error = new Error(`Application with ID ${applicationId} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    const isGrantorOwner = application.grantor_id === requestingUser.userId;
    const isAdmin = requestingUser.roles && requestingUser.roles.includes('ADMIN');

    if (!isGrantorOwner && !isAdmin) {
      const error = new Error('Access forbidden: You do not have permission to update this application status');
      error.statusCode = 403;
      error.name = 'Forbidden';
      throw error;
    }

    const updated = await ApplicationModel.updateStatus(applicationId, status);
    return updated;
  }
};

module.exports = ApplicationService;
