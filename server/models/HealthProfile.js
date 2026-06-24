const mongoose = require('mongoose');

const healthProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  age: { type: Number, min: 0, max: 150 },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  weight: { type: Number, min: 0 }, // in kg
  height: { type: Number, min: 0 }, // in cm
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']
  },
  allergies: [{ type: String, trim: true }],
  existingConditions: [{ type: String, trim: true }],
  currentMedications: [{ type: String, trim: true }],
  lifestyleHabits: {
    smoking: { type: Boolean, default: false },
    alcohol: { type: Boolean, default: false },
    exerciseFrequency: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'sedentary'
    },
    diet: {
      type: String,
      enum: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other'],
      default: 'omnivore'
    },
    sleepHours: { type: Number, min: 0, max: 24 }
  },
  bmi: { type: Number },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Auto-calculate BMI
healthProfileSchema.pre('save', function(next) {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  next();
});

module.exports = mongoose.model('HealthProfile', healthProfileSchema);
