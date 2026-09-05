const { query } = require('../config/db');

const UserModel = {
  /**
   * Create a new user in the database
   */
  async create({ name, email, passwordHash = null, oauthProvider = null, oauthId = null }) {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, oauth_provider, oauth_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, oauth_provider, oauth_id, created_at, updated_at;`,
      [name, email.toLowerCase(), passwordHash, oauthProvider, oauthId]
    );
    return res.rows[0];
  },

  /**
   * Find user by email including roles
   */
  async findByEmail(email) {
    const res = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.oauth_provider, u.oauth_id, u.created_at, u.updated_at,
              COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = LOWER($1)
       GROUP BY u.id;`,
      [email]
    );
    return res.rows[0] || null;
  },

  /**
   * Find user by ID including roles
   */
  async findById(id) {
    const res = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.oauth_provider, u.oauth_id, u.created_at, u.updated_at,
              COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id;`,
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Find user by OAuth provider and provider user ID
   */
  async findByOAuth(provider, oauthId) {
    const res = await query(
      `SELECT u.id, u.name, u.email, u.oauth_provider, u.oauth_id, u.created_at, u.updated_at,
              COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.oauth_provider = $1 AND u.oauth_id = $2
       GROUP BY u.id;`,
      [provider, oauthId]
    );
    return res.rows[0] || null;
  },

  /**
   * Assign a role to a user
   */
  async assignRole(userId, roleId) {
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [userId, roleId]
    );
  },

  /**
   * Remove a role from a user
   */
  async removeRole(userId, roleId) {
    await query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2;`,
      [userId, roleId]
    );
  },

  /**
   * Get all users with their roles
   */
  async findAll() {
    const res = await query(
      `SELECT u.id, u.name, u.email, u.oauth_provider, u.created_at, u.updated_at,
              COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       GROUP BY u.id
       ORDER BY u.id ASC;`
    );
    return res.rows;
  },

  /**
   * Get roles array for a given user ID
   */
  async getRolesForUser(userId) {
    const res = await query(
      `SELECT r.name
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1;`,
      [userId]
    );
    return res.rows.map((row) => row.name);
  }
};

module.exports = UserModel;
