const mongoose = require('mongoose');

const medicationReminderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicationName: { type: String, required: true, trim: true },
  dosage: { type: String, trim: true },
  frequency: { type: String, enum: ['once_daily', 'twice_daily', 'three_times', 'four_times', 'weekly', 'as_needed'], default: 'once_daily' },
  times: [{ type: String }], // e.g. ["08:00", "20:00"]
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  notes: { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#00b4d8' }
}, { timestamps: true });

medicationReminderSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('MedicationReminder', medicationReminderSchema);
