const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect routes - Verifies JWT from Authorization Bearer header
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(
      res,
      401,
      'Not authorized to access this route. Please provide a valid Bearer token.'
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB (excluding password)
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(
        res,
        401,
        'The user belonging to this token no longer exists.'
      );
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token has expired. Please log in again.');
    }
    return errorResponse(res, 401, 'Invalid authentication token.');
  }
};

/**
 * Authorize specific roles (e.g., 'organizer')
 * @param  {...string} roles Allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Forbidden: Role '${req.user ? req.user.role : 'guest'}' is not authorized to perform this action.`
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles
};
