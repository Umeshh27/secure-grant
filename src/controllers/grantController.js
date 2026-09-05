const GrantService = require('../services/grantService');

const GrantController = {
  /**
   * Create a new grant opportunity (Grantor only)
   * POST /api/grants
   */
  async create(req, res, next) {
    try {
      const { title, description, amount } = req.body;
      const grant = await GrantService.createGrant({
        title,
        description,
        amount,
        grantorId: req.user.userId,
      });
      return res.status(201).json(grant);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all grant opportunities (Authenticated users)
   * GET /api/grants
   */
  async getAll(req, res, next) {
    try {
      const grants = await GrantService.getAllGrants();
      return res.status(200).json(grants);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single grant by ID
   * GET /api/grants/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const grant = await GrantService.getGrantById(Number(id));
      return res.status(200).json(grant);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update grant (Grantor creator only)
   * PUT /api/grants/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, amount } = req.body;
      const updated = await GrantService.updateGrant(
        Number(id),
        { title, description, amount },
        req.user
      );
      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete grant (Grantor creator or Admin)
   * DELETE /api/grants/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await GrantService.deleteGrant(Number(id), req.user);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = GrantController;
