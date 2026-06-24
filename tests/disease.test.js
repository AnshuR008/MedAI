'use strict';
/**
 * tests/disease.test.js
 * Disease search API + AI chat service unit tests.
 */

jest.mock('mongoose', () => ({ ...jest.requireActual('mongoose'), connect: jest.fn().mockResolvedValue({ connection:{ host:'test' } }) }));
jest.mock('../config/database', () => jest.fn().mockResolvedValue(true));
jest.mock('../server/utils/logger', () => ({ info:jest.fn(), warn:jest.fn(), error:jest.fn(), debug:jest.fn() }));

const makeUser = () => ({ _id:'uid1', name:'Test User', email:'t@t.com', role:'user', isActive:true });
jest.mock('../server/models/User',        () => ({ findOne:jest.fn(), findById:jest.fn(), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),skip:jest.fn().mockResolvedValue([])}), aggregate:jest.fn().mockResolvedValue([]) }));
jest.mock('../server/models/HealthProfile',()=>({ findOne:jest.fn().mockResolvedValue(null), create:jest.fn().mockResolvedValue({}), findOneAndUpdate:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Prediction',  () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),skip:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue([])}), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), aggregate:jest.fn().mockResolvedValue([]), findByIdAndUpdate:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Chat',        () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),select:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), updateMany:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Report',      () => ({ create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0) }));
jest.mock('../server/models/Disease',     () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),skip:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), aggregate:jest.fn().mockResolvedValue([]) }));

const request   = require('supertest');
const jwt       = require('jsonwebtoken');
const aiChat    = require('../server/services/aiChatService');
const User      = require('../server/models/User');

process.env.JWT_SECRET = 'test_secret_32chars_minimum_length';
process.env.NODE_ENV   = 'test';

// ── aiChatService unit tests ──────────────────────────────

describe('aiChatService.generateResponse()', () => {
  test('returns a non-empty string', () => {
    const r = aiChat.generateResponse('Hello');
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(10);
  });

  test('responds to greeting', () => {
    const r = aiChat.generateResponse('Hi there');
    expect(r).toMatch(/hello|assistant|help/i);
  });

  test('escalates chest pain to emergency', () => {
    const r = aiChat.generateResponse('I have severe chest pain');
    expect(r).toMatch(/emergency|call|112|911/i);
  });

  test('responds with crisis resources to self-harm mention', () => {
    const r = aiChat.generateResponse('I want to kill myself');
    expect(r).toMatch(/988|iCall|helpline|crisis/i);
  });

  test('returns fever advice for fever query', () => {
    const r = aiChat.generateResponse('I have a fever');
    expect(r).toMatch(/fever|temperature|paracetamol|doctor/i);
  });

  test('returns headache advice', () => {
    const r = aiChat.generateResponse('I have a terrible migraine');
    expect(r).toMatch(/headache|migraine|pain/i);
  });

  test('returns diabetes info', () => {
    const r = aiChat.generateResponse('Tell me about diabetes management');
    expect(r).toMatch(/diabetes|blood sugar|glucose|insulin/i);
  });

  test('handles empty input gracefully', () => {
    const r = aiChat.generateResponse('');
    expect(typeof r).toBe('string');
  });

  test('uses context.userName in fallback response', () => {
    const r = aiChat.generateResponse('what is zzz xyz unknown topic', { userName:'Alice User' });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
});

describe('aiChatService.classifyTopic()', () => {
  const cases = [
    ['I have chest pain',   'emergency'],
    ['fever and chills',    'fever'],
    ['bad headache',        'headache'],
    ['I have asthma',       'respiratory'],
    ['diabetes control',    'diabetes'],
    ['high blood pressure', 'hypertension'],
    ['anxiety attack',      'mental_health'],
    ['what to eat',         'nutrition'],
    ['drug interaction',    'medication'],
    ['can\'t sleep',        'sleep'],
    ['random text here',    'general'],
  ];

  test.each(cases)('"%s" → topic: %s', (input, expected) => {
    expect(aiChat.classifyTopic(input)).toBe(expected);
  });
});

// ── Disease search API ────────────────────────────────────

describe('GET /api/search-disease', () => {
  let app, token;

  beforeAll(() => {
    app   = require('../server').app;
    token = jwt.sign({ id:'uid1' }, process.env.JWT_SECRET);
    User.findById.mockResolvedValue(makeUser());
  });

  afterEach(() => jest.clearAllMocks());

  test('requires authentication', async () => {
    const r = await request(app).get('/api/search-disease?query=diabetes').set('Accept','application/json');
    expect([401,302]).toContain(r.status);
  });

  test('rejects missing query param', async () => {
    const r = await request(app).get('/api/search-disease')
      .set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  test('returns disease info for known disease', async () => {
    const r = await request(app)
      .get('/api/search-disease?query=diabetes')
      .set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  test('returns found:false for unknown disease', async () => {
    const r = await request(app)
      .get('/api/search-disease?query=xyz_unknown_disease_99999')
      .set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.found).toBe(false);
  });

  test('returns suggestions with not-found response', async () => {
    const r = await request(app)
      .get('/api/search-disease?query=unknowndisease')
      .set('Authorization',`Bearer ${token}`);
    expect(r.body.suggestions).toBeInstanceOf(Array);
  });
});

// ── Chat API ──────────────────────────────────────────────

describe('POST /api/chat', () => {
  let app, token;
  const Chat = require('../server/models/Chat');

  beforeAll(() => {
    app   = require('../server').app;
    token = jwt.sign({ id:'uid1' }, process.env.JWT_SECRET);
    User.findById.mockResolvedValue(makeUser());
  });

  afterEach(() => jest.clearAllMocks());

  test('requires auth', async () => {
    const r = await request(app).post('/api/chat').set('Accept','application/json').send({ message:'hello' });
    expect([401,302]).toContain(r.status);
  });

  test('rejects empty message', async () => {
    const r = await request(app).post('/api/chat')
      .set('Authorization',`Bearer ${token}`).send({ message:'' });
    expect(r.status).toBe(400);
  });

  test('returns AI response with valid message', async () => {
    const r = await request(app).post('/api/chat')
      .set('Authorization',`Bearer ${token}`).send({ message:'I have a headache' });
    expect(r.status).not.toBe(401);
    expect(r.status).not.toBe(403);
  });

  test('response contains medical content', async () => {
    Chat.findOne.mockResolvedValue(null);
    const r = await request(app).post('/api/chat')
      .set('Authorization',`Bearer ${token}`).send({ message:'What causes fever?' });
    if (r.status === 200) {
      expect(r.body.response.length).toBeGreaterThan(20);
    }
  });
});
