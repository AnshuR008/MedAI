/**
 * chatRoutes.js
 * /api/chat/* — authenticated chat endpoints.
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');

const chat     = require('../controllers/chatController');
const { protect }   = require('../middlewares/authMiddleware');
const { chatLimiter } = require('../middlewares/rateLimiter');
const { xssClean }  = require('../middlewares/securityMiddleware');

const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  next();
};

router.use(protect, xssClean);

router.post('/',
  chatLimiter,
  [
    body('message').trim().notEmpty().withMessage('Message is required')
      .isLength({ max: 2000 }).withMessage('Message too long (max 2000 chars)'),
  ],
  validate,
  chat.sendMessage
);

router.get('/history',  chat.getChatHistory);
router.get('/:id',      chat.getChat);
router.delete('/:id',   chat.deleteChat);
router.delete('/',      chat.clearAllChats);

module.exports = router;
