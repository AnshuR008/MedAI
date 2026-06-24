# MedAI v2.0 — Upgrade Changelog

## New Features

### 🛡️ Health Risk Score (server/services/predictionService.js)
- `calculateHealthRiskScore(profile)` — computes a 0–100 score
- Deducts points for: smoking, obesity, sedentary lifestyle, poor sleep, age, allergies, existing conditions
- Returns `{ score, level, label, risks[] }` where each risk has `factor`, `impact`, and a `tip`
- Displayed as animated SVG ring chart on the dashboard

### 💊 Medication Reminder System
- **Model:** `server/models/MedicationReminder.js`
  - Fields: medicationName, dosage, frequency, times[], startDate, endDate, notes, color, isActive
- **Controller:** `server/controllers/medicationController.js`
  - getReminders, createReminder, updateReminder, deleteReminder
- **Routes:** GET/POST/PUT/DELETE `/api/medications`
- **Page:** `views/pages/medications.ejs` — card grid with color-coded labels, time badges, delete button
- **Dashboard widget:** shows up to 4 active medications with quick link to full page

### 🦠 Expanded Disease Database (predictionService.js)
Added 7 new diseases with full clinical data:
- Pneumonia (severe, respiratory)
- Dengue Fever (severe, infectious)
- Thyroid Disorder (moderate, endocrine)
- Arthritis (moderate, musculoskeletal)
- Anemia (moderate, other)
- Kidney Stones (severe, other)
- COVID-19 (moderate, infectious)
- Food Poisoning (mild, digestive)

Each disease now also has a `riskFactors[]` array used by the profile-aware engine.

## Upgraded Features

### 🧠 Profile-Aware Prediction Engine
- `predictDisease(symptoms, healthProfile)` now accepts optional health profile
- New `_applyProfileBoost(disease, riskFactors, profile)` method
- Boosts probability based on: BMI, age, gender, smoking, exercise frequency, existing conditions, allergies
- Boost capped at +15% per disease to prevent over-weighting

### 📊 Dashboard (views/pages/dashboard.ejs)
- Added Health Risk Score card with SVG ring chart and risk factor list
- Added Medication Reminders widget showing active medications
- Replaced "Disease Search" quick action with "Medications"
- Added Medications page route to sidebar

### 🔍 Symptom Checker (views/pages/predict.ejs)
- Added 11 new quick-select symptom chips (joint pain, rash, weight loss, chills, muscle pain, loss of taste/smell, eye pain, burning urination, back pain, palpitations)
- Added v2.0 / Profile-Aware AI badge in page header

## Files Changed
| File | Change |
|------|--------|
| server/services/predictionService.js | Major rewrite — expanded DB, profile boost, risk score |
| server/controllers/predictionController.js | Passes health profile to prediction engine |
| server/controllers/medicationController.js | **NEW** |
| server/models/MedicationReminder.js | **NEW** |
| server/routes/api.js | Added medication CRUD routes |
| server/routes/pages.js | Added /medications page, health risk + meds to dashboard |
| views/pages/dashboard.ejs | Added risk score card + meds widget |
| views/pages/predict.ejs | More symptom chips, v2 badge |
| views/pages/medications.ejs | **NEW** |
| views/partials/sidebar.ejs | Added Medications nav link |
| package.json | Version bumped to 2.0.0 |
| README.md | Fully rewritten with v2 docs |
