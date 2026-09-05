const GrantModel = require('../models/grantModel');
const { cache } = require('../config/redis');

const GrantService = {
  /**
   * Create a new grant opportunity
   */
  async createGrant({ title, description, amount, grantorId }) {
    const grant = await GrantModel.create({
      title,
      description,
      amount: Number(amount),
      grantorId,
    });

    // Invalidate grant cache
    await cache.delPattern('grants:*');

    return grant;
  },

  /**
   * Get all grants (with Redis caching)
   */
  async getAllGrants() {
    const cacheKey = 'grants:all';
    const cachedGrants = await cache.get(cacheKey);
    if (cachedGrants) {
      return cachedGrants;
    }

    const grants = await GrantModel.findAll();
    await cache.set(cacheKey, grants, 120); // 2 minute cache
    return grants;
  },

  /**
   * Get grant by ID
   */
  async getGrantById(id) {
    const cacheKey = `grants:${id}`;
    const cachedGrant = await cache.get(cacheKey);
    if (cachedGrant) {
      return cachedGrant;
    }

    const grant = await GrantModel.findById(id);
    if (!grant) {
      const error = new Error(`Grant opportunity with ID ${id} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    await cache.set(cacheKey, grant, 120);
    return grant;
  },

  /**
   * Update grant (Only the creator/grantor can update)
   */
  async updateGrant(id, { title, description, amount }, requestingUser) {
    const grant = await GrantModel.findById(id);
    if (!grant) {
      const error = new Error(`Grant opportunity with ID ${id} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    // Ownership check: must be the grantor who created it
    if (grant.grantor_id !== requestingUser.userId) {
      const error = new Error('Access forbidden: You do not have permission to modify this grant');
      error.statusCode = 403;
      error.name = 'Forbidden';
      throw error;
    }

    const updated = await GrantModel.update(id, {
      title,
      description,
      amount: amount !== undefined ? Number(amount) : undefined,
    });

    await cache.delPattern('grants:*');
    return updated;
  },

  /**
   * Delete grant (Only creator/grantor or ADMIN can delete)
   */
  async deleteGrant(id, requestingUser) {
    const grant = await GrantModel.findById(id);
    if (!grant) {
      const error = new Error(`Grant opportunity with ID ${id} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    const isAdmin = requestingUser.roles && requestingUser.roles.includes('ADMIN');
    const isOwner = grant.grantor_id === requestingUser.userId;

    if (!isOwner && !isAdmin) {
      const error = new Error('Access forbidden: You do not have permission to delete this grant');
      error.statusCode = 403;
      error.name = 'Forbidden';
      throw error;
    }

    await GrantModel.delete(id);
    await cache.delPattern('grants:*');
    return { message: 'Grant successfully deleted', id: Number(id) };
  }
};

module.exports = GrantService;
