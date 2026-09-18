const mongoose = require('mongoose');
const { app } = require('../server');
const connectDB = require('../config/database');

let databasePromise;

function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  databasePromise ??= connectDB().catch((error) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDatabaseConnection();
    return app(req, res);
  } catch (error) {
    console.error('Serverless startup failed:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection is unavailable. Check MONGODB_URI in deployment settings.'
    });
  }
};
