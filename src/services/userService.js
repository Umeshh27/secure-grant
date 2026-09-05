const UserModel = require('../models/userModel');
const RoleModel = require('../models/roleModel');
const { cache } = require('../config/redis');

const UserService = {
  /**
   * Assign a role to a user (Admin only)
   */
  async assignRoleToUser(userId, roleName) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }

    const role = await RoleModel.findByName(roleName);
    if (!role) {
      const error = new Error(`Role "${roleName}" is not recognized`);
      error.statusCode = 400;
      error.name = 'BadRequest';
      throw error;
    }

    await UserModel.assignRole(user.id, role.id);
    await cache.del(`user:${userId}`);

    const updatedUser = await UserModel.findById(userId);
    return {
      message: `Role "${role.name}" successfully assigned to user ${user.email}`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        roles: updatedUser.roles,
      }
    };
  },

  /**
   * Get all users (Admin only)
   */
  async getAllUsers() {
    return await UserModel.findAll();
  },

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.statusCode = 404;
      error.name = 'NotFound';
      throw error;
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      createdAt: user.created_at,
    };
  }
};

module.exports = UserService;
