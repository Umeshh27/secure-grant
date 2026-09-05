const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AuthService = require('../../src/services/authService');
const env = require('../../src/config/env');

describe('Unit Tests: Authentication & JWT Security', () => {
  const sampleUser = {
    id: 42,
    name: 'Jane Doe',
    email: 'jane@example.com',
    roles: ['ADMIN', 'GRANTOR'],
  };

  test('generateToken should produce a valid JWT containing userId and roles array', () => {
    const token = AuthService.generateToken(sampleUser);
    expect(typeof token).toBe('string');

    // Decode without verification (Requirement 6)
    const decoded = jwt.decode(token);
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(42);
    expect(decoded.roles).toEqual(['ADMIN', 'GRANTOR']);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  test('generateToken should correctly sign with JWT_SECRET', () => {
    const token = AuthService.generateToken(sampleUser);
    const verified = jwt.verify(token, env.JWT.SECRET);
    expect(verified.userId).toBe(42);
    expect(verified.roles).toContain('ADMIN');
  });

  test('jwt verification should throw for invalid secret or corrupted token', () => {
    const token = AuthService.generateToken(sampleUser);
    expect(() => {
      jwt.verify(token, 'wrong-secret');
    }).toThrow();

    expect(() => {
      jwt.verify('invalid.token.string', env.JWT.SECRET);
    }).toThrow();
  });

  test('password hashing with bcrypt should hash and compare correctly', async () => {
    const password = 'SecurePassword123!';
    const hash = await bcrypt.hash(password, 10);
    expect(hash).not.toBe(password);

    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });
});
