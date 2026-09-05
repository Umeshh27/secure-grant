module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/db/migrate.js',
    '!src/db/seed.js'
  ],
  coverageReporters: ['text', 'lcov', 'json', 'clover'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 70,
      lines: 70
    }
  },
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 15000
};
