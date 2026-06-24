/**
 * adminController.js
 * Handles all admin-panel operations.
 * All routes require protect + adminOnly guards.
 */

'use strict';

const fs         = require('fs');
const path       = require('path');
const User       = require('../models/User');
const Disease    = require('../models/Disease');
const Prediction = require('../models/Prediction');
const Chat       = require('../models/Chat');
const Report     = require('../models/Report');
const analytics  = require('../services/analyticsService');
const logger     = require('../utils/logger');

/* ── helpers ─────────────────────────────────────────────── */

const paginate = async (Model, query, { page = 1, limit = 20, sort = { createdAt: -1 }, populate } = {}) => {
  const skip  = (page - 1) * limit;
  let q = Model.find(query).sort(sort).skip(skip).limit(limit);
  if (populate) q = q.populate(populate);
  const [docs, total] = await Promise.all([q, Model.countDocuments(query)]);
  return { docs, total, page: +page, pages: Math.ceil(total / limit) };
};

/* ── analytics ───────────────────────────────────────────── */

exports.getSummary = async (req, res, next) => {
  try {
    const summary = await analytics.getAdminSummary();
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};

exports.getUserAnalytics = async (req, res, next) => {
  try {
    res.json({ success: true, data: await analytics.getUserStats() });
  } catch (err) { next(err); }
};

exports.getPredictionAnalytics = async (req, res, next) => {
  try {
    res.json({ success: true, data: await analytics.getPredictionStats() });
  } catch (err) { next(err); }
};

exports.getDiseaseAnalytics = async (req, res, next) => {
  try {
    res.json({ success: true, data: await analytics.getDiseaseStats() });
  } catch (err) { next(err); }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    res.json({ success: true, data: await analytics.getRecentActivity(20) });
  } catch (err) { next(err); }
};

/* ── user management ─────────────────────────────────────── */

exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role } = req.query;
    const query = {};
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (role)   query.role = role;

    const result = await paginate(User, query, { page, limit });
    res.json({ success: true, ...result, users: result.docs });
  } catch (err) { next(err); }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const [predictions, chats] = await Promise.all([
      Prediction.countDocuments({ user: user._id }),
      Chat.countDocuments({ user: user._id }),
    ]);
    res.json({ success: true, user, stats: { predictions, chats } });
  } catch (err) { next(err); }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });

    user.isActive = !user.isActive;
    await user.save();
    logger.info(`[ADMIN] ${req.user.email} toggled user ${user.email} → ${user.isActive ? 'active' : 'inactive'}`);
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) { next(err); }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    logger.info(`[ADMIN] ${req.user.email} changed role of ${user.email} to ${role}`);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });

    await Promise.all([
      User.findByIdAndDelete(user._id),
      Prediction.deleteMany({ user: user._id }),
      Chat.deleteMany({ user: user._id }),
    ]);
    logger.warn(`[ADMIN] ${req.user.email} DELETED user ${user.email}`);
    res.json({ success: true, message: 'User and associated data deleted' });
  } catch (err) { next(err); }
};

/* ── disease management ──────────────────────────────────── */

exports.getAllDiseases = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', category } = req.query;
    const query = {};
    if (search)   query.$text = { $search: search };
    if (category) query.category = category;

    const result = await paginate(Disease, query, { page, limit, sort: { name: 1 } });
    res.json({ success: true, ...result, diseases: result.docs });
  } catch (err) { next(err); }
};

exports.createDisease = async (req, res, next) => {
  try {
    const disease = await Disease.create(req.body);
    logger.info(`[ADMIN] ${req.user.email} created disease: ${disease.name}`);
    res.status(201).json({ success: true, disease });
  } catch (err) { next(err); }
};

exports.updateDisease = async (req, res, next) => {
  try {
    const disease = await Disease.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!disease) return res.status(404).json({ success: false, message: 'Disease not found' });
    logger.info(`[ADMIN] ${req.user.email} updated disease: ${disease.name}`);
    res.json({ success: true, disease });
  } catch (err) { next(err); }
};

exports.deleteDisease = async (req, res, next) => {
  try {
    const disease = await Disease.findByIdAndDelete(req.params.id);
    if (!disease) return res.status(404).json({ success: false, message: 'Disease not found' });
    logger.warn(`[ADMIN] ${req.user.email} deleted disease: ${disease.name}`);
    res.json({ success: true, message: 'Disease deleted' });
  } catch (err) { next(err); }
};

/* ── prediction logs ─────────────────────────────────────── */

exports.getPredictionLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, userId } = req.query;
    const query = userId ? { user: userId } : {};
    const result = await paginate(Prediction, query, {
      page, limit,
      populate: { path: 'user', select: 'name email' },
    });
    res.json({ success: true, ...result, predictions: result.docs });
  } catch (err) { next(err); }
};

/* ── chat logs ───────────────────────────────────────────── */

exports.getChatLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const result = await paginate(Chat, {}, {
      page, limit,
      populate: { path: 'user', select: 'name email' },
    });
    res.json({ success: true, ...result, chats: result.docs });
  } catch (err) { next(err); }
};

/* ── server log reader ───────────────────────────────────── */

exports.getServerLogs = async (req, res, next) => {
  try {
    const logFile = path.join(process.cwd(), 'logs', 'combined.log');
    if (!fs.existsSync(logFile)) return res.json({ success: true, logs: [] });

    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
    const last  = lines.slice(-200).reverse();   // last 200 lines, newest first
    res.json({ success: true, logs: last });
  } catch (err) { next(err); }
};
