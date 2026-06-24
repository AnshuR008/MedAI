const express = require('express');
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require('../middlewares/auth');
const HealthProfile = require('../models/HealthProfile');
const Prediction = require('../models/Prediction');
const Chat = require('../models/Chat');
const MedicationReminder = require('../models/MedicationReminder');
const PredictionService = require('../services/predictionService');

// Landing page
router.get('/', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('pages/landing', { title: 'MedAI - AI Medical Assistant', user: null, layout: 'layouts/public' });
});

// Auth pages
router.get('/login', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('pages/login', {
    title: 'Login - MedAI',
    user: null,
    layout: 'layouts/auth',
    message: req.query.message || null,
    error: req.query.error || null
  });
});

router.get('/register', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('pages/register', { title: 'Register - MedAI', user: null, layout: 'layouts/auth' });
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  if (req.session) req.session.destroy();
  res.redirect('/login?message=Logged out successfully');
});

// Dashboard
router.get('/dashboard', protect, async (req, res, next) => {
  try {
    const [profile, recentPredictions, totalPredictions, totalChats, medications] = await Promise.all([
      HealthProfile.findOne({ user: req.user._id }),
      Prediction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5),
      Prediction.countDocuments({ user: req.user._id }),
      Chat.countDocuments({ user: req.user._id, isActive: true }),
      MedicationReminder.find({ user: req.user._id, isActive: true }).sort({ createdAt: -1 })
    ]);

    const healthRisk = PredictionService.calculateHealthRiskScore(profile);

    res.render('pages/dashboard', {
      title: 'Dashboard - MedAI',
      user: req.user,
      profile,
      recentPredictions,
      stats: { totalPredictions, totalChats },
      healthRisk,
      medications,
      layout: 'layouts/main'
    });
  } catch (error) { next(error); }
});

// Profile
router.get('/profile', protect, async (req, res, next) => {
  try {
    const profile = await HealthProfile.findOne({ user: req.user._id });
    res.render('pages/profile', {
      title: 'Profile - MedAI',
      user: req.user,
      profile,
      layout: 'layouts/main'
    });
  } catch (error) { next(error); }
});

// Prediction
router.get('/predict', protect, (req, res) => {
  res.render('pages/predict', {
    title: 'Symptom Checker - MedAI',
    user: req.user,
    layout: 'layouts/main'
  });
});

// Chat
router.get('/chat', protect, async (req, res, next) => {
  try {
    const chats = await Chat.find({ user: req.user._id, isActive: true })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('sessionTitle updatedAt');

    res.render('pages/chat', {
      title: 'AI Chat - MedAI',
      user: req.user,
      chats,
      layout: 'layouts/main'
    });
  } catch (error) { next(error); }
});

// Disease Search
router.get('/diseases', protect, (req, res) => {
  res.render('pages/diseases', {
    title: 'Disease Search - MedAI',
    user: req.user,
    layout: 'layouts/main'
  });
});

// Medications
router.get('/medications', protect, async (req, res, next) => {
  try {
    const medications = await MedicationReminder.find({ user: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.render('pages/medications', {
      title: 'Medication Reminders - MedAI',
      user: req.user,
      medications,
      layout: 'layouts/main'
    });
  } catch (error) { next(error); }
});

// History
router.get('/history', protect, async (req, res, next) => {
  try {
    const predictions = await Prediction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.render('pages/history', {
      title: 'Prediction History - MedAI',
      user: req.user,
      predictions,
      layout: 'layouts/main'
    });
  } catch (error) { next(error); }
});

// Analytics
router.get('/analytics', protect, (req, res) => {
  res.render('pages/analytics', {
    title: 'Analytics - MedAI',
    user: req.user,
    layout: 'layouts/main'
  });
});

// Admin
router.get('/admin', protect, adminOnly, (req, res) => {
  res.render('pages/admin', {
    title: 'Admin Dashboard - MedAI',
    user: req.user,
    layout: 'layouts/main'
  });
});

module.exports = router;

// ── admin sub-pages ────────────────────────────────────────
router.get('/admin/users', protect, adminOnly, (req, res) => {
  res.render('pages/adminUsers', { title: 'User Management - MedAI', user: req.user, layout: 'layouts/main' });
});
router.get('/admin/diseases', protect, adminOnly, (req, res) => {
  res.render('pages/adminDiseases', { title: 'Disease Management - MedAI', user: req.user, layout: 'layouts/main' });
});
router.get('/admin/logs', protect, adminOnly, (req, res) => {
  res.render('pages/adminLogs', { title: 'System Logs - MedAI', user: req.user, layout: 'layouts/main' });
});
router.get('/admin/analytics', protect, adminOnly, (req, res) => {
  res.render('pages/adminAnalytics', { title: 'Admin Analytics - MedAI', user: req.user, layout: 'layouts/main' });
});
