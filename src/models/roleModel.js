const { query } = require('../config/db');

const RoleModel = {
  async findByName(name) {
    const res = await query(`SELECT * FROM roles WHERE UPPER(name) = UPPER($1)`, [name]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query(`SELECT * FROM roles WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },

  async findAll() {
    const res = await query(`SELECT * FROM roles ORDER BY id ASC`);
    return res.rows;
  }
};

module.exports = RoleModel;
