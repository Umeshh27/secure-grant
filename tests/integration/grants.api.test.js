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

describe('Integration Tests: Grant Management & Ownership (Contract Requirements 9 & 10)', () => {
  let adminToken, grantor1Token, grantor2Token, granteeToken;

  beforeEach(() => {
    mockDb.reset();
    adminToken = AuthService.generateToken({ id: 1, roles: ['ADMIN'], email: 'admin@securegrant.org' });
    grantor1Token = AuthService.generateToken({ id: 2, roles: ['GRANTOR'], email: 'grantor1@securegrant.org' });
    
    // Seed second grantor
    const g2 = {
      id: 99,
      name: 'Second Funder',
      email: 'grantor2@securegrant.org',
      roles: ['GRANTOR'],
    };
    mockDb.users.push({ ...g2, password_hash: 'hash' });
    mockDb.userRoles.push({ id: 999, user_id: 99, role_id: 2 });
    grantor2Token = AuthService.generateToken(g2);

    granteeToken = AuthService.generateToken({ id: 3, roles: ['GRANTEE'], email: 'grantee@securegrant.org' });
  });

  test('GRANTOR can create a grant (POST /api/grants) -> 201 Created', async () => {
    const res = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${grantor1Token}`)
      .send({
        title: 'Renewable Energy Innovation Fund',
        description: 'Grants for clean energy breakthrough startups.',
        amount: 85000,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Renewable Energy Innovation Fund');
    expect(res.body.grantor_id).toBe(2);
    expect(Number(res.body.amount)).toBe(85000);
  });

  test('GRANTEE can view all available grants (GET /api/grants) -> 200 Array', async () => {
    const res = await request(app)
      .get('/api/grants')
      .set('Authorization', `Bearer ${granteeToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('grantor_name');
  });

  test('Authenticated user can view single grant (GET /api/grants/:id) -> 200', async () => {
    const res = await request(app)
      .get('/api/grants/1')
      .set('Authorization', `Bearer ${granteeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('GET /api/grants/:id for non-existent grant returns 404', async () => {
    const res = await request(app)
      .get('/api/grants/9999')
      .set('Authorization', `Bearer ${granteeToken}`);

    expect(res.status).toBe(404);
  });

  test('Owner GRANTOR can update own grant (PUT /api/grants/:id) -> 200', async () => {
    // Grant 1 is owned by Grantor 1 (user_id = 2)
    const res = await request(app)
      .put('/api/grants/1')
      .set('Authorization', `Bearer ${grantor1Token}`)
      .send({
        title: 'Updated AI for Social Good Grant Title',
        amount: 60000,
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated AI for Social Good Grant Title');
    expect(Number(res.body.amount)).toBe(60000);
  });

  test('Different GRANTOR attempting to update grant receives 403 Forbidden', async () => {
    // Grantor 2 (user_id = 99) tries to update Grant 1 (owned by user_id = 2)
    const res = await request(app)
      .put('/api/grants/1')
      .set('Authorization', `Bearer ${grantor2Token}`)
      .send({
        title: 'Malicious Update Title',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  test('Owner GRANTOR can delete own grant (DELETE /api/grants/:id) -> 200', async () => {
    // Create a new grant to delete
    const createRes = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${grantor1Token}`)
      .send({
        title: 'Temporary Grant',
        description: 'To be deleted',
        amount: 10000,
      });
    const grantId = createRes.body.id;

    const delRes = await request(app)
      .delete(`/api/grants/${grantId}`)
      .set('Authorization', `Bearer ${grantor1Token}`);

    expect(delRes.status).toBe(200);
  });

  test('ADMIN can delete any grant (DELETE /api/grants/:id) -> 200', async () => {
    const delRes = await request(app)
      .delete('/api/grants/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
  });

  test('Different GRANTOR cannot delete another grantor\'s grant (403 Forbidden)', async () => {
    const delRes = await request(app)
      .delete('/api/grants/1')
      .set('Authorization', `Bearer ${grantor2Token}`);

    expect(delRes.status).toBe(403);
  });
});
