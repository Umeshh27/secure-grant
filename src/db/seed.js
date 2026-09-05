const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const env = require('../config/env');

const seedDatabase = async () => {
  console.log('[Seeding] Starting database seeding...');

  // 1. Seed Roles
  const roles = [
    { name: 'ADMIN', description: 'Full system administrator' },
    { name: 'GRANTOR', description: 'Grant-making organization or funder' },
    { name: 'GRANTEE', description: 'Grant applicant and proposal submitter' },
  ];

  for (const role of roles) {
    await query(
      `INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING;`,
      [role.name, role.description]
    );
  }

  // Helper to get role ID
  const getRoleId = async (roleName) => {
    const res = await query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
    return res.rows[0]?.id;
  };

  const adminRoleId = await getRoleId('ADMIN');
  const grantorRoleId = await getRoleId('GRANTOR');
  const granteeRoleId = await getRoleId('GRANTEE');

  // 2. Seed Default Admin User
  const adminPasswordHash = await bcrypt.hash(env.ADMIN.PASSWORD, 10);
  const adminResult = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id;`,
    [env.ADMIN.NAME, env.ADMIN.EMAIL, adminPasswordHash]
  );
  const adminUserId = adminResult.rows[0]?.id;

  if (adminUserId && adminRoleId) {
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [adminUserId, adminRoleId]
    );
  }

  // 3. Seed Sample Grantor
  const grantorPasswordHash = await bcrypt.hash('GrantorPassword123!', 10);
  const grantorResult = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id;`,
    ['Global Innovation Foundation', 'grantor@securegrant.org', grantorPasswordHash]
  );
  const grantorUserId = grantorResult.rows[0]?.id || (await query(`SELECT id FROM users WHERE email = $1`, ['grantor@securegrant.org'])).rows[0]?.id;

  if (grantorUserId && grantorRoleId) {
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [grantorUserId, grantorRoleId]
    );
  }

  // 4. Seed Sample Grantee
  const granteePasswordHash = await bcrypt.hash('GranteePassword123!', 10);
  const granteeResult = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id;`,
    ['Open Research Initiative', 'grantee@securegrant.org', granteePasswordHash]
  );
  const granteeUserId = granteeResult.rows[0]?.id || (await query(`SELECT id FROM users WHERE email = $1`, ['grantee@securegrant.org'])).rows[0]?.id;

  if (granteeUserId && granteeRoleId) {
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [granteeUserId, granteeRoleId]
    );
  }

  // 5. Seed Sample Grants
  if (grantorUserId) {
    const existingGrant = await query(`SELECT id FROM grants WHERE title = $1`, ['AI for Social Good Research Grant']);
    let grantId = existingGrant.rows[0]?.id;

    if (!grantId) {
      const grantResult = await query(
        `INSERT INTO grants (title, description, amount, grantor_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id;`,
        [
          'AI for Social Good Research Grant',
          'Funding for applied AI projects aiming to solve public health, education, and environmental challenges.',
          50000.00,
          grantorUserId
        ]
      );
      grantId = grantResult.rows[0]?.id;
    }

    // Seed a sample application
    if (grantId && granteeUserId) {
      const existingApp = await query(
        `SELECT id FROM applications WHERE grant_id = $1 AND grantee_id = $2`,
        [grantId, granteeUserId]
      );
      if (existingApp.rows.length === 0) {
        await query(
          `INSERT INTO applications (grant_id, grantee_id, proposal, status)
           VALUES ($1, $2, $3, $4);`,
          [
            grantId,
            granteeUserId,
            'Developing an open-source decentralized early warning system for regional flood detection using satellite imagery and IoT sensor streams.',
            'submitted'
          ]
        );
      }
    }
  }

  console.log('[Seeding] Database seeded successfully.');
};

// If run directly via CLI
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seeding] Failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
