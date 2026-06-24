const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prediction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prediction'
  },
  reportId: { type: String, unique: true },
  patientDetails: {
    name: String,
    age: Number,
    gender: String,
    bloodGroup: String,
    bmi: Number
  },
  symptoms: [String],
  diagnosis: {
    disease: String,
    probability: Number,
    description: String,
    severity: String
  },
  medications: [String],
  precautions: [String],
  dietPlan: [String],
  exercises: [String],
  generatedAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
