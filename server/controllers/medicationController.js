'use strict';
const MedicationReminder = require('../models/MedicationReminder');
const logger = require('../utils/logger');

exports.getReminders = async (req, res, next) => {
  try {
    const reminders = await MedicationReminder.find({ user: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, reminders });
  } catch (e) { next(e); }
};

exports.createReminder = async (req, res, next) => {
  try {
    const { medicationName, dosage, frequency, times, startDate, endDate, notes, color } = req.body;
    const reminder = await MedicationReminder.create({
      user: req.user._id, medicationName, dosage, frequency,
      times: times || [], startDate, endDate, notes, color
    });
    logger.info(`Medication reminder created for ${req.user.email}: ${medicationName}`);
    res.status(201).json({ success: true, reminder });
  } catch (e) { next(e); }
};

exports.updateReminder = async (req, res, next) => {
  try {
    const reminder = await MedicationReminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, reminder });
  } catch (e) { next(e); }
};

exports.deleteReminder = async (req, res, next) => {
  try {
    const reminder = await MedicationReminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, message: 'Reminder removed' });
  } catch (e) { next(e); }
};
