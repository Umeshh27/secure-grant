const UserModel = require('../../src/models/userModel');
const RoleModel = require('../../src/models/roleModel');
const GrantModel = require('../../src/models/grantModel');
const ApplicationModel = require('../../src/models/applicationModel');
const mockDb = require('../helpers/mockDb');

jest.mock('../../src/config/db', () => ({
  query: (text, params) => mockDb.query(text, params),
  pool: { end: jest.fn() },
  getClient: jest.fn(),
  checkHealth: jest.fn(() => Promise.resolve(true)),
}));

describe('Unit Tests: Database Models Layer', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  describe('RoleModel', () => {
    test('findByName should return role by name', async () => {
      const role = await RoleModel.findByName('ADMIN');
      expect(role).toBeDefined();
      expect(role.name).toBe('ADMIN');
    });

    test('findById should return role by ID', async () => {
      const role = await RoleModel.findById(1);
      expect(role).toBeDefined();
      expect(role.id).toBe(1);
    });

    test('findAll should return all roles', async () => {
      const roles = await RoleModel.findAll();
      expect(roles.length).toBe(3);
    });
  });

  describe('UserModel', () => {
    test('findByOAuth should return user by provider and oauth_id', async () => {
      await UserModel.create({
        name: 'OAuth Person',
        email: 'oauthperson@example.com',
        oauthProvider: 'google',
        oauthId: 'google-12345',
      });

      const user = await UserModel.findByOAuth('google', 'google-12345');
      expect(user).toBeDefined();
      expect(user.email).toBe('oauthperson@example.com');
    });

    test('removeRole should remove a role from a user', async () => {
      await UserModel.removeRole(1, 1);
      const roles = await UserModel.getRolesForUser(1);
      expect(roles).not.toContain('ADMIN');
    });
  });

  describe('GrantModel & ApplicationModel', () => {
    test('GrantModel.findById returns grant details', async () => {
      const grant = await GrantModel.findById(1);
      expect(grant).toBeDefined();
      expect(grant.title).toContain('AI for Social Good');
    });

    test('ApplicationModel.findByGranteeId returns applications', async () => {
      const apps = await ApplicationModel.findByGranteeId(3);
      expect(apps.length).toBeGreaterThan(0);
    });
  });
});
