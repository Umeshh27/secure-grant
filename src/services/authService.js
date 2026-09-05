const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const RoleModel = require('../models/roleModel');
const env = require('../config/env');

const AuthService = {
  /**
   * Generate signed JWT token with required payload schema:
   * { "userId": "...", "roles": ["..."], "iat": ..., "exp": ... }
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      roles: Array.isArray(user.roles) ? user.roles : [user.roles].filter(Boolean),
    };

    return jwt.sign(payload, env.JWT.SECRET, {
      expiresIn: env.JWT.EXPIRES_IN,
    });
  },

  /**
   * Register a new user with standard email and password
   */
  async register({ name, email, password }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const error = new Error('A user with this email address already exists');
      error.statusCode = 409;
      error.name = 'Conflict';
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({
      name,
      email,
      passwordHash,
    });

    // Assign default role 'GRANTEE'
    const granteeRole = await RoleModel.findByName('GRANTEE');
    if (granteeRole) {
      await UserModel.assignRole(newUser.id, granteeRole.id);
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };
  },

  /**
   * Authenticate user with email and password, returning JWT
   */
  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user || !user.password_hash) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.name = 'Unauthorized';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.name = 'Unauthorized';
      throw error;
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
    };
  }
};

module.exports = AuthService;
