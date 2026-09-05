/**
 * Input validation helpers
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Name is required and must be at least 2 characters long'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid email address is required'
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Password is required and must be at least 6 characters long'
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Email is required'
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Password is required'
    });
  }

  next();
};

const validateGrant = (req, res, next) => {
  const { title, description, amount } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Grant title is required'
    });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Grant description is required'
    });
  }

  const numericAmount = Number(amount);
  if (amount === undefined || isNaN(numericAmount) || numericAmount < 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid positive grant amount is required'
    });
  }

  next();
};

const validateGrantUpdate = (req, res, next) => {
  const { title, description, amount } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Grant title must not be empty'
    });
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Grant description must not be empty'
    });
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Grant amount must be a positive number'
      });
    }
  }

  next();
};

const validateApply = (req, res, next) => {
  const { proposal } = req.body || {};

  if (!proposal || typeof proposal !== 'string' || proposal.trim().length < 5) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Proposal content is required and must be at least 5 characters long'
    });
  }

  next();
};

const validateRoleAssignment = (req, res, next) => {
  const { roleName } = req.body || {};

  if (!roleName || typeof roleName !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'roleName is required (e.g. "GRANTOR", "GRANTEE", "ADMIN")'
    });
  }

  const normalized = roleName.toUpperCase();
  if (!['ADMIN', 'GRANTOR', 'GRANTEE'].includes(normalized)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid roleName "${roleName}". Allowed roles: ADMIN, GRANTOR, GRANTEE`
    });
  }

  req.body.roleName = normalized;
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateGrant,
  validateGrantUpdate,
  validateApply,
  validateRoleAssignment,
};
