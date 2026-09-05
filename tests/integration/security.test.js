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

describe('Integration Tests: Edge Cases & Error Handlers', () => {
  let adminToken, granteeToken;

  beforeEach(() => {
    mockDb.reset();
    adminToken = AuthService.generateToken({ id: 1, roles: ['ADMIN'], email: 'admin@securegrant.org' });
    granteeToken = AuthService.generateToken({ id: 3, roles: ['GRANTEE'], email: 'grantee@securegrant.org' });
  });

  test('Non-existent API route should return 404 with NotFound error', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
  });

  test('GET /api/users/profile should return current authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@securegrant.org');
    expect(res.body.roles).toContain('ADMIN');
  });

  test('GET /api/users/:userId as self should return user details', async () => {
    const res = await request(app)
      .get('/api/users/3')
      .set('Authorization', `Bearer ${granteeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(3);
  });

  test('GET /api/users/:userId as non-admin requesting another user should return 403', async () => {
    const res = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${granteeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  test('Updating grant with invalid negative amount should return 400', async () => {
    const grantorToken = AuthService.generateToken({ id: 2, roles: ['GRANTOR'], email: 'grantor@securegrant.org' });
    const res = await request(app)
      .put('/api/grants/1')
      .set('Authorization', `Bearer ${grantorToken}`)
      .send({ amount: -500 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  test('Updating application with invalid status should return 400', async () => {
    const grantorToken = AuthService.generateToken({ id: 2, roles: ['GRANTOR'], email: 'grantor@securegrant.org' });
    const res = await request(app)
      .put('/api/applications/1/status')
      .set('Authorization', `Bearer ${grantorToken}`)
      .send({ status: 'invalid_status_xyz' });

    expect(res.status).toBe(400);
  });
});
