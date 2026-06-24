# MedAI - AI Medical Help Platform v2.0

A full-stack AI-powered healthcare assistance platform built with Node.js, Express, EJS, and MongoDB Atlas.

> **v2.0 Upgrade Summary** — see [What's New](#-whats-new-in-v20) below.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and secrets

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:3000
```

### Demo Credentials
| Role  | Email              | Password  |
|-------|--------------------|-----------| 
| User  | demo@medai.com     | demo123   |
| Admin | admin@medai.com    | admin123  |

---

## 🆕 What's New in v2.0

### 1. 🧠 Health Profile-Aware AI Predictions
The prediction engine now reads your age, BMI, gender, smoking status, exercise frequency, and existing conditions to apply personalised probability boosts. A 65-year-old smoker will see hypertension ranked higher than a 25-year-old athlete with identical symptoms.

### 2. 🛡️ Health Risk Score
A dynamic 0–100 health score computed from your profile on every dashboard load. It identifies up to 10 risk factors (obesity, sedentary lifestyle, smoking, sleep issues, etc.) and provides concrete improvement tips for each.

### 3. 💊 Medication Reminder System
Full CRUD for medication tracking — add medications with name, dosage, frequency, scheduled times, notes, and a colour label. Visible on both the dashboard and dedicated `/medications` page.

### 4. 🦠 Expanded Disease Database (10 → 17 diseases)
**New diseases added:** Pneumonia, Dengue Fever, Thyroid Disorder, Arthritis, Anemia, Kidney Stones, COVID-19, Food Poisoning — each with full medications, diet plans, exercises, risk factors, and when-to-see-doctor guidance.

### 5. 🔬 Smarter Matching Algorithm
- Symptom coverage bonus increased for 4+ symptom matches
- Risk factor array per disease enables profile-based probability boosting
- Profile boost capped at +15% to prevent over-weighting

---

## 🏗️ Architecture

```
Client Browser
     │
     ▼
Express.js Server (Port 3000)
     │
     ├── REST API Routes (/api/*)
     │        │
     │        ├── Auth Controller
     │        ├── Prediction Controller  ──► AI Prediction Service (v2)
     │        ├── Chat Controller
     │        ├── Medication Controller  ──► NEW v2.0
     │        └── Analytics Controller
     │
     ├── Page Routes (EJS Templates)
     │
     ├── Socket.io (Real-time chat)
     │
     └── MongoDB Atlas
              ├── Users
              ├── HealthProfiles
              ├── Predictions
              ├── Chats
              ├── Reports
              └── MedicationReminders  ── NEW v2.0
```

## 📋 Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | JWT + bcrypt, secure cookies, role-based access |
| 🩺 Symptom Checker | AI disease prediction with profile-aware probability (v2) |
| 🛡️ Health Risk Score | Dynamic 0-100 score with personalised risk factors (NEW v2) |
| 💊 Medication Reminders | Full CRUD medication tracker with schedules (NEW v2) |
| 🦠 17 Diseases | Expanded database including COVID-19, Dengue, Arthritis, etc. (NEW v2) |
| 🤖 AI Chat | Medical Q&A assistant with history |
| 🎤 Voice Input | Web Speech API symptom recognition |
| 📊 Analytics | Charts: disease trends, activity, distributions |
| 📁 Reports | Generate PDF-ready health reports |
| 🔒 Security | Helmet, rate limiting, NoSQL sanitization, XSS protection |
| 🧪 Tests | Jest unit + API + security tests |
| 📝 Logging | Winston structured logging |

## 🔌 API Endpoints

```
POST   /api/register          Register new user
POST   /api/login             Login
POST   /api/logout            Logout
GET    /api/me                Get current user
PUT    /api/profile           Update health profile

POST   /api/predict           AI disease prediction (profile-aware v2)
GET    /api/history           Prediction history
GET    /api/prediction/:id    Single prediction
POST   /api/prediction/:id/report  Generate report

POST   /api/chat              Send chat message
GET    /api/chat-history      Chat sessions list
GET    /api/chat/:id          Load chat session

GET    /api/medications       Get medication reminders    ← NEW v2
POST   /api/medications       Add medication reminder     ← NEW v2
PUT    /api/medications/:id   Update reminder             ← NEW v2
DELETE /api/medications/:id   Remove reminder             ← NEW v2

GET    /api/search-disease    Disease information
GET    /api/analytics         User analytics

GET    /api/admin/stats       Admin statistics (admin only)
GET    /api/admin/users       All users (admin only)
```

## 🧪 Running Tests

```bash
npm test
```

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT token authentication
- HTTP-only secure cookies
- Helmet security headers
- Express-mongo-sanitize (NoSQL injection prevention)
- Express-rate-limit (DDoS protection)
- Input validation with express-validator
- XSS-safe EJS templating
- CORS configuration

## 📁 Project Structure

```
medai/
├── server.js              # App entry point
├── config/
│   └── database.js        # MongoDB connection
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── predictionController.js
│   │   ├── chatController.js
│   │   ├── analyticsController.js
│   │   ├── adminController.js
│   │   └── medicationController.js   ← NEW v2.0
│   ├── models/
│   │   ├── User.js
│   │   ├── HealthProfile.js
│   │   ├── Prediction.js
│   │   ├── Chat.js
│   │   ├── Report.js
│   │   ├── Disease.js
│   │   └── MedicationReminder.js     ← NEW v2.0
│   ├── routes/
│   ├── middlewares/
│   └── services/
│       ├── predictionService.js      ← UPGRADED v2.0
│       └── aiChatService.js
├── views/
│   ├── layouts/
│   ├── pages/
│   │   ├── dashboard.ejs             ← UPGRADED v2.0
│   │   ├── predict.ejs               ← UPGRADED v2.0
│   │   └── medications.ejs           ← NEW v2.0
│   └── partials/
├── public/
├── tests/
└── logs/
```
