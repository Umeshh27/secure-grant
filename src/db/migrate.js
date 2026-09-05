const { query } = require('../config/db');

const migrateSchema = async () => {
  console.log('[Migration] Starting database migration...');

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      oauth_provider VARCHAR(50),
      oauth_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Roles table
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // UserRoles pivot table
  await query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
    );
  `);

  // Grants table
  await query(`
    CREATE TABLE IF NOT EXISTS grants (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
      grantor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Applications table
  await query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      grant_id INTEGER NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
      grantee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposal TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indices
  await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_grants_grantor ON grants(grantor_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_applications_grant ON applications(grant_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_applications_grantee ON applications(grantee_id);`);

  console.log('[Migration] Database schema migrated successfully.');
};

// If run directly via CLI
if (require.main === module) {
  migrateSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateSchema };
