const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // Database settings
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'postgres',
    NAME: process.env.DB_NAME || 'grant_db',
    URL: process.env.DATABASE_URL || null,
  },

  // Redis settings
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    URL: process.env.REDIS_URL || null,
  },

  // JWT settings
  JWT: {
    SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_secure_grant_portal_2026',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  },

  // OAuth settings
  OAUTH: {
    GOOGLE: {
      CLIENT_ID: process.env.OAUTH_CLIENT_ID || 'mock-google-client-id.apps.googleusercontent.com',
      CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || 'mock-google-client-secret',
      REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
      AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
      TOKEN_URL: 'https://oauth2.googleapis.com/token',
      USERINFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
    }
  },

  // Default Admin credentials
  ADMIN: {
    NAME: process.env.ADMIN_NAME || 'Super Admin',
    EMAIL: process.env.ADMIN_EMAIL || 'admin@securegrant.org',
    PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!',
  }
};

module.exports = env;
