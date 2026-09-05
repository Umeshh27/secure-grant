const request = require('supertest');
const mockDb = require('../helpers/mockDb');

jest.mock('../../src/config/db', () => ({
  query: (text, params) => mockDb.query(text, params),
  pool: { end: jest.fn() },
  getClient: jest.fn(),
  checkHealth: jest.fn(() => Promise.resolve(true)),
}));

const app = require('../../src/app');

describe('Integration Tests: System Health Check (GET /api/health)', () => {
  test('should return 200 with healthy status and service connectivity info', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services).toBeDefined();
    expect(res.body.services.database).toBe('connected');
    expect(res.body.uptime).toBeDefined();
  });
});
