const AuthService = require('../services/authService');
const OAuthService = require('../services/oauthService');

const AuthController = {
  /**
   * Handle user registration
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await AuthService.register({ name, email, password });
      return res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handle user login
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Redirect to Google OAuth consent
   * GET /api/auth/google
   */
  async googleAuth(req, res, next) {
    try {
      const url = OAuthService.getGoogleAuthUrl();
      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({ authUrl: url });
      }
      return res.redirect(url);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handle Google OAuth callback
   * GET /api/auth/google/callback
   */
  async googleCallback(req, res, next) {
    try {
      const { code } = req.query;
      const result = await OAuthService.handleGoogleCallback(code);

      // If requested via browser redirect or HTML accept header, redirect or respond with JSON
      if (req.query.redirect === 'true') {
        return res.redirect(`/?token=${result.accessToken}`);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = AuthController;
