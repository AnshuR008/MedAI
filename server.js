require('dotenv').config();
const express       = require('express');
const http          = require('http');
const socketIO      = require('socket.io');
const path          = require('path');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const cookieParser  = require('cookie-parser');
const session       = require('express-session');

const connectDB      = require('./config/database');
const apiRoutes      = require('./server/routes/api');
const adminRoutes    = require('./server/routes/adminRoutes');
const chatRoutes     = require('./server/routes/chatRoutes');
const pageRoutes     = require('./server/routes/pages');
const { errorHandler, notFound } = require('./server/middlewares/errorHandler');
const { helmetConfig, xssClean, noSqlSanitize } = require('./server/middlewares/securityMiddleware');
const { apiLimiter } = require('./server/middlewares/rateLimiter');
const logger         = require('./server/utils/logger');
const aiChat         = require('./server/services/aiChatService');

const app    = express();
const server = http.createServer(app);
const io     = socketIO(server, { cors: { origin: '*', methods: ['GET','POST'] } });

/* ── security ─────────────────────────────────────────────── */
app.use(helmet(helmetConfig));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

/* ── body / cookie ────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(xssClean);
app.use(noSqlSanitize);

/* ── sessions ─────────────────────────────────────────────── */
app.use(session({
  secret:            process.env.SESSION_SECRET || 'medai_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 7*24*60*60*1000 },
}));

/* ── logging ──────────────────────────────────────────────── */
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

/* ── view engine ──────────────────────────────────────────── */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Layout support
app.use((req, res, next) => {
  const orig = res.render.bind(res);
  res.render = (view, opts = {}, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    const layout = opts.layout;
    if (!layout) return orig(view, opts, cb);
    orig(view, { ...opts, layout: false }, (err, body) => {
      if (err) return next(err);
      orig(layout, { ...opts, body, layout: false }, cb || ((e2, html) => {
        if (e2) return next(e2);
        res.send(html);
      }));
    });
  };
  next();
});

/* ── static ───────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── routes ───────────────────────────────────────────────── */
app.use('/api',        apiLimiter, apiRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/chat',   chatRoutes);
app.use('/',           pageRoutes);

/* ── socket.io ────────────────────────────────────────────── */
io.on('connection', (socket) => {
  socket.on('join-room', (userId) => socket.join(`user-${userId}`));
  socket.on('chat-message', async ({ message, userId }) => {
    if (!message || !userId) return;
    socket.emit('ai-typing', true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
    const response = aiChat.generateResponse(message);
    socket.emit('ai-typing', false);
    socket.emit('ai-response', { message: response, timestamp: new Date() });
  });
});

/* ── error handlers ───────────────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

/* ── startup ──────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await seedDemo();
  server.listen(PORT, () => logger.info(`MedAI running → http://localhost:${PORT}`));
};

async function seedDemo() {
  try {
    const User = require('./server/models/User');
    const HealthProfile = require('./server/models/HealthProfile');
    if (!await User.findOne({ email: 'demo@medai.com' })) {
      const u = await User.create({ name:'Demo User', email:'demo@medai.com', password:'demo123', isVerified:true });
      await HealthProfile.create({ user:u._id, age:32, gender:'male', weight:75, height:178, bloodGroup:'O+' });
      logger.info('Demo user seeded: demo@medai.com / demo123');
    }
    if (!await User.findOne({ email: 'admin@medai.com' })) {
      const a = await User.create({ name:'Admin User', email:'admin@medai.com', password:'admin123', role:'admin', isVerified:true });
      await HealthProfile.create({ user:a._id });
      logger.info('Admin user seeded: admin@medai.com / admin123');
    }
  } catch(e) { logger.warn(`Seed warning: ${e.message}`); }
}

if (require.main === module && process.env.NODE_ENV !== 'test') start();
module.exports = { app, server, start };
