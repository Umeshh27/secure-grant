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

describe('Integration Tests: RBAC Route Protections (401 Unauthorized & 403 Forbidden)', () => {
  let adminToken, grantorToken, granteeToken;

  beforeEach(() => {
    mockDb.reset();
    adminToken = AuthService.generateToken({ id: 1, roles: ['ADMIN'], email: 'admin@securegrant.org' });
    grantorToken = AuthService.generateToken({ id: 2, roles: ['GRANTOR'], email: 'grantor@securegrant.org' });
    granteeToken = AuthService.generateToken({ id: 3, roles: ['GRANTEE'], email: 'grantee@securegrant.org' });
  });

  describe('Contract Requirement 7: 401 Unauthorized without Token', () => {
    test('POST /api/grants without token should return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/grants')
        .send({ title: 'Test Grant', description: 'Test Desc', amount: 1000 });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    test('GET /api/grants without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/grants');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    test('POST /api/users/2/roles without token should return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/users/2/roles')
        .send({ roleName: 'GRANTOR' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    test('Request with malformed or invalid token should return 401', async () => {
      const res = await request(app)
        .get('/api/grants')
        .set('Authorization', 'Bearer invalid.token.signature');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('Contract Requirement 7: 403 Forbidden with Wrong Role', () => {
    test('GRANTEE attempting to create grant (POST /api/grants) should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({ title: 'Unauthorized Grant', description: 'Desc', amount: 5000 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    test('GRANTOR attempting to apply for grant (POST /api/grants/1/apply) should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/grants/1/apply')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ proposal: 'Grantor proposal submission' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    test('GRANTEE attempting to assign role (POST /api/users/2/roles) should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/users/2/roles')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({ roleName: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    test('GRANTOR attempting to assign role (POST /api/users/3/roles) should receive 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/users/3/roles')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });
});
