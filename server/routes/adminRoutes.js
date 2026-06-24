/**
 * adminRoutes.js
 * All /api/admin/* endpoints — all require protect + adminOnly.
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { body, param } = require('express-validator');

const admin       = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { adminLimiter } = require('../middlewares/rateLimiter');
const { xssClean, noSqlSanitize } = require('../middlewares/securityMiddleware');

const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  next();
};

// Apply guards to every route in this router
router.use(protect, adminOnly, adminLimiter, xssClean, noSqlSanitize);

/* ── analytics ───────────────────────────────────────────── */
router.get('/analytics/summary',     admin.getSummary);
router.get('/analytics/users',       admin.getUserAnalytics);
router.get('/analytics/predictions', admin.getPredictionAnalytics);
router.get('/analytics/diseases',    admin.getDiseaseAnalytics);
router.get('/analytics/activity',    admin.getRecentActivity);

/* ── user management ─────────────────────────────────────── */
router.get('/users',                     admin.getAllUsers);
router.get('/users/:id',                 admin.getUser);
router.put('/users/:id/toggle',          admin.toggleUserStatus);
router.put('/users/:id/role',
  [body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')],
  validate,
  admin.updateUserRole
);
router.delete('/users/:id',              admin.deleteUser);

/* ── disease management ──────────────────────────────────── */
router.get('/diseases',      admin.getAllDiseases);
router.post('/diseases',
  [
    body('name').trim().notEmpty().withMessage('Disease name required'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('category').isIn([
      'cardiovascular','respiratory','digestive','neurological','infectious',
      'endocrine','musculoskeletal','dermatological','mental_health','other',
    ]).withMessage('Invalid category'),
  ],
  validate,
  admin.createDisease
);
router.put('/diseases/:id',  admin.updateDisease);
router.delete('/diseases/:id', admin.deleteDisease);

/* ── logs ────────────────────────────────────────────────── */
router.get('/logs/predictions', admin.getPredictionLogs);
router.get('/logs/chats',       admin.getChatLogs);
router.get('/logs/server',      admin.getServerLogs);

module.exports = router;
