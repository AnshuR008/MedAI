const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  aliases: [String],
  icd10Code: String,
  category: {
    type: String,
    enum: ['cardiovascular', 'respiratory', 'digestive', 'neurological', 'infectious',
           'endocrine', 'musculoskeletal', 'dermatological', 'mental_health', 'other']
  },
  description: { type: String, required: true },
  symptoms: [{ type: String, trim: true }],
  causes: [String],
  riskFactors: [String],
  medications: [{
    name: String,
    type: String,
    dosage: String,
    notes: String
  }],
  precautions: [String],
  dietPlan: [{
    recommendation: String,
    type: { type: String, enum: ['recommended', 'avoid'] }
  }],
  exercises: [{
    name: String,
    duration: String,
    frequency: String,
    notes: String
  }],
  whenToSeeDoctor: [String],
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'] },
  isContagious: Boolean,
  affectedAgeGroups: [String],
  searchCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

diseaseSchema.index({ name: 'text', aliases: 'text', symptoms: 'text' });
diseaseSchema.index({ category: 1, severity: 1 });

module.exports = mongoose.model('Disease', diseaseSchema);
