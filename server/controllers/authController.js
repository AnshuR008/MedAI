const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const HealthProfile = require('../models/HealthProfile');
const logger = require('../utils/logger');
const { securityAlert } = require('../middlewares/errorHandler');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const verificationToken = uuidv4();
    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      isVerified: true // Auto-verify for demo; in production send email
    });

    // Create empty health profile
    await HealthProfile.create({ user: user._id });

    const token = generateToken(user._id);
    setTokenCookie(res, token);
    if (req.session) req.session.token = token;

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      securityAlert('FAILED_LOGIN', `Failed login attempt for: ${email}`, req);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    if (!(await user.comparePassword(password))) {
      securityAlert('FAILED_LOGIN', `Failed login attempt for: ${email}`, req);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);
    if (req.session) req.session.token = token;

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  if (req.session) req.session.destroy();
  
  if (req.accepts('html')) {
    return res.redirect('/login?message=Logged out successfully');
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const profile = await HealthProfile.findOne({ user: req.user._id });
    res.json({ success: true, user, profile });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, age, gender, weight, height, bloodGroup, allergies, existingConditions } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, { name });
    
    const profileData = {
      age: age ? parseInt(age) : undefined,
      gender,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      bloodGroup,
      allergies: allergies ? (Array.isArray(allergies) ? allergies : allergies.split(',').map(a => a.trim())) : [],
      existingConditions: existingConditions ? (Array.isArray(existingConditions) ? existingConditions : existingConditions.split(',').map(c => c.trim())) : []
    };

    // Remove undefined values
    Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);

    await HealthProfile.findOneAndUpdate(
      { user: req.user._id },
      profileData,
      { upsert: true, new: true, runValidators: true }
    );

    logger.info(`Profile updated for user: ${req.user.email}`);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
