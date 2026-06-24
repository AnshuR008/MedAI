const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: [{
    type: String,
    trim: true,
    required: true
  }],
  predictions: [{
    disease: { type: String, required: true },
    probability: { type: Number, min: 0, max: 100 },
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'] },
    description: String,
    icd10Code: String
  }],
  primaryDiagnosis: {
    disease: String,
    probability: Number,
    description: String,
    medications: [String],
    precautions: [String],
    dietPlan: [String],
    exercises: [String],
    whenToSeeDoctor: String
  },
  inputMethod: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text'
  },
  sessionId: String,
  reportGenerated: { type: Boolean, default: false }
}, {
  timestamps: true
});

predictionSchema.index({ user: 1, createdAt: -1 });
predictionSchema.index({ 'primaryDiagnosis.disease': 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
