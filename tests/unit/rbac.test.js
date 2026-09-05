const { requireRole } = require('../../src/middleware/rbac');

describe('Unit Tests: RBAC Authorization Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should return 401 Unauthorized if user is not authenticated (req.user is null)', () => {
    const middleware = requireRole('ADMIN');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 403 Forbidden if user lacks the required role', () => {
    req.user = { userId: 1, roles: ['GRANTEE'] };
    const middleware = requireRole('GRANTOR');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Forbidden' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next() if user has the exact required role', () => {
    req.user = { userId: 1, roles: ['GRANTOR'] };
    const middleware = requireRole('GRANTOR');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should call next() if user has one of multiple allowed roles', () => {
    req.user = { userId: 1, roles: ['ADMIN'] };
    const middleware = requireRole('GRANTEE', 'GRANTOR', 'ADMIN');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should handle role checking case-insensitively', () => {
    req.user = { userId: 1, roles: ['grantor'] };
    const middleware = requireRole('GRANTOR');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
