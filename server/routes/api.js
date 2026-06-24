const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { authLimiter, apiLimiter, predictionLimiter } = require('../middlewares/rateLimiter');

const authController = require('../controllers/authController');
const predictionController = require('../controllers/predictionController');
const chatController = require('../controllers/chatController');
const analyticsController = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middlewares/auth');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};



// ==================== AUTH ROUTES ====================
router.post('/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  authController.register
);

router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  validate,
  authController.login
);

router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validate, authController.changePassword);

// ==================== PREDICTION ROUTES ====================
router.post('/predict',
  protect,
  predictionLimiter,
  [
    body('symptoms').notEmpty().withMessage('Symptoms are required')
  ],
  validate,
  predictionController.predict
);

router.get('/history', protect, predictionController.getHistory);
router.get('/prediction/:id', protect, predictionController.getPrediction);
router.post('/prediction/:id/report', protect, predictionController.generateReport);
router.get('/search-disease',
  protect,
  [query('query').notEmpty().withMessage('Search query required')],
  validate,
  predictionController.searchDisease
);

// ==================== CHAT ROUTES ====================
router.post('/chat',
  protect,
  apiLimiter,
  [body('message').trim().notEmpty().withMessage('Message required').isLength({ max: 2000 }).withMessage('Message too long')],
  validate,
  chatController.sendMessage
);

router.get('/chat-history', protect, chatController.getChatHistory);
router.get('/chat/:id', protect, chatController.getChat);
router.delete('/chat/:id', protect, chatController.deleteChat);
router.delete('/chats', protect, chatController.clearAllChats);

// ==================== MEDICATION REMINDER ROUTES ====================
const medicationController = require('../controllers/medicationController');
router.get('/medications', protect, medicationController.getReminders);
router.post('/medications', protect, [
  body('medicationName').trim().notEmpty().withMessage('Medication name required'),
  body('frequency').optional().isIn(['once_daily','twice_daily','three_times','four_times','weekly','as_needed'])
], validate, medicationController.createReminder);
router.put('/medications/:id', protect, medicationController.updateReminder);
router.delete('/medications/:id', protect, medicationController.deleteReminder);

// ==================== ANALYTICS ROUTES ====================
router.get('/analytics', protect, analyticsController.getAnalytics);

// ==================== ADMIN ROUTES ====================
router.get('/admin/stats', protect, adminOnly, analyticsController.getAdminStats);
router.get('/admin/users', protect, adminOnly, analyticsController.getAllUsers);
router.put('/admin/users/:id/toggle', protect, adminOnly, analyticsController.toggleUser);

module.exports = router;
