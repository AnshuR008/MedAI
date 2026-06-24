/**
 * securityMiddleware.js
 * Composite security pipeline: XSS scrubbing, NoSQL injection prevention,
 * deep input sanitisation, and Helmet CSP helper.
 */

const validator = require('validator');
const logger    = require('../utils/logger');

/* ── XSS scrubber ────────────────────────────────────────── */

/**
 * Recursively strip HTML tags from strings in an object / array / primitive.
 */
const sanitizeValue = (val) => {
  if (typeof val === 'string')  return validator.escape(val.trim());
  if (Array.isArray(val))       return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) clean[k] = sanitizeValue(v);
    return clean;
  }
  return val;
};

/**
 * xssClean – sanitises req.body, req.query, req.params.
 */
const xssClean = (req, res, next) => {
  if (req.body)   req.body   = sanitizeValue(req.body);
  if (req.query)  req.query  = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

/* ── NoSQL injection prevention ──────────────────────────── */

const MONGO_OPERATORS = /^\$|\.|\$/;

const stripOperators = (val) => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val))     return val.map(stripOperators);
  if (val && typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (MONGO_OPERATORS.test(key)) {
        logger.warn(`[SECURITY] NoSQL injection attempt blocked – key: ${key} | IP unknown`);
        delete val[key];
      } else {
        val[key] = stripOperators(val[key]);
      }
    }
  }
  return val;
};

const noSqlSanitize = (req, res, next) => {
  if (req.body)   stripOperators(req.body);
  if (req.query)  stripOperators(req.query);
  if (req.params) stripOperators(req.params);
  next();
};

/* ── Security alert logger ───────────────────────────────── */

const securityAlert = (type, details, req) => {
  logger.warn(
    `[SECURITY][${type}] ${details} | IP: ${req?.ip} | UA: ${req?.headers?.['user-agent']}`
  );
};

/* ── Suspicious pattern detector ────────────────────────── */

const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,      // onclick=, onload= …
  /union\s+select/i,
  /drop\s+table/i,
  /\$where/i,
  /\$regex/i,
];

const detectSuspiciousPayload = (req, res, next) => {
  const payload = JSON.stringify({ b: req.body, q: req.query, p: req.params });
  const matched = SUSPICIOUS_PATTERNS.find((p) => p.test(payload));
  if (matched) {
    securityAlert('SUSPICIOUS_PAYLOAD', `Pattern matched: ${matched}`, req);
    return res.status(400).json({
      success: false,
      message: 'Request contains invalid characters or patterns.',
    });
  }
  next();
};

/* ── Helmet CSP config helper ────────────────────────────── */

const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'", 'ws:', 'wss:'],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
};

/* ── Stack export ────────────────────────────────────────── */

module.exports = {
  xssClean,
  noSqlSanitize,
  detectSuspiciousPayload,
  securityAlert,
  helmetConfig,
  sanitizeValue,
};
