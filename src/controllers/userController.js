const UserService = require('../services/userService');

const UserController = {
  /**
   * Assign role to user (Admin only)
   * POST /api/users/:userId/roles
   */
  async assignRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;
      const result = await UserService.assignRoleToUser(Number(userId), roleName);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all users (Admin only)
   * GET /api/users
   */
  async getAllUsers(req, res, next) {
    try {
      const users = await UserService.getAllUsers();
      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current authenticated user profile
   * GET /api/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await UserService.getUserById(req.user.userId);
      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user by ID (Admin or Self)
   * GET /api/users/:userId
   */
  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;
      const targetId = Number(userId);

      const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');
      const isSelf = req.user.userId === targetId;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access forbidden: You can only view your own profile'
        });
      }

      const user = await UserService.getUserById(targetId);
      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = UserController;
