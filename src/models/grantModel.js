const { query } = require('../config/db');

const GrantModel = {
  /**
   * Create a new grant
   */
  async create({ title, description, amount, grantorId }) {
    const res = await query(
      `INSERT INTO grants (title, description, amount, grantor_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, amount, grantor_id, created_at, updated_at;`,
      [title, description, amount, grantorId]
    );
    return res.rows[0];
  },

  /**
   * Find all grants with grantor information
   */
  async findAll() {
    const res = await query(
      `SELECT g.id, g.title, g.description, g.amount::FLOAT as amount, g.grantor_id, g.created_at, g.updated_at,
              u.name as grantor_name, u.email as grantor_email
       FROM grants g
       JOIN users u ON g.grantor_id = u.id
       ORDER BY g.created_at DESC;`
    );
    return res.rows;
  },

  /**
   * Find grant by ID
   */
  async findById(id) {
    const res = await query(
      `SELECT g.id, g.title, g.description, g.amount::FLOAT as amount, g.grantor_id, g.created_at, g.updated_at,
              u.name as grantor_name, u.email as grantor_email
       FROM grants g
       JOIN users u ON g.grantor_id = u.id
       WHERE g.id = $1;`,
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Update grant details
   */
  async update(id, { title, description, amount }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (amount !== undefined) {
      fields.push(`amount = $${idx++}`);
      values.push(amount);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const res = await query(
      `UPDATE grants
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, title, description, amount::FLOAT as amount, grantor_id, created_at, updated_at;`,
      values
    );

    return res.rows[0] || null;
  },

  /**
   * Delete grant by ID
   */
  async delete(id) {
    const res = await query(`DELETE FROM grants WHERE id = $1 RETURNING id;`, [id]);
    return res.rowCount > 0;
  }
};

module.exports = GrantModel;
