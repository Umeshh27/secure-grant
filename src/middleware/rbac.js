/**
 * Role-Based Access Control Middleware
 * @param  {...string|string[]} requiredRoles - Allowed role name(s) e.g. 'ADMIN', 'GRANTOR', 'GRANTEE'
 */
const requireRole = (...requiredRoles) => {
  const flattenedRoles = requiredRoles.flat().map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication is required to access this resource'
      });
    }

    const userRoles = (req.user.roles || []).map((r) => String(r).toUpperCase());
    
    // Check if user has ANY of the required roles
    const hasRole = flattenedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access forbidden: Required role [${flattenedRoles.join(', ')}] not held by user`
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
};
