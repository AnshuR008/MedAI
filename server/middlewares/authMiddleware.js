/**
 * authMiddleware.js
 * Centralised authentication & authorisation guards.
 * Drop-in replacement / complement to the existing auth.js shim.
 */

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

// In-memory token blacklist (use Redis in production)
const tokenBlacklist = new Set();

/* ── helpers ─────────────────────────────────────────────── */

const extractToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer '))
    return req.headers.authorization.split(' ')[1];
  if (req.cookies?.token)   return req.cookies.token;
  if (req.session?.token)   return req.session.token;
  return null;
};

const sendUnauth = (req, res, msg = 'Authentication required') => {
  if (req.accepts('html'))
    return res.redirect(`/login?message=${encodeURIComponent(msg)}`);
  return res.status(401).json({ success: false, message: msg });
};

const sendForbidden = (req, res, msg = 'Access denied') => {
  if (req.accepts('html'))
    return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
  return res.status(403).json({ success: false, message: msg });
};

/* ── core guards ─────────────────────────────────────────── */

/**
 * protect – requires a valid JWT. Attaches req.user.
 */
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return sendUnauth(req, res);

    if (tokenBlacklist.has(token))
      return sendUnauth(req, res, 'Token has been invalidated');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    const user = await User.findById(decoded.id).select('-password');
    if (!user)          return sendUnauth(req, res, 'User no longer exists');
    if (!user.isActive) return sendUnauth(req, res, 'Account deactivated');

    req.user  = user;
    req.token = token;
    next();
  } catch (err) {
    logger.warn(`[AUTH] Token validation failed: ${err.message} | IP: ${req.ip}`);
    const msg = err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
    sendUnauth(req, res, msg);
  }
};

/**
 * optionalAuth – attaches req.user if token present; never blocks.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token && !tokenBlacklist.has(token)) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) { /* silent */ }
  next();
};

/**
 * requireRole(...roles) – factory for role-based guards.
 * Usage: requireRole('admin')  or  requireRole('admin','moderator')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return sendUnauth(req, res);
  if (!roles.includes(req.user.role))
    return sendForbidden(req, res, `Requires role: ${roles.join(' or ')}`);
  next();
};

const adminOnly = requireRole('admin');

/**
 * invalidateToken – blacklist token on logout.
 */
const invalidateToken = (token) => {
  if (token) tokenBlacklist.add(token);
};

/**
 * generateToken – sign a JWT for a user id.
 */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

/**
 * setTokenCookie – write httpOnly cookie.
 */
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
};

module.exports = {
  protect,
  optionalAuth,
  requireRole,
  adminOnly,
  invalidateToken,
  generateToken,
  setTokenCookie,
};
