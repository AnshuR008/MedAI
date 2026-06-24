'use strict';
/**
 * tests/prediction.test.js
 * Prediction service unit tests + prediction API endpoint tests.
 */

jest.mock('mongoose', () => ({ ...jest.requireActual('mongoose'), connect: jest.fn().mockResolvedValue({ connection:{ host:'test' } }) }));
jest.mock('../config/database', () => jest.fn().mockResolvedValue(true));
jest.mock('../server/utils/logger', () => ({ info:jest.fn(), warn:jest.fn(), error:jest.fn(), debug:jest.fn() }));

const makeUser = (o={}) => ({ _id:'uid1', name:'Test', email:'t@t.com', role:'user', isActive:true, ...o });

jest.mock('../server/models/User',        () => ({ findOne:jest.fn(), findById:jest.fn(), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),skip:jest.fn().mockResolvedValue([])}), aggregate:jest.fn().mockResolvedValue([]) }));
jest.mock('../server/models/HealthProfile',()=>({ findOne:jest.fn().mockResolvedValue(null), create:jest.fn().mockResolvedValue({}), findOneAndUpdate:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Prediction',  () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),skip:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), aggregate:jest.fn().mockResolvedValue([]), findByIdAndUpdate:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Chat',        () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),limit:jest.fn().mockReturnThis(),select:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), updateMany:jest.fn().mockResolvedValue({}) }));
jest.mock('../server/models/Report',      () => ({ create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0) }));
jest.mock('../server/models/Disease',     () => ({ find:jest.fn().mockReturnValue({sort:jest.fn().mockReturnThis(),skip:jest.fn().mockReturnThis(),limit:jest.fn().mockResolvedValue([])}), findOne:jest.fn().mockResolvedValue(null), create:jest.fn(), countDocuments:jest.fn().mockResolvedValue(0), aggregate:jest.fn().mockResolvedValue([]) }));

const PredictionService = require('../server/services/predictionService');
const request           = require('supertest');
const jwt               = require('jsonwebtoken');
const User              = require('../server/models/User');
const Prediction        = require('../server/models/Prediction');

process.env.JWT_SECRET = 'test_secret_32chars_minimum_length';
process.env.NODE_ENV   = 'test';

// ── PredictionService unit tests ──────────────────────────

describe('PredictionService.predictDisease()', () => {
  test('returns predictions array', () => {
    const r = PredictionService.predictDisease(['fever','cough','headache']);
    expect(r.predictions).toBeInstanceOf(Array);
    expect(r.predictions.length).toBeGreaterThan(0);
  });

  test('each prediction has disease + probability', () => {
    const r = PredictionService.predictDisease(['fever','fatigue','body aches']);
    r.predictions.forEach(p => {
      expect(p.disease).toBeDefined();
      expect(typeof p.probability).toBe('number');
    });
  });

  test('probabilities are 0–100', () => {
    const r = PredictionService.predictDisease(['headache','nausea','light sensitivity']);
    r.predictions.forEach(p => {
      expect(p.probability).toBeGreaterThanOrEqual(0);
      expect(p.probability).toBeLessThanOrEqual(100);
    });
  });

  test('predictions sorted descending by probability', () => {
    const r = PredictionService.predictDisease(['runny nose','sneezing','cough','sore throat']);
    for (let i = 1; i < r.predictions.length; i++) {
      expect(r.predictions[i-1].probability).toBeGreaterThanOrEqual(r.predictions[i].probability);
    }
  });

  test('identifies diabetes from classic symptoms', () => {
    const r = PredictionService.predictDisease(['frequent urination','excessive thirst','fatigue','blurred vision']);
    expect(r.predictions[0].disease.toLowerCase()).toContain('diabetes');
  });

  test('primary diagnosis has medications array', () => {
    const r = PredictionService.predictDisease(['fever','cough']);
    expect(r.primaryDiagnosis.medications).toBeInstanceOf(Array);
  });

  test('primary diagnosis has precautions array', () => {
    const r = PredictionService.predictDisease(['fever','cough']);
    expect(r.primaryDiagnosis.precautions).toBeInstanceOf(Array);
  });

  test('primary diagnosis has diet plan', () => {
    const r = PredictionService.predictDisease(['stomach pain','nausea']);
    expect(r.primaryDiagnosis.dietPlan).toBeInstanceOf(Array);
  });

  test('handles unknown symptoms gracefully', () => {
    const r = PredictionService.predictDisease(['xyz_unknown_123']);
    expect(r.primaryDiagnosis).toBeDefined();
    expect(r.predictions).toBeInstanceOf(Array);
  });

  test('handles empty symptoms array', () => {
    const r = PredictionService.predictDisease([]);
    expect(r).toBeDefined();
  });
});

describe('PredictionService.getDiseaseInfo()', () => {
  test('returns data for known disease', () => {
    const d = PredictionService.getDiseaseInfo('diabetes');
    expect(d).not.toBeNull();
    expect(d.symptoms).toBeInstanceOf(Array);
  });

  test('returns null for unknown disease', () => {
    expect(PredictionService.getDiseaseInfo('completelyunknowndisease')).toBeNull();
  });
});

describe('PredictionService.getAllDiseases()', () => {
  test('returns array of diseases', () => {
    const list = PredictionService.getAllDiseases();
    expect(list).toBeInstanceOf(Array);
    expect(list.length).toBeGreaterThan(5);
  });

  test('each has name, category, severity', () => {
    PredictionService.getAllDiseases().forEach(d => {
      expect(d.name).toBeDefined();
      expect(d.category).toBeDefined();
      expect(d.severity).toBeDefined();
    });
  });
});

// ── Prediction API endpoint tests ─────────────────────────

describe('POST /api/predict', () => {
  let app, token;

  beforeAll(() => {
    app   = require('../server').app;
    token = jwt.sign({ id:'uid1' }, process.env.JWT_SECRET);
    User.findById.mockResolvedValue(makeUser());
  });

  afterEach(() => jest.clearAllMocks());

  test('requires authentication', async () => {
    const r = await request(app).post('/api/predict').set('Accept','application/json').send({ symptoms:['fever'] });
    expect([401,302]).toContain(r.status);
  });

  test('rejects empty symptoms', async () => {
    const r = await request(app).post('/api/predict')
      .set('Authorization',`Bearer ${token}`).send({ symptoms:[] });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  test('rejects missing symptoms field', async () => {
    const r = await request(app).post('/api/predict')
      .set('Authorization',`Bearer ${token}`).send({});
    expect(r.status).toBe(400);
  });

  test('returns predictions for valid symptoms', async () => {
    Prediction.create.mockResolvedValue({
      _id:'pred1', symptoms:['fever','cough'],
      predictions:[{ disease:'Influenza', probability:80, severity:'moderate' }],
      primaryDiagnosis:{ disease:'Influenza', probability:80, medications:['Paracetamol'], precautions:[], dietPlan:[], exercises:[] },
    });
    const r = await request(app).post('/api/predict')
      .set('Authorization',`Bearer ${token}`).send({ symptoms:['fever','cough','body aches'] });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.prediction.predictions).toBeInstanceOf(Array);
  });

  test('accepts comma-string symptoms', async () => {
    Prediction.create.mockResolvedValue({ _id:'p2', symptoms:['fever'], predictions:[{ disease:'X', probability:50, severity:'mild' }], primaryDiagnosis:{ disease:'X', probability:50, medications:[], precautions:[], dietPlan:[], exercises:[] } });
    const r = await request(app).post('/api/predict')
      .set('Authorization',`Bearer ${token}`).send({ symptoms:'fever,headache' });
    expect(r.status).toBe(200);
  });
});

describe('GET /api/history', () => {
  let app, token;
  beforeAll(() => {
    app   = require('../server').app;
    token = jwt.sign({ id:'uid1' }, process.env.JWT_SECRET);
    User.findById.mockResolvedValue(makeUser());
  });

  test('requires auth', async () => {
    const r = await request(app).get('/api/history').set('Accept','application/json');
    expect([401,302]).toContain(r.status);
  });

  test('returns predictions array with auth', async () => {
    Prediction.find.mockReturnValue({ sort:jest.fn().mockReturnThis(), skip:jest.fn().mockReturnThis(), limit:jest.fn().mockResolvedValue([{ _id:'p1', symptoms:['fever'], primaryDiagnosis:{ disease:'Flu' }, predictions:[], createdAt:new Date() }]) });
    Prediction.countDocuments.mockResolvedValue(1);
    const r = await request(app).get('/api/history').set('Authorization',`Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.predictions).toBeInstanceOf(Array);
  });
});
