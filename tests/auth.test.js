'use strict';
/**
 * tests/auth.test.js
 * Authentication: register, login, token verification, logout.
 */

jest.mock('mongoose', () => ({ ...jest.requireActual('mongoose'), connect: jest.fn().mockResolvedValue({ connection: { host: 'test' } }) }));
jest.mock('../config/database', () => jest.fn().mockResolvedValue(true));
jest.mock('../server/utils/logger', () => ({ info:jest.fn(), warn:jest.fn(), error:jest.fn(), debug:jest.fn() }));

const makeUser = (overrides = {}) => ({
  _id: 'uid123', name: 'Test User', email: 'test@test.com',
  role: 'user', isActive: true, isVerified: true, loginCount: 0,
  comparePassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(true),
  toJSON: () => ({ _id:'uid123', name:'Test User', email:'test@test.com', role:'user' }),
  ...overrides,
});

jest.mock('../server/models/User', () => ({
  findOne:          jest.fn(),
  findById:         jest.fn(),
  create:           jest.fn(),
  findByIdAndUpdate:jest.fn(),
  countDocuments:   jest.fn().mockResolvedValue(0),
  find:             jest.fn().mockReturnValue({ sort:jest.fn().mockReturnThis(), limit:jest.fn().mockReturnThis(), skip:jest.fn().mockResolvedValue([]) }),
  aggregate:        jest.fn().mockResolvedValue([]),
}));
jest.mock('../server/models/HealthProfile', () => ({
  findOne:          jest.fn().mockResolvedValue(null),
  create:           jest.fn().mockResolvedValue({ _id:'hpid' }),
  findOneAndUpdate: jest.fn().mockResolvedValue({}),
}));
jest.mock('../server/models/Prediction', () => ({
  find: jest.fn().mockReturnValue({ sort:jest.fn().mockReturnThis(), skip:jest.fn().mockReturnThis(), limit:jest.fn().mockResolvedValue([]) }),
  create: jest.fn(), countDocuments: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue([]),
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
}));
jest.mock('../server/models/Chat', () => ({
  find: jest.fn().mockReturnValue({ sort:jest.fn().mockReturnThis(), limit:jest.fn().mockReturnThis(), select:jest.fn().mockResolvedValue([]) }),
  findOne: jest.fn().mockResolvedValue(null), create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0), updateMany: jest.fn().mockResolvedValue({}),
}));
jest.mock('../server/models/Report',  () => ({ create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0) }));
jest.mock('../server/models/Disease', () => ({
  find: jest.fn().mockReturnValue({ sort:jest.fn().mockReturnThis(), skip:jest.fn().mockReturnThis(), limit:jest.fn().mockResolvedValue([]) }),
  findOne: jest.fn().mockResolvedValue(null), create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue([]),
}));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const User    = require('../server/models/User');

process.env.JWT_SECRET  = 'test_secret_32chars_minimum_length';
process.env.NODE_ENV    = 'test';

let app;
beforeAll(() => { app = require('../server').app; });
afterEach(() => jest.clearAllMocks());

// ── Register ──────────────────────────────────────────────

describe('POST /api/register', () => {
  test('rejects missing name', async () => {
    const r = await request(app).post('/api/register').send({ email:'a@b.com', password:'pass123' });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  test('rejects invalid email', async () => {
    const r = await request(app).post('/api/register').send({ name:'Test', email:'bad', password:'pass123' });
    expect(r.status).toBe(400);
  });

  test('rejects password < 6 chars', async () => {
    const r = await request(app).post('/api/register').send({ name:'Test', email:'a@b.com', password:'123' });
    expect(r.status).toBe(400);
  });

  test('rejects duplicate email', async () => {
    User.findOne.mockResolvedValue(makeUser());
    const r = await request(app).post('/api/register').send({ name:'Test', email:'test@test.com', password:'pass123' });
    expect(r.status).toBe(409);
  });

  test('registers successfully with valid data', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(makeUser());
    const r = await request(app).post('/api/register').send({ name:'New User', email:'new@test.com', password:'pass123' });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    expect(r.body.token).toBeDefined();
  });

  test('returns user object without password', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(makeUser());
    const r = await request(app).post('/api/register').send({ name:'New User', email:'new@test.com', password:'pass123' });
    expect(r.body.user?.password).toBeUndefined();
  });
});

// ── Login ─────────────────────────────────────────────────

describe('POST /api/login', () => {
  test('rejects missing password', async () => {
    const r = await request(app).post('/api/login').send({ email:'test@test.com' });
    expect(r.status).toBe(400);
  });

  test('rejects invalid email format', async () => {
    const r = await request(app).post('/api/login').send({ email:'notanemail', password:'pass123' });
    expect(r.status).toBe(400);
  });

  test('rejects wrong password', async () => {
    const u = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(u) });
    const r = await request(app).post('/api/login').send({ email:'test@test.com', password:'wrong' });
    expect(r.status).toBe(401);
    expect(r.body.success).toBe(false);
  });

  test('rejects non-existent user', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const r = await request(app).post('/api/login').send({ email:'ghost@test.com', password:'pass123' });
    expect(r.status).toBe(401);
  });

  test('returns JWT on successful login', async () => {
    const u = makeUser({ save: jest.fn().mockResolvedValue(true) });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(u) });
    const r = await request(app).post('/api/login').send({ email:'test@test.com', password:'pass123' });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.token).toBeDefined();
    const decoded = jwt.verify(r.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('uid123');
  });

  test('rejects deactivated user', async () => {
    const u = makeUser({ isActive: false });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(u) });
    const r = await request(app).post('/api/login').send({ email:'test@test.com', password:'pass123' });
    expect(r.status).toBe(403);
  });
});

// ── Token verification ────────────────────────────────────

describe('GET /api/me (token verification)', () => {
  test('returns 401 with no token', async () => {
    const r = await request(app).get('/api/me').set('Accept','application/json');
    expect([401,302]).toContain(r.status);
  });

  test('returns 401 with malformed token', async () => {
    const r = await request(app).get('/api/me')
      .set('Authorization','Bearer not.a.token').set('Accept','application/json');
    expect([401,302]).toContain(r.status);
  });

  test('returns 401 with expired token', async () => {
    const expired = jwt.sign({ id:'uid123' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const r = await request(app).get('/api/me')
      .set('Authorization',`Bearer ${expired}`).set('Accept','application/json');
    expect([401,302]).toContain(r.status);
  });

  test('returns user data with valid token', async () => {
    const u = makeUser();
    User.findById.mockResolvedValue(u);
    const token = jwt.sign({ id:'uid123' }, process.env.JWT_SECRET, { expiresIn:'1h' });
    const r = await request(app).get('/api/me').set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });
});
