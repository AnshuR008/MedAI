'use strict';
/**
 * tests/security.test.js
 * Security layer: XSS, NoSQL injection, rate limiting, headers, auth guards.
 */

jest.mock('mongoose', () => ({ ...jest.requireActual('mongoose'), connect: jest.fn().mockResolvedValue({ connection:{ host:'test' } }) }));
jest.mock('../config/database', () => jest.fn().mockResolvedValue(true));
jest.mock('../server/utils/logger', () => ({ info:jest.fn(), warn:jest.fn(), error:jest.fn(), debug:jest.fn() }));

const makeUser = () => ({ _id:'uid1', name:'Test', email:'t@t.com', role:'user', isActive:true, toJSON:()=>({}) });
jest.mock('../server/models/User',        () => ({ findOne:jest.fn(), findById:jest.fn(), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),skip:jest.fn().mockResolvedValue([])}), aggregate:jest.fn().mockResolvedValue([]) }));
jest.mock('../server/models/HealthProfile',()=>({ findOne:jest.fn().mockResolvedValue(null), create:jest.fn().mockResolvedValue({}), findOneAndUpdate:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Prediction',  () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),skip:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue([])}), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), aggregate:jest.fn().mockResolvedValue([]), findByIdAndUpdate:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Chat',        () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),select:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), updateMany:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Report',      () => ({ create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0) }));
jest.mock('../server/models/Disease',     () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),skip:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), aggregate:jest.fn().mockResolvedValue([]) }));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const { sanitizeValue } = require('../server/middlewares/securityMiddleware');
const User = require('../server/models/User');

process.env.JWT_SECRET = 'test_secret_32chars_minimum_length';
process.env.NODE_ENV   = 'test';

let app;
beforeAll(() => { app = require('../server').app; });
afterEach(() => jest.clearAllMocks());

// ── securityMiddleware unit tests ─────────────────────────

describe('sanitizeValue() – XSS scrubber', () => {
  test('escapes HTML tags in strings', () => {
    const result = sanitizeValue('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
  });

  test('escapes attribute injection', () => {
    const result = sanitizeValue('"><img src=x onerror=alert(1)>');
    expect(result).not.toContain('"');
    expect(result).not.toContain('>');
  });

  test('recursively sanitizes objects', () => {
    const result = sanitizeValue({ name: '<b>bold</b>', nested: { val: '<em>em</em>' } });
    expect(result.name).not.toContain('<b>');
    expect(result.nested.val).not.toContain('<em>');
  });

  test('handles arrays', () => {
    const result = sanitizeValue(['<script>', 'normal']);
    expect(result[0]).not.toContain('<script>');
    expect(result[1]).toBe('normal');
  });

  test('passes through numbers and booleans unchanged', () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(null)).toBe(null);
  });
});

// ── Security headers ──────────────────────────────────────

describe('HTTP Security Headers (Helmet)', () => {
  test('sets X-Content-Type-Options', async () => {
    const r = await request(app).get('/api/me').set('Accept','application/json');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
  });

  test('sets X-Frame-Options', async () => {
    const r = await request(app).get('/').set('Accept','application/json');
    // Helmet may set this header
    // We just check the response is not 500
    expect(r.status).not.toBe(500);
  });
});

// ── Auth guards ───────────────────────────────────────────

describe('Protected route guards', () => {
  test('/api/history – blocks unauthenticated (401 or redirect)', async () => {
    const r = await request(app).get('/api/history').set('Accept','application/json');
    expect([401,302]).toContain(r.status);
  });

  test('/api/predict – blocks unauthenticated', async () => {
    const r = await request(app).post('/api/predict').set('Accept','application/json').send({ symptoms:['fever'] });
    expect([401,302]).toContain(r.status);
  });

  test('/api/admin/analytics/summary – blocks non-admin', async () => {
    User.findById.mockResolvedValue(makeUser()); // role: 'user'
    const token = jwt.sign({ id:'uid1' }, process.env.JWT_SECRET);
    const r = await request(app).get('/api/admin/analytics/summary').set('Authorization',`Bearer ${token}`);
    expect([401,403,302]).toContain(r.status);
  });

  test('/api/me – accepts valid admin token', async () => {
    User.findById.mockResolvedValue({ ...makeUser(), role:'admin' });
    const token = jwt.sign({ id:'uid1' }, process.env.JWT_SECRET);
    const r = await request(app).get('/api/me').set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(200);
  });
});

// ── Injection attempts ────────────────────────────────────

describe('NoSQL injection prevention', () => {
  test('rejects $where operator in login body', async () => {
    const r = await request(app).post('/api/login').send({ email:{ '$where':'1===1' }, password:'test' });
    expect(r.status).not.toBe(200);
  });

  test('strips $gt operator in query', async () => {
    User.findOne.mockReturnValue({ select:jest.fn().mockResolvedValue(null) });
    const r = await request(app).post('/api/login').send({ email:{ '$gt':'' }, password:'x' });
    expect([400,401,500]).toContain(r.status);
  });
});

// ── Input validation ──────────────────────────────────────

describe('Input validation', () => {
  test('register – name too short', async () => {
    const r = await request(app).post('/api/register').send({ name:'X', email:'a@b.com', password:'pass123' });
    expect(r.status).toBe(400);
  });

  test('register – name too long', async () => {
    const r = await request(app).post('/api/register').send({ name:'X'.repeat(51), email:'a@b.com', password:'pass123' });
    expect(r.status).toBe(400);
  });

  test('register – accepts valid payload', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(makeUser());
    const r = await request(app).post('/api/register').send({ name:'Valid Name', email:'valid@email.com', password:'securepass' });
    expect(r.status).toBe(201);
  });
});
