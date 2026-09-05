const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware to authenticate requests using Bearer JWT token
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is missing or malformed in Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT.SECRET);
    
    // Decoded payload contains userId (or sub) and roles array
    req.user = {
      userId: decoded.userId || decoded.sub || decoded.id,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      email: decoded.email || null,
      name: decoded.name || null,
    };

    if (!req.user.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload: missing userId'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token has expired'
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or corrupted authentication token'
    });
  }
};

module.exports = {
  authenticate,
};
