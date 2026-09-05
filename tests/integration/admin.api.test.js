const request = require('supertest');
const mockDb = require('../helpers/mockDb');

jest.mock('../../src/config/db', () => ({
  query: (text, params) => mockDb.query(text, params),
  pool: { end: jest.fn() },
  getClient: jest.fn(),
  checkHealth: jest.fn(() => Promise.resolve(true)),
}));

const app = require('../../src/app');
const AuthService = require('../../src/services/authService');

describe('Integration Tests: Admin User & Role Management (Contract Requirement 8)', () => {
  let adminToken, granteeToken;

  beforeEach(() => {
    mockDb.reset();
    adminToken = AuthService.generateToken({ id: 1, roles: ['ADMIN'], email: 'admin@securegrant.org' });
    granteeToken = AuthService.generateToken({ id: 3, roles: ['GRANTEE'], email: 'grantee@securegrant.org' });
  });

  test('ADMIN can assign GRANTOR role to an existing user (POST /api/users/:userId/roles)', async () => {
    // 1. Create a new registered user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Candidate',
        email: 'candidate@example.com',
        password: 'Password123!',
      });
    expect(regRes.status).toBe(201);
    const newUserId = regRes.body.id;

    // 2. Admin assigns GRANTOR role
    const assignRes = await request(app)
      .post(`/api/users/${newUserId}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.user).toBeDefined();
    expect(assignRes.body.user.roles).toContain('GRANTOR');

    // 3. Verify user's roles via get user endpoint
    const userRes = await request(app)
      .get(`/api/users/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(userRes.status).toBe(200);
    expect(userRes.body.roles).toContain('GRANTOR');
  });

  test('Assigning invalid role name should return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/users/3/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'INVALID_ROLE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  test('Assigning role to non-existent user should return 404 Not Found', async () => {
    const res = await request(app)
      .post('/api/users/99999/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
  });

  test('ADMIN can list all users in the system (GET /api/users)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('Non-admin cannot list all users (GET /api/users)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${granteeToken}`);

    expect(res.status).toBe(403);
  });
});
