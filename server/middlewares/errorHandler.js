const logger = require('../utils/logger');

// Centralized error handler
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    statusCode = 401;
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}`;
    statusCode = 400;
  }

  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  if (req.accepts('html') && statusCode !== 400) {
    return res.status(statusCode).render('pages/error', {
      title: `Error ${statusCode}`,
      statusCode,
      message,
      user: req.user || null,
      layout: 'layouts/main'
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res, next) => {
  if (req.accepts('html')) {
    return res.status(404).render('pages/error', {
      title: 'Page Not Found',
      statusCode: 404,
      message: 'The page you are looking for does not exist.',
      user: req.user || null,
      layout: 'layouts/main'
    });
  }
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
};

// Security alert logger
const securityAlert = (type, details, req) => {
  logger.warn(`SECURITY ALERT [${type}]: ${details} - IP: ${req.ip} - UA: ${req.headers['user-agent']}`);
};

module.exports = { errorHandler, notFound, requestLogger, securityAlert };
