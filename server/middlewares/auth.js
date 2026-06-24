const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check session
    else if (req.session && req.session.token) {
      token = req.session.token;
    }

    if (!token) {
      if (req.accepts('html')) {
        return res.redirect('/login?message=Please login to continue');
      }
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      if (req.accepts('html')) {
        return res.redirect('/login?message=Session expired, please login again');
      }
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn(`Auth middleware error: ${error.message}`);
    if (req.accepts('html')) {
      return res.redirect('/login?message=Session expired');
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    if (req.accepts('html')) {
      return res.redirect('/dashboard?error=Admin access required');
    }
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token || req.session?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id);
    }
  } catch (e) {
    // Silent fail for optional auth
  }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
