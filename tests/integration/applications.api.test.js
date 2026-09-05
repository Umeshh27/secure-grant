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

describe('Integration Tests: Grant Applications & Review (Contract Requirements 10 & 11)', () => {
  let grantor1Token, grantor2Token, grantee1Token, grantee2Token;

  beforeEach(() => {
    mockDb.reset();
    grantor1Token = AuthService.generateToken({ id: 2, roles: ['GRANTOR'], email: 'grantor1@securegrant.org' });
    
    // Seed second grantor
    const g2 = { id: 88, name: 'Other Funder', email: 'grantor2@securegrant.org', roles: ['GRANTOR'] };
    mockDb.users.push({ ...g2, password_hash: 'hash' });
    mockDb.userRoles.push({ id: 888, user_id: 88, role_id: 2 });
    grantor2Token = AuthService.generateToken(g2);

    grantee1Token = AuthService.generateToken({ id: 3, roles: ['GRANTEE'], email: 'grantee1@securegrant.org' });

    // Seed second grantee
    const ge2 = { id: 77, name: 'Other Applicant', email: 'grantee2@securegrant.org', roles: ['GRANTEE'] };
    mockDb.users.push({ ...ge2, password_hash: 'hash' });
    mockDb.userRoles.push({ id: 777, user_id: 77, role_id: 3 });
    grantee2Token = AuthService.generateToken(ge2);
  });

  describe('Contract Requirement 10: GRANTEE Application Submission', () => {
    test('GRANTEE can submit an application (POST /api/grants/:grantId/apply) -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/grants/1/apply')
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({
          proposal: 'Our comprehensive research proposal on environmental sensors.',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.grant_id).toBe(1);
      expect(res.body.grantee_id).toBe(3);
      expect(res.body.status).toBe('submitted');
      expect(res.body.proposal).toContain('environmental sensors');
    });

    test('Submitting application to non-existent grant should return 404', async () => {
      const res = await request(app)
        .post('/api/grants/9999/apply')
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({
          proposal: 'Proposal to non-existent grant',
        });

      expect(res.status).toBe(404);
    });

    test('Submitting empty proposal should return 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/grants/1/apply')
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({
          proposal: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('Contract Requirement 11: GRANTOR Applications Access & Isolation', () => {
    test('Owner GRANTOR can view applications for their grant -> 200 Array', async () => {
      // Grant 1 is owned by Grantor 1 (user_id = 2)
      const res = await request(app)
        .get('/api/grants/1/applications')
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('grantee_name');
    });

    test('Different GRANTOR cannot view applications for a grant they do not own -> 403 Forbidden', async () => {
      // Grantor 2 (user_id = 88) attempts to access applications for Grant 1 (owned by user_id = 2)
      const res = await request(app)
        .get('/api/grants/1/applications')
        .set('Authorization', `Bearer ${grantor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('Single Application Access & Review Status', () => {
    test('Submitting GRANTEE can view their own application (GET /api/applications/:id) -> 200', async () => {
      // Application 1 is submitted by Grantee 1 (user_id = 3)
      const res = await request(app)
        .get('/api/applications/1')
        .set('Authorization', `Bearer ${grantee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test('Parent GRANTOR can view the application -> 200', async () => {
      // Grantor 1 owns the grant for application 1
      const res = await request(app)
        .get('/api/applications/1')
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test('Unrelated user cannot view the application (403 Forbidden)', async () => {
      // Grantee 2 (user_id = 77) is neither submitter nor grant owner
      const res = await request(app)
        .get('/api/applications/1')
        .set('Authorization', `Bearer ${grantee2Token}`);

      expect(res.status).toBe(403);
    });

    test('GRANTEE can list all their own applications (GET /api/applications/my)', async () => {
      const res = await request(app)
        .get('/api/applications/my')
        .set('Authorization', `Bearer ${grantee1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Parent GRANTOR can update application status (PUT /api/applications/:id/status)', async () => {
      const res = await request(app)
        .put('/api/applications/1/status')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
    });
  });
});
