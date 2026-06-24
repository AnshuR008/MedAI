const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Chat = require('../models/Chat');
const Report = require('../models/Report');
const logger = require('../utils/logger');

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // User-specific analytics
    const totalPredictions = await Prediction.countDocuments({ user: userId });
    const totalChats = await Chat.countDocuments({ user: userId, isActive: true });
    const totalReports = await Report.countDocuments({ user: userId });

    // Top diseases predicted for this user
    const topDiseases = await Prediction.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$primaryDiagnosis.disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Daily prediction counts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyCounts = await Prediction.aggregate([
      { $match: { user: userId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Disease categories
    const categoryDistribution = await Prediction.aggregate([
      { $match: { user: userId } },
      { $unwind: '$predictions' },
      { $group: { _id: '$predictions.severity', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      analytics: {
        totalPredictions,
        totalChats,
        totalReports,
        topDiseases: topDiseases.map(d => ({ disease: d._id, count: d.count })),
        dailyCounts: dailyCounts.map(d => ({ date: d._id, count: d.count })),
        categoryDistribution: categoryDistribution.map(c => ({ category: c._id, count: c.count }))
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalPredictions, totalChats, activeUsersToday] = await Promise.all([
      User.countDocuments(),
      Prediction.countDocuments(),
      Chat.countDocuments(),
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Top diseases globally
    const topDiseases = await Prediction.aggregate([
      { $group: { _id: '$primaryDiagnosis.disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Daily signups last 14 days
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: twoWeeksAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Daily predictions last 14 days
    const dailyPredictions = await Prediction.aggregate([
      { $match: { createdAt: { $gte: twoWeeksAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt lastLogin loginCount');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPredictions,
        totalChats,
        activeUsersToday,
        topDiseases: topDiseases.map(d => ({ disease: d._id || 'Unknown', count: d.count })),
        dailySignups: dailySignups.map(d => ({ date: d._id, count: d.count })),
        dailyPredictions: dailyPredictions.map(d => ({ date: d._id, count: d.count })),
        recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      users,
      pagination: { current: page, total: Math.ceil(total / limit), count: total }
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`Admin ${req.user.email} toggled user ${user.email} to ${user.isActive ? 'active' : 'inactive'}`);
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};
