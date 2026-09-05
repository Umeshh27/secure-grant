const request = require('supertest');
const jwt = require('jsonwebtoken');
const mockDb = require('../helpers/mockDb');

jest.mock('../../src/config/db', () => ({
  query: (text, params) => mockDb.query(text, params),
  pool: { end: jest.fn() },
  getClient: jest.fn(),
  checkHealth: jest.fn(() => Promise.resolve(true)),
}));

const app = require('../../src/app');

describe('Integration Tests: Authentication & OAuth 2.0 API', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user and return 201 without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Robert Fox',
          email: 'robert@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Robert Fox');
      expect(res.body.email).toBe('robert@example.com');
      expect(res.body.password).toBeUndefined();
      expect(res.body.password_hash).toBeUndefined();
    });

    test('should reject registration with duplicate email (409)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Admin Duplicate',
          email: 'admin@securegrant.org', // already exists in seed
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
    });

    test('should reject invalid registration payload (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'R', // too short
          email: 'not-an-email',
          password: '123', // too short
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should log in with valid credentials and return 200 with accessToken', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@securegrant.org',
          password: 'AdminSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');

      // Contract Requirement 6: Decode JWT and verify payload structure
      const decoded = jwt.decode(res.body.accessToken);
      expect(decoded.userId).toBeDefined();
      expect(Array.isArray(decoded.roles)).toBe(true);
      expect(decoded.roles).toContain('ADMIN');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should reject invalid password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@securegrant.org',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    test('should reject non-existent user with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('OAuth 2.0 Integration Endpoints', () => {
    test('GET /api/auth/google should provide Google OAuth consent URL', async () => {
      const res = await request(app)
        .get('/api/auth/google?json=true');

      expect(res.status).toBe(200);
      expect(res.body.authUrl).toContain('accounts.google.com');
      expect(res.body.authUrl).toContain('client_id');
    });

    test('GET /api/auth/google/callback should exchange code, create user, and issue JWT', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback?code=mock_test_code_oauth_tester');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('oauth.oauth_tester@example.com');
      expect(res.body.user.roles).toContain('GRANTEE');

      // Verify JWT payload
      const decoded = jwt.decode(res.body.accessToken);
      expect(decoded.userId).toBe(res.body.user.id);
      expect(decoded.roles).toContain('GRANTEE');
    });

    test('GET /api/auth/google/callback without code should return 400', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BadRequest');
    });
  });
});
