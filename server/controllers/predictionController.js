const Prediction = require('../models/Prediction');
const HealthProfile = require('../models/HealthProfile');
const Report = require('../models/Report');
const PredictionService = require('../services/predictionService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

exports.predict = async (req, res, next) => {
  try {
    const { symptoms, inputMethod = 'text' } = req.body;

    if (!symptoms || (Array.isArray(symptoms) && symptoms.length === 0)) {
      return res.status(400).json({ success: false, message: 'Please provide symptoms' });
    }

    const symptomsList = Array.isArray(symptoms)
      ? symptoms
      : symptoms.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (symptomsList.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid symptoms' });
    }

    // Fetch health profile for personalized prediction
    const profile = await HealthProfile.findOne({ user: req.user._id });

    // Run AI prediction with health profile context
    const result = PredictionService.predictDisease(symptomsList, profile);

    // Save prediction
    const prediction = await Prediction.create({
      user: req.user._id,
      symptoms: symptomsList,
      predictions: result.predictions,
      primaryDiagnosis: result.primaryDiagnosis,
      inputMethod,
      sessionId: uuidv4()
    });

    logger.info(`Prediction made by user ${req.user.email}: ${result.primaryDiagnosis.disease}`);

    res.json({
      success: true,
      prediction: {
        id: prediction._id,
        symptoms: symptomsList,
        predictions: result.predictions,
        primaryDiagnosis: result.primaryDiagnosis
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [predictions, total] = await Promise.all([
      Prediction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prediction.countDocuments({ user: req.user._id })
    ]);

    res.json({
      success: true,
      predictions,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPrediction = async (req, res, next) => {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    res.json({ success: true, prediction });
  } catch (error) {
    next(error);
  }
};

exports.generateReport = async (req, res, next) => {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    const profile = await HealthProfile.findOne({ user: req.user._id });

    const report = await Report.create({
      user: req.user._id,
      prediction: prediction._id,
      reportId: `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      patientDetails: {
        name: req.user.name,
        age: profile?.age,
        gender: profile?.gender,
        bloodGroup: profile?.bloodGroup,
        bmi: profile?.bmi
      },
      symptoms: prediction.symptoms,
      diagnosis: {
        disease: prediction.primaryDiagnosis.disease,
        probability: prediction.primaryDiagnosis.probability,
        description: prediction.primaryDiagnosis.description,
        severity: prediction.predictions[0]?.severity
      },
      medications: prediction.primaryDiagnosis.medications,
      precautions: prediction.primaryDiagnosis.precautions,
      dietPlan: prediction.primaryDiagnosis.dietPlan,
      exercises: prediction.primaryDiagnosis.exercises
    });

    await Prediction.findByIdAndUpdate(prediction._id, { reportGenerated: true });

    logger.info(`Report generated: ${report.reportId} for user ${req.user.email}`);

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.searchDisease = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const diseaseInfo = PredictionService.getDiseaseInfo(query);

    if (!diseaseInfo) {
      return res.json({
        success: true,
        found: false,
        message: `No information found for "${query}". Try searching for common conditions like diabetes, hypertension, or influenza.`,
        suggestions: PredictionService.getAllDiseases().slice(0, 6).map(d => d.name)
      });
    }

    res.json({ success: true, found: true, disease: diseaseInfo });
  } catch (error) {
    next(error);
  }
};
