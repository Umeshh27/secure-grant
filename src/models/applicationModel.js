const { query } = require('../config/db');

const ApplicationModel = {
  /**
   * Submit a new grant application
   */
  async create({ grantId, granteeId, proposal, status = 'submitted' }) {
    const res = await query(
      `INSERT INTO applications (grant_id, grantee_id, proposal, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, grant_id, grantee_id, proposal, status, created_at, updated_at;`,
      [grantId, granteeId, proposal, status]
    );
    return res.rows[0];
  },

  /**
   * Find all applications submitted for a specific grant
   */
  async findByGrantId(grantId) {
    const res = await query(
      `SELECT a.id, a.grant_id, a.grantee_id, a.proposal, a.status, a.created_at, a.updated_at,
              u.name as grantee_name, u.email as grantee_email,
              g.title as grant_title, g.grantor_id
       FROM applications a
       JOIN users u ON a.grantee_id = u.id
       JOIN grants g ON a.grant_id = g.id
       WHERE a.grant_id = $1
       ORDER BY a.created_at DESC;`,
      [grantId]
    );
    return res.rows;
  },

  /**
   * Find single application by ID with related grant and user information
   */
  async findById(id) {
    const res = await query(
      `SELECT a.id, a.grant_id, a.grantee_id, a.proposal, a.status, a.created_at, a.updated_at,
              u.name as grantee_name, u.email as grantee_email,
              g.title as grant_title, g.grantor_id, g.amount::FLOAT as grant_amount,
              gu.name as grantor_name, gu.email as grantor_email
       FROM applications a
       JOIN users u ON a.grantee_id = u.id
       JOIN grants g ON a.grant_id = g.id
       JOIN users gu ON g.grantor_id = gu.id
       WHERE a.id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Find all applications submitted by a specific grantee
   */
  async findByGranteeId(granteeId) {
    const res = await query(
      `SELECT a.id, a.grant_id, a.grantee_id, a.proposal, a.status, a.created_at, a.updated_at,
              g.title as grant_title, g.amount::FLOAT as grant_amount,
              gu.name as grantor_name
       FROM applications a
       JOIN grants g ON a.grant_id = g.id
       JOIN users gu ON g.grantor_id = gu.id
       WHERE a.grantee_id = $1
       ORDER BY a.created_at DESC;`,
      [granteeId]
    );
    return res.rows;
  },

  /**
   * Update application status (e.g. 'under_review', 'approved', 'rejected')
   */
  async updateStatus(id, status) {
    const res = await query(
      `UPDATE applications
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, grant_id, grantee_id, proposal, status, created_at, updated_at;`,
      [status, id]
    );
    return res.rows[0] || null;
  }
};

module.exports = ApplicationModel;
