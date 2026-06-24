/**
 * analyticsService.js
 * Pure-function service — all MongoDB aggregations for the analytics dashboard.
 * No Express objects here; controllers call these and format the HTTP response.
 */

'use strict';

const User       = require('../models/User');
const Prediction = require('../models/Prediction');
const Chat       = require('../models/Chat');
const Disease    = require('../models/Disease');
const Report     = require('../models/Report');

/* ── helpers ─────────────────────────────────────────────── */

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

const fillDates = (data, days) => {
  const map = Object.fromEntries(data.map((d) => [d.date, d.count]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: map[key] || 0 };
  });
};

/* ── user analytics ──────────────────────────────────────── */

const getUserStats = async () => {
  const [total, activeToday, roleCounts, registrationTrend] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastLogin: { $gte: daysAgo(1) } }),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { createdAt: { $gte: daysAgo(30) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]),
  ]);

  return {
    total,
    activeToday,
    byRole: Object.fromEntries(roleCounts.map((r) => [r._id, r.count])),
    registrationTrend: fillDates(registrationTrend, 30),
  };
};

/* ── prediction analytics ────────────────────────────────── */

const getPredictionStats = async () => {
  const [total, dailyTrend, topDiseases, bySeverity, byInputMethod] = await Promise.all([
    Prediction.countDocuments(),

    Prediction.aggregate([
      { $match: { createdAt: { $gte: daysAgo(30) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]),

    Prediction.aggregate([
      { $group: { _id: '$primaryDiagnosis.disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { disease: '$_id', count: 1, _id: 0 } },
    ]),

    Prediction.aggregate([
      { $unwind: '$predictions' },
      { $group: { _id: '$predictions.severity', count: { $sum: 1 } } },
      { $project: { severity: '$_id', count: 1, _id: 0 } },
    ]),

    Prediction.aggregate([
      { $group: { _id: '$inputMethod', count: { $sum: 1 } } },
      { $project: { method: '$_id', count: 1, _id: 0 } },
    ]),
  ]);

  return {
    total,
    dailyTrend:   fillDates(dailyTrend, 30),
    topDiseases:  topDiseases.filter((d) => d.disease),
    bySeverity,
    byInputMethod,
  };
};

/* ── disease search analytics ────────────────────────────── */

const getDiseaseStats = async () => {
  const [dbTotal, topSearched, byCategory] = await Promise.all([
    Disease.countDocuments(),

    Disease.find({}, 'name searchCount category')
      .sort({ searchCount: -1 })
      .limit(10),

    Disease.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalSearches: { $sum: '$searchCount' } } },
      { $sort: { totalSearches: -1 } },
      { $project: { category: '$_id', count: 1, totalSearches: 1, _id: 0 } },
    ]),
  ]);

  return {
    dbTotal,
    topSearched: topSearched.map((d) => ({ name: d.name, count: d.searchCount, category: d.category })),
    byCategory,
  };
};

/* ── full admin summary ──────────────────────────────────── */

const getAdminSummary = async () => {
  const [users, predictions, chats, reports] = await Promise.all([
    getUserStats(),
    getPredictionStats(),
    Chat.countDocuments(),
    Report.countDocuments(),
  ]);

  return { users, predictions, chats, reports };
};

/* ── recent activity feed ────────────────────────────────── */

const getRecentActivity = async (limit = 20) => {
  const [recentPredictions, recentUsers] = await Promise.all([
    Prediction.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name email')
      .select('primaryDiagnosis.disease symptoms createdAt'),
    User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name email role createdAt lastLogin loginCount isActive'),
  ]);

  return { recentPredictions, recentUsers };
};

module.exports = {
  getUserStats,
  getPredictionStats,
  getDiseaseStats,
  getAdminSummary,
  getRecentActivity,
};
