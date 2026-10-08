/**
 * Centralized Error-Handling Middleware
 */

// 404 Handler for undefined routes
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - Endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Log error for developers
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.name}: ${err.message}`);
  }

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ID format: ${err.value}`;
    statusCode = 400;
    return res.status(statusCode).json({
      success: false,
      message
    });
  }

  // Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = field
      ? `Duplicate value entered for field: '${field}'. Please use another value.`
      : 'Duplicate key error occurred.';
    statusCode = 400;
    return res.status(statusCode).json({
      success: false,
      message,
      fields: err.keyValue
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
    statusCode = 400;
    return res.status(statusCode).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    return res.status(statusCode).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    return res.status(statusCode).json({
      success: false,
      message: 'Authorization token has expired.'
    });
  }

  // Express JSON parser SyntaxError
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    return res.status(statusCode).json({
      success: false,
      message: 'Malformed JSON payload in request body.'
    });
  }

  // General Error
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler
};
