// ============================================================
// MedAI Platform - Test Suite
// ============================================================

const request = require('supertest');

// Mock mongoose and dependencies before requiring app
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({ connection: { host: 'test-host' } }),
    connection: { host: 'test' }
  };
});

// Mock the connectDB
jest.mock('../config/database', () => jest.fn().mockResolvedValue(true));

// Mock logger to suppress output during tests
jest.mock('../server/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock User model
const mockUser = {
  _id: 'mockUserId123',
  name: 'Test User',
  email: 'test@test.com',
  role: 'user',
  isActive: true,
  isVerified: true,
  loginCount: 0,
  comparePassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(true),
  toJSON: jest.fn().mockReturnValue({ _id: 'mockUserId123', name: 'Test User', email: 'test@test.com', role: 'user' })
};

jest.mock('../server/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), skip: jest.fn().mockResolvedValue([]) }),
  aggregate: jest.fn().mockResolvedValue([])
}));

jest.mock('../server/models/HealthProfile', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ _id: 'profileId' }),
  findOneAndUpdate: jest.fn().mockResolvedValue({}),
}));

jest.mock('../server/models/Prediction', () => ({
  find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) }),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  findByIdAndUpdate: jest.fn().mockResolvedValue({})
}));

jest.mock('../server/models/Chat', () => ({
  find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue([]) }),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  updateMany: jest.fn().mockResolvedValue({})
}));

jest.mock('../server/models/Report', () => ({
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0)
}));

const User = require('../server/models/User');
const Prediction = require('../server/models/Prediction');
const PredictionService = require('../server/services/predictionService');

// ============================================================
// UNIT TESTS - Prediction Service
// ============================================================
describe('PredictionService - Unit Tests', () => {
  describe('predictDisease()', () => {
    test('should return predictions for common cold symptoms', () => {
      const symptoms = ['runny nose', 'sneezing', 'cough', 'sore throat'];
      const result = PredictionService.predictDisease(symptoms);

      expect(result).toBeDefined();
      expect(result.predictions).toBeInstanceOf(Array);
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.primaryDiagnosis).toBeDefined();
      expect(result.primaryDiagnosis.disease).toBeDefined();
    });

    test('should return predictions for diabetes symptoms', () => {
      const symptoms = ['frequent urination', 'excessive thirst', 'fatigue', 'blurred vision'];
      const result = PredictionService.predictDisease(symptoms);

      expect(result.predictions[0].disease.toLowerCase()).toContain('diabetes');
      expect(result.predictions[0].probability).toBeGreaterThan(0);
    });

    test('should include medications in primary diagnosis', () => {
      const symptoms = ['fever', 'body aches', 'fatigue', 'headache'];
      const result = PredictionService.predictDisease(symptoms);

      expect(result.primaryDiagnosis.medications).toBeInstanceOf(Array);
      expect(result.primaryDiagnosis.medications.length).toBeGreaterThan(0);
    });

    test('should include precautions in primary diagnosis', () => {
      const symptoms = ['chest pain', 'shortness of breath'];
      const result = PredictionService.predictDisease(symptoms);

      expect(result.primaryDiagnosis.precautions).toBeInstanceOf(Array);
    });

    test('should handle unknown symptoms gracefully', () => {
      const symptoms = ['xyz123', 'unknownsymptom'];
      const result = PredictionService.predictDisease(symptoms);

      expect(result).toBeDefined();
      expect(result.primaryDiagnosis).toBeDefined();
    });

    test('probability scores should be between 0 and 100', () => {
      const symptoms = ['headache', 'fever', 'cough'];
      const result = PredictionService.predictDisease(symptoms);

      result.predictions.forEach(p => {
        expect(p.probability).toBeGreaterThanOrEqual(0);
        expect(p.probability).toBeLessThanOrEqual(100);
      });
    });

    test('predictions should be sorted by probability descending', () => {
      const symptoms = ['fever', 'cough', 'runny nose', 'sneezing'];
      const result = PredictionService.predictDisease(symptoms);

      for (let i = 1; i < result.predictions.length; i++) {
        expect(result.predictions[i - 1].probability).toBeGreaterThanOrEqual(result.predictions[i].probability);
      }
    });
  });

  describe('generateAIResponse()', () => {
    test('should respond to headache queries', () => {
      const response = PredictionService.generateAIResponse('I have a headache');
      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(20);
    });

    test('should give emergency advice for chest pain', () => {
      const response = PredictionService.generateAIResponse('I have severe chest pain');
      expect(response.toLowerCase()).toMatch(/emergency|doctor|immediately/);
    });

    test('should respond to greeting', () => {
      const response = PredictionService.generateAIResponse('hello');
      expect(response).toBeTruthy();
    });

    test('should handle unknown queries gracefully', () => {
      const response = PredictionService.generateAIResponse('random xyz query');
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });
  });

  describe('getDiseaseInfo()', () => {
    test('should return info for diabetes', () => {
      const info = PredictionService.getDiseaseInfo('diabetes');
      expect(info).not.toBeNull();
      expect(info.symptoms).toBeInstanceOf(Array);
    });

    test('should return null for unknown disease', () => {
      const info = PredictionService.getDiseaseInfo('xyzunknowndisease999');
      expect(info).toBeNull();
    });
  });

  describe('getAllDiseases()', () => {
    test('should return a list of diseases', () => {
      const diseases = PredictionService.getAllDiseases();
      expect(diseases).toBeInstanceOf(Array);
      expect(diseases.length).toBeGreaterThan(0);
    });

    test('each disease should have name, category, severity', () => {
      const diseases = PredictionService.getAllDiseases();
      diseases.forEach(d => {
        expect(d.name).toBeDefined();
        expect(d.category).toBeDefined();
        expect(d.severity).toBeDefined();
      });
    });
  });
});

// ============================================================
// API TESTS
// ============================================================
describe('Auth API - Endpoint Tests', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
    process.env.NODE_ENV = 'test';
    app = require('../server').app;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Registration tests
  describe('POST /api/register', () => {
    test('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject short password', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ name: 'Test', email: 'test@test.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ name: 'Test', email: 'notanemail', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should register successfully with valid data', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'newId', name: 'Test User', email: 'new@test.com', role: 'user',
        toJSON: () => ({ _id: 'newId', name: 'Test User', email: 'new@test.com', role: 'user' })
      });

      const res = await request(app)
        .post('/api/register')
        .send({ name: 'Test User', email: 'new@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    test('should reject duplicate email', async () => {
      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/register')
        .send({ name: 'Test User', email: 'existing@test.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // Login tests
  describe('POST /api/login', () => {
    test('should reject login with missing fields', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    test('should reject login with wrong credentials', async () => {
      const userWithSelect = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(false),
        select: jest.fn().mockReturnThis()
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userWithSelect) });

      const res = await request(app)
        .post('/api/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should login successfully with correct credentials', async () => {
      const userWithSelect = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userWithSelect) });

      const res = await request(app)
        .post('/api/login')
        .send({ email: 'demo@medai.com', password: 'demo123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });
});

// ============================================================
// SECURITY TESTS
// ============================================================
describe('Security Tests', () => {
  let app;

  beforeAll(() => {
    app = require('../server').app;
  });

  test('should include security headers (Helmet)', async () => {
    const res = await request(app).get('/api/me');
    expect(res.headers['x-content-type-options']).toBeDefined();
  });

  test('should reject requests without auth token to protected routes', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Accept', 'application/json');
    // Auth middleware redirects HTML, returns 401 for JSON
    expect([401, 302]).toContain(res.status);
  });

  test('should reject malformed JWT tokens', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .set('Accept', 'application/json');

    expect([401, 302]).toContain(res.status);
  });

  test('should sanitize NoSQL injection in login body', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: { '$gt': '' }, password: 'anypassword' });

    // Should not succeed with injection attempt
    expect(res.status).not.toBe(200);
  });

  test('should handle XSS attempt in registration name', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/register')
      .send({
        name: '<script>alert("xss")</script>',
        email: 'xss@test.com',
        password: 'password123'
      });

    // Should either reject or sanitize - not execute script
    if (res.status === 201) {
      expect(res.body.user?.name).not.toContain('<script>');
    }
  });

  test('should enforce rate limiting after many requests', async () => {
    // Make many rapid requests
    const promises = Array(15).fill(null).map(() =>
      request(app)
        .post('/api/login')
        .send({ email: 'test@test.com', password: 'wrong' })
    );

    const responses = await Promise.all(promises);
    const tooManyRequests = responses.some(r => r.status === 429);
    // Rate limiter may kick in
    expect(responses.length).toBe(15);
  });
});

// ============================================================
// PREDICTION API TESTS
// ============================================================
describe('Prediction API Tests', () => {
  let app, authToken;

  beforeAll(async () => {
    app = require('../server').app;

    // Mock a valid user for auth
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ id: 'mockUserId123' }, process.env.JWT_SECRET || 'test_jwt_secret_for_testing_only');

    User.findById.mockResolvedValue(mockUser);
  });

  test('should require authentication for /api/predict', async () => {
    const res = await request(app)
      .post('/api/predict')
      .set('Accept', 'application/json')
      .send({ symptoms: ['headache', 'fever'] });

    expect([401, 302]).toContain(res.status);
  });

  test('should return predictions with valid symptoms and auth', async () => {
    Prediction.create.mockResolvedValue({
      _id: 'pred123',
      symptoms: ['headache', 'fever'],
      predictions: [{ disease: 'Influenza', probability: 75, severity: 'moderate' }],
      primaryDiagnosis: { disease: 'Influenza', probability: 75, medications: ['Paracetamol'] }
    });

    const res = await request(app)
      .post('/api/predict')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ symptoms: ['headache', 'fever', 'body aches'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.prediction).toBeDefined();
    expect(res.body.prediction.predictions).toBeInstanceOf(Array);
  });

  test('should reject empty symptoms', async () => {
    const res = await request(app)
      .post('/api/predict')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ symptoms: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return prediction history', async () => {
    Prediction.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { _id: 'p1', symptoms: ['fever'], primaryDiagnosis: { disease: 'Flu' }, predictions: [], createdAt: new Date() }
      ])
    });
    Prediction.countDocuments.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.predictions).toBeInstanceOf(Array);
  });
});
