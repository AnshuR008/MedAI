'use strict';
const rateLimit = require('express-rate-limit');
const logger    = require('../utils/logger');

const passthrough = (_req, _res, next) => next();

if (process.env.NODE_ENV === 'test') {
  module.exports = { authLimiter:passthrough, loginThrottle:passthrough, apiLimiter:passthrough, predictionLimiter:passthrough, chatLimiter:passthrough, adminLimiter:passthrough };
} else {
  const authLimiter = rateLimit({ windowMs:15*60*1000, max:10, standardHeaders:true, legacyHeaders:false,
    handler:(req,res)=>{ logger.warn(`[RATE][AUTH] ${req.ip}`); res.status(429).json({success:false,message:'Too many attempts. Try again in 15 minutes.'}); }});
  const loginThrottle = rateLimit({ windowMs:5*60*1000, max:5, standardHeaders:true, legacyHeaders:false,
    handler:(req,res)=>{ logger.warn(`[RATE][LOGIN] ${req.ip}`); res.status(429).json({success:false,message:'Account locked. Try in 5 min.'}); }});
  const apiLimiter = rateLimit({ windowMs:60*1000, max:120, standardHeaders:true, legacyHeaders:false,
    handler:(_,res)=>res.status(429).json({success:false,message:'Too many requests.'})});
  const predictionLimiter = rateLimit({ windowMs:60*1000, max:15, standardHeaders:true, legacyHeaders:false,
    handler:(_,res)=>res.status(429).json({success:false,message:'Prediction rate limit reached.'})});
  const chatLimiter = rateLimit({ windowMs:60*1000, max:30, standardHeaders:true, legacyHeaders:false,
    handler:(_,res)=>res.status(429).json({success:false,message:'Chat rate limit reached.'})});
  const adminLimiter = rateLimit({ windowMs:60*1000, max:200, standardHeaders:true, legacyHeaders:false });
  module.exports = { authLimiter, loginThrottle, apiLimiter, predictionLimiter, chatLimiter, adminLimiter };
}
