/**
 * In-Memory Mock Database for Fast & Isolated Unit/Integration Testing
 */
const bcrypt = require('bcryptjs');

class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [];
    this.roles = [
      { id: 1, name: 'ADMIN', description: 'Administrator' },
      { id: 2, name: 'GRANTOR', description: 'Grantor Organization' },
      { id: 3, name: 'GRANTEE', description: 'Grant Applicant' },
    ];
    this.userRoles = [];
    this.grants = [];
    this.applications = [];

    this.userIdSeq = 1;
    this.grantIdSeq = 1;
    this.appIdSeq = 1;
    this.userRoleIdSeq = 1;

    // Seed default admin
    const passwordHash = bcrypt.hashSync('AdminSecurePassword123!', 10);
    const adminUser = {
      id: this.userIdSeq++,
      name: 'Super Admin',
      email: 'admin@securegrant.org',
      password_hash: passwordHash,
      oauth_provider: null,
      oauth_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(adminUser);
    this.userRoles.push({
      id: this.userRoleIdSeq++,
      user_id: adminUser.id,
      role_id: 1, // ADMIN
    });

    // Seed default grantor
    const grantorHash = bcrypt.hashSync('GrantorPassword123!', 10);
    const grantorUser = {
      id: this.userIdSeq++,
      name: 'Global Foundation',
      email: 'grantor@securegrant.org',
      password_hash: grantorHash,
      oauth_provider: null,
      oauth_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(grantorUser);
    this.userRoles.push({
      id: this.userRoleIdSeq++,
      user_id: grantorUser.id,
      role_id: 2, // GRANTOR
    });

    // Seed default grantee
    const granteeHash = bcrypt.hashSync('GranteePassword123!', 10);
    const granteeUser = {
      id: this.userIdSeq++,
      name: 'Research Initiative',
      email: 'grantee@securegrant.org',
      password_hash: granteeHash,
      oauth_provider: null,
      oauth_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(granteeUser);
    this.userRoles.push({
      id: this.userRoleIdSeq++,
      user_id: granteeUser.id,
      role_id: 3, // GRANTEE
    });

    // Seed default grant
    const sampleGrant = {
      id: this.grantIdSeq++,
      title: 'AI for Social Good Grant',
      description: 'Funding innovative artificial intelligence applications.',
      amount: 50000.00,
      grantor_id: grantorUser.id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.grants.push(sampleGrant);

    // Seed sample application
    const sampleApp = {
      id: this.appIdSeq++,
      grant_id: sampleGrant.id,
      grantee_id: granteeUser.id,
      proposal: 'Developing open-source disaster response AI models.',
      status: 'submitted',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.applications.push(sampleApp);
  }

  async query(text, params = []) {
    const trimmed = text.trim();

    // 1. SELECT 1 AS healthy
    if (trimmed.includes('SELECT 1 AS healthy')) {
      return { rows: [{ healthy: 1 }], rowCount: 1 };
    }

    // 2. Roles queries
    if (trimmed.includes('SELECT * FROM roles WHERE UPPER(name) = UPPER($1)')) {
      const roleName = String(params[0]).toUpperCase();
      const role = this.roles.find((r) => r.name.toUpperCase() === roleName);
      return { rows: role ? [role] : [], rowCount: role ? 1 : 0 };
    }
    if (trimmed.includes('SELECT * FROM roles WHERE id = $1')) {
      const role = this.roles.find((r) => r.id === Number(params[0]));
      return { rows: role ? [role] : [], rowCount: role ? 1 : 0 };
    }
    if (trimmed.includes('SELECT * FROM roles ORDER BY id ASC')) {
      return { rows: [...this.roles], rowCount: this.roles.length };
    }
    if (trimmed.includes('INSERT INTO roles')) {
      return { rows: [], rowCount: 1 };
    }

    // 3. User queries
    if (trimmed.includes('INSERT INTO users')) {
      const [name, email, passwordHash, oauthProvider, oauthId] = params;
      const user = {
        id: this.userIdSeq++,
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        oauth_provider: oauthProvider || null,
        oauth_id: oauthId || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.users.push(user);
      return { rows: [{ ...user }], rowCount: 1 };
    }

    if (trimmed.includes('SELECT u.id, u.name, u.email, u.password_hash') && trimmed.includes('LOWER(u.email) = LOWER($1)')) {
      const email = String(params[0]).toLowerCase();
      const user = this.users.find((u) => u.email.toLowerCase() === email);
      if (!user) return { rows: [], rowCount: 0 };
      const roles = this.getUserRoles(user.id);
      return { rows: [{ ...user, roles }], rowCount: 1 };
    }

    if (trimmed.includes('SELECT u.id, u.name, u.email, u.password_hash') && trimmed.includes('WHERE u.id = $1')) {
      const user = this.users.find((u) => u.id === Number(params[0]));
      if (!user) return { rows: [], rowCount: 0 };
      const roles = this.getUserRoles(user.id);
      return { rows: [{ ...user, roles }], rowCount: 1 };
    }

    if (trimmed.includes('WHERE u.oauth_provider = $1 AND u.oauth_id = $2')) {
      const user = this.users.find((u) => u.oauth_provider === params[0] && u.oauth_id === params[1]);
      if (!user) return { rows: [], rowCount: 0 };
      const roles = this.getUserRoles(user.id);
      return { rows: [{ ...user, roles }], rowCount: 1 };
    }

    if (trimmed.includes('SELECT u.id, u.name, u.email, u.oauth_provider') && trimmed.includes('ORDER BY u.id ASC')) {
      const list = this.users.map((u) => ({
        ...u,
        roles: this.getUserRoles(u.id),
      }));
      return { rows: list, rowCount: list.length };
    }

    // 4. User Roles Join Queries
    if (trimmed.includes('INSERT INTO user_roles (user_id, role_id)')) {
      const [userId, roleId] = params;
      const exists = this.userRoles.some((ur) => ur.user_id === Number(userId) && ur.role_id === Number(roleId));
      if (!exists) {
        this.userRoles.push({
          id: this.userRoleIdSeq++,
          user_id: Number(userId),
          role_id: Number(roleId),
          created_at: new Date(),
        });
      }
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.includes('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2')) {
      const before = this.userRoles.length;
      this.userRoles = this.userRoles.filter(
        (ur) => !(ur.user_id === Number(params[0]) && ur.role_id === Number(params[1]))
      );
      return { rows: [], rowCount: before - this.userRoles.length };
    }

    if (trimmed.includes('SELECT r.name') && trimmed.includes('WHERE ur.user_id = $1')) {
      const roles = this.getUserRoles(Number(params[0]));
      return { rows: roles.map((name) => ({ name })), rowCount: roles.length };
    }

    // 5. Grants Queries
    if (trimmed.includes('INSERT INTO grants')) {
      const [title, description, amount, grantorId] = params;
      const grant = {
        id: this.grantIdSeq++,
        title,
        description,
        amount: Number(amount),
        grantor_id: Number(grantorId),
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.grants.push(grant);
      return { rows: [{ ...grant }], rowCount: 1 };
    }

    if (trimmed.includes('FROM grants g') && trimmed.includes('WHERE g.id = $1')) {
      const grant = this.grants.find((g) => g.id === Number(params[0]));
      if (!grant) return { rows: [], rowCount: 0 };
      const grantor = this.users.find((u) => u.id === grant.grantor_id);
      return {
        rows: [{
          ...grant,
          amount: Number(grant.amount),
          grantor_name: grantor?.name || 'Grantor',
          grantor_email: grantor?.email || 'grantor@example.com',
        }],
        rowCount: 1,
      };
    }

    if (trimmed.includes('FROM grants g') && trimmed.includes('ORDER BY g.created_at DESC')) {
      const list = this.grants.map((g) => {
        const grantor = this.users.find((u) => u.id === g.grantor_id);
        return {
          ...g,
          amount: Number(g.amount),
          grantor_name: grantor?.name || 'Grantor',
          grantor_email: grantor?.email || 'grantor@example.com',
        };
      });
      return { rows: list, rowCount: list.length };
    }

    if (trimmed.includes('UPDATE grants')) {
      const id = Number(params[params.length - 1]);
      const grant = this.grants.find((g) => g.id === id);
      if (!grant) return { rows: [], rowCount: 0 };

      // Parse update params
      let idx = 0;
      if (trimmed.includes('title = $1') || trimmed.includes('title = $2') || trimmed.includes('title = $3')) {
        grant.title = params[idx++];
      }
      if (trimmed.includes('description = $')) {
        grant.description = params[idx++];
      }
      if (trimmed.includes('amount = $')) {
        grant.amount = Number(params[idx++]);
      }
      grant.updated_at = new Date();

      return { rows: [{ ...grant, amount: Number(grant.amount) }], rowCount: 1 };
    }

    if (trimmed.includes('DELETE FROM grants WHERE id = $1')) {
      const id = Number(params[0]);
      const initial = this.grants.length;
      this.grants = this.grants.filter((g) => g.id !== id);
      const rowCount = initial - this.grants.length;
      return { rows: rowCount > 0 ? [{ id }] : [], rowCount };
    }

    // 6. Applications Queries
    if (trimmed.includes('INSERT INTO applications')) {
      const [grantId, granteeId, proposal, status] = params;
      const app = {
        id: this.appIdSeq++,
        grant_id: Number(grantId),
        grantee_id: Number(granteeId),
        proposal,
        status: status || 'submitted',
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.applications.push(app);
      return { rows: [{ ...app }], rowCount: 1 };
    }

    if (trimmed.includes('FROM applications a') && trimmed.includes('WHERE a.grant_id = $1')) {
      const grantId = Number(params[0]);
      const apps = this.applications
        .filter((a) => a.grant_id === grantId)
        .map((a) => {
          const grantee = this.users.find((u) => u.id === a.grantee_id);
          const grant = this.grants.find((g) => g.id === a.grant_id);
          return {
            ...a,
            grantee_name: grantee?.name || 'Applicant',
            grantee_email: grantee?.email || 'applicant@example.com',
            grant_title: grant?.title || 'Grant',
            grantor_id: grant?.grantor_id,
          };
        });
      return { rows: apps, rowCount: apps.length };
    }

    if (trimmed.includes('FROM applications a') && trimmed.includes('WHERE a.id = $1')) {
      const id = Number(params[0]);
      const a = this.applications.find((app) => app.id === id);
      if (!a) return { rows: [], rowCount: 0 };

      const grantee = this.users.find((u) => u.id === a.grantee_id);
      const grant = this.grants.find((g) => g.id === a.grant_id);
      const grantor = grant ? this.users.find((u) => u.id === grant.grantor_id) : null;

      return {
        rows: [{
          ...a,
          grantee_name: grantee?.name || 'Applicant',
          grantee_email: grantee?.email || 'applicant@example.com',
          grant_title: grant?.title || 'Grant',
          grantor_id: grant?.grantor_id,
          grant_amount: Number(grant?.amount || 0),
          grantor_name: grantor?.name || 'Grantor',
          grantor_email: grantor?.email || 'grantor@example.com',
        }],
        rowCount: 1,
      };
    }

    if (trimmed.includes('FROM applications a') && trimmed.includes('WHERE a.grantee_id = $1')) {
      const granteeId = Number(params[0]);
      const apps = this.applications
        .filter((a) => a.grantee_id === granteeId)
        .map((a) => {
          const grant = this.grants.find((g) => g.id === a.grant_id);
          const grantor = grant ? this.users.find((u) => u.id === grant.grantor_id) : null;
          return {
            ...a,
            grant_title: grant?.title || 'Grant',
            grant_amount: Number(grant?.amount || 0),
            grantor_name: grantor?.name || 'Grantor',
          };
        });
      return { rows: apps, rowCount: apps.length };
    }

    if (trimmed.includes('UPDATE applications')) {
      const [status, id] = params;
      const app = this.applications.find((a) => a.id === Number(id));
      if (!app) return { rows: [], rowCount: 0 };
      app.status = status;
      app.updated_at = new Date();
      return { rows: [{ ...app }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  getUserRoles(userId) {
    const roleIds = this.userRoles
      .filter((ur) => ur.user_id === userId)
      .map((ur) => ur.role_id);
    return this.roles
      .filter((r) => roleIds.includes(r.id))
      .map((r) => r.name);
  }
}

const mockDb = new MockDatabase();

module.exports = mockDb;
