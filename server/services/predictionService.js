// AI Medical Prediction Service — Upgraded v2.0
// Expanded disease database + health-profile-aware scoring + health risk calculator

'use strict';

const DISEASE_DATABASE = {
  'common cold': {
    symptoms: ['runny nose', 'sneezing', 'sore throat', 'cough', 'congestion', 'mild fever', 'headache', 'watery eyes'],
    description: 'A viral infection of the upper respiratory tract causing inflammation of the nasal passages.',
    severity: 'mild', category: 'respiratory',
    medications: ['Paracetamol 500mg', 'Antihistamines', 'Decongestants', 'Vitamin C supplements'],
    precautions: ['Rest adequately', 'Stay hydrated', 'Wash hands frequently', 'Avoid close contact with others', 'Use tissues when sneezing'],
    dietPlan: ['Warm soups and broths', 'Honey and ginger tea', 'Citrus fruits for Vitamin C', 'Stay hydrated with water', 'Avoid cold foods'],
    exercises: ['Light walking if feeling well', 'Rest is most important', 'Gentle stretching', 'Deep breathing exercises'],
    whenToSeeDoctor: 'If symptoms persist beyond 10 days or fever exceeds 39°C',
    riskFactors: ['weakened immune system', 'young children', 'elderly']
  },
  'influenza': {
    symptoms: ['high fever', 'body aches', 'fatigue', 'headache', 'cough', 'sore throat', 'chills', 'sweating', 'muscle pain'],
    description: 'A highly contagious respiratory illness caused by influenza viruses.',
    severity: 'moderate', category: 'respiratory',
    medications: ['Oseltamivir (Tamiflu)', 'Paracetamol', 'Ibuprofen', 'Antiviral medications'],
    precautions: ['Bed rest', 'Isolate from others', 'Stay hydrated', 'Annual flu vaccination', 'Wear mask'],
    dietPlan: ['Chicken soup', 'Electrolyte drinks', 'Bananas and toast', 'Clear broths', 'Avoid alcohol'],
    exercises: ['Complete bed rest during acute phase', 'Gradual return to activity as symptoms improve'],
    whenToSeeDoctor: 'Immediately if breathing difficulties, persistent chest pain, or confusion occur',
    riskFactors: ['elderly', 'pregnancy', 'chronic disease', 'immunocompromised']
  },
  'diabetes': {
    symptoms: ['frequent urination', 'excessive thirst', 'fatigue', 'blurred vision', 'slow healing', 'weight loss', 'numbness in hands or feet', 'increased hunger', 'dry mouth'],
    description: 'A chronic condition affecting how the body processes blood glucose (blood sugar).',
    severity: 'moderate', category: 'endocrine',
    medications: ['Metformin', 'Insulin therapy', 'SGLT2 inhibitors', 'GLP-1 receptor agonists'],
    precautions: ['Monitor blood sugar regularly', 'Take medications as prescribed', 'Regular foot care', 'Eye examinations annually'],
    dietPlan: ['Low glycemic index foods', 'High fiber vegetables', 'Lean proteins', 'Avoid sugary drinks', 'Portion control'],
    exercises: ['30 min daily walking', 'Swimming', 'Cycling', 'Resistance training', 'Yoga'],
    whenToSeeDoctor: 'Regular check-ups every 3-6 months, immediately if blood sugar is very high or low',
    riskFactors: ['obesity', 'family history', 'sedentary', 'age over 45']
  },
  'hypertension': {
    symptoms: ['headache', 'dizziness', 'chest pain', 'shortness of breath', 'blurred vision', 'nausea', 'fatigue', 'nosebleed', 'pounding heartbeat'],
    description: 'High blood pressure, a condition where blood flows through arteries with excessive force.',
    severity: 'moderate', category: 'cardiovascular',
    medications: ['ACE inhibitors', 'Beta-blockers', 'Calcium channel blockers', 'Diuretics', 'ARBs'],
    precautions: ['Monitor blood pressure daily', 'Reduce sodium intake', 'Limit alcohol', 'Quit smoking', 'Manage stress'],
    dietPlan: ['DASH diet', 'Low sodium foods', 'Potassium-rich foods (bananas, potatoes)', 'Leafy greens', 'Avoid processed foods'],
    exercises: ['Aerobic exercise 30 min/day', 'Brisk walking', 'Swimming', 'Cycling', 'Yoga for stress reduction'],
    whenToSeeDoctor: 'Immediately if BP exceeds 180/120 mmHg or severe headache/vision changes occur',
    riskFactors: ['obesity', 'smoking', 'high sodium diet', 'family history', 'stress', 'age over 55']
  },
  'migraine': {
    symptoms: ['severe headache', 'nausea', 'vomiting', 'sensitivity to light', 'sensitivity to sound', 'visual disturbances', 'throbbing pain', 'aura'],
    description: 'A neurological condition causing intense, debilitating headaches often with other symptoms.',
    severity: 'moderate', category: 'neurological',
    medications: ['Triptans (Sumatriptan)', 'NSAIDs', 'Anti-nausea medications', 'Beta-blockers for prevention'],
    precautions: ['Identify and avoid triggers', 'Maintain regular sleep schedule', 'Stay hydrated', 'Reduce stress'],
    dietPlan: ['Regular meals (skip no meals)', 'Stay hydrated', 'Avoid trigger foods (caffeine, alcohol, aged cheese)', 'Magnesium-rich foods'],
    exercises: ['Regular moderate exercise', 'Yoga', 'Swimming', 'Avoid intense exercise during attacks'],
    whenToSeeDoctor: 'If headaches are sudden and severe, occur after head injury, or worsen over time',
    riskFactors: ['female', 'family history', 'hormonal changes', 'stress']
  },
  'asthma': {
    symptoms: ['wheezing', 'shortness of breath', 'chest tightness', 'coughing', 'difficulty breathing', 'rapid breathing', 'nighttime cough'],
    description: 'A chronic respiratory condition causing airway inflammation and breathing difficulties.',
    severity: 'moderate', category: 'respiratory',
    medications: ['Salbutamol inhaler', 'Corticosteroid inhalers', 'Leukotriene modifiers', 'Long-acting bronchodilators'],
    precautions: ['Always carry rescue inhaler', 'Avoid triggers (dust, smoke, pollen)', 'Monitor peak flow', 'Get flu vaccination'],
    dietPlan: ['Anti-inflammatory foods', 'Fruits and vegetables', 'Omega-3 rich fish', 'Avoid sulfites in preserved foods'],
    exercises: ['Swimming (warm humid air helps)', 'Yoga and breathing exercises', 'Walking', 'Avoid cold-weather outdoor exercise'],
    whenToSeeDoctor: 'Immediately during severe breathing difficulty or if rescue inhaler provides no relief',
    riskFactors: ['allergies', 'family history', 'smoking', 'obesity', 'respiratory infections in childhood']
  },
  'gastritis': {
    symptoms: ['stomach pain', 'nausea', 'vomiting', 'bloating', 'loss of appetite', 'indigestion', 'burping', 'upper abdominal pain', 'burning sensation'],
    description: 'Inflammation of the stomach lining, often caused by H. pylori infection or NSAID use.',
    severity: 'mild', category: 'digestive',
    medications: ['Proton pump inhibitors (Omeprazole)', 'Antacids', 'H2 blockers', 'Antibiotics if H. pylori'],
    precautions: ['Avoid NSAIDs', 'Limit alcohol', 'Stop smoking', 'Eat smaller meals', 'Reduce stress'],
    dietPlan: ['Bland diet (rice, toast, banana)', 'Avoid spicy and acidic foods', 'Small frequent meals', 'Ginger tea', 'Probiotics'],
    exercises: ['Light walking after meals', 'Yoga', 'Stress reduction exercises', 'Avoid intense exercise immediately after eating'],
    whenToSeeDoctor: 'If symptoms persist more than a week, or if you notice blood in stool or vomit',
    riskFactors: ['H. pylori infection', 'NSAID use', 'alcohol', 'stress', 'smoking']
  },
  'anxiety disorder': {
    symptoms: ['excessive worry', 'restlessness', 'fatigue', 'difficulty concentrating', 'irritability', 'sleep problems', 'muscle tension', 'panic attacks', 'racing heart'],
    description: 'A mental health condition characterized by excessive anxiety and worry that interferes with daily life.',
    severity: 'moderate', category: 'mental_health',
    medications: ['SSRIs (Sertraline)', 'SNRIs', 'Buspirone', 'Benzodiazepines (short-term)', 'Beta-blockers'],
    precautions: ['Cognitive behavioral therapy', 'Practice mindfulness', 'Limit caffeine', 'Regular sleep schedule', 'Support groups'],
    dietPlan: ['Limit caffeine and alcohol', 'Complex carbohydrates', 'Foods rich in omega-3', 'Magnesium-rich foods', 'Avoid sugar spikes'],
    exercises: ['Aerobic exercise daily', 'Yoga and meditation', 'Deep breathing exercises', 'Progressive muscle relaxation'],
    whenToSeeDoctor: 'If anxiety significantly impacts daily functioning or includes panic attacks',
    riskFactors: ['trauma', 'family history', 'chronic stress', 'substance abuse']
  },
  'urinary tract infection': {
    symptoms: ['frequent urination', 'burning urination', 'cloudy urine', 'strong urine odor', 'pelvic pain', 'blood in urine', 'fever', 'back pain'],
    description: 'An infection in any part of the urinary system, most commonly in the bladder and urethra.',
    severity: 'mild', category: 'infectious',
    medications: ['Trimethoprim-sulfamethoxazole', 'Nitrofurantoin', 'Fosfomycin', 'Phenazopyridine for pain relief'],
    precautions: ['Drink plenty of water', 'Wipe front to back', 'Urinate after intercourse', 'Avoid holding urine'],
    dietPlan: ['Drink 8+ glasses of water daily', 'Cranberry juice (unsweetened)', 'Avoid caffeine and alcohol', 'Probiotics'],
    exercises: ['Normal activity is fine', 'Avoid activities that cause discomfort', 'Kegel exercises for bladder health'],
    whenToSeeDoctor: 'Immediately if fever above 38°C, severe back pain, or symptoms don\'t improve within 48 hours of antibiotics',
    riskFactors: ['female', 'sexual activity', 'menopause', 'urinary tract abnormalities', 'catheter use']
  },
  'depression': {
    symptoms: ['persistent sadness', 'loss of interest', 'fatigue', 'sleep changes', 'appetite changes', 'concentration problems', 'feelings of worthlessness', 'thoughts of death', 'social withdrawal'],
    description: 'A mood disorder causing persistent feelings of sadness and loss of interest affecting daily functioning.',
    severity: 'moderate', category: 'mental_health',
    medications: ['SSRIs (Fluoxetine, Sertraline)', 'SNRIs', 'Tricyclic antidepressants', 'Therapy is essential'],
    precautions: ['Seek professional help', 'Maintain social connections', 'Establish routine', 'Avoid alcohol and drugs', 'Practice self-care'],
    dietPlan: ['Omega-3 rich foods', 'Complex carbohydrates', 'Folate-rich foods (leafy greens)', 'Limit processed foods', 'Adequate protein'],
    exercises: ['Regular aerobic exercise (30 min/day)', 'Yoga', 'Walking outdoors', 'Group fitness classes for social interaction'],
    whenToSeeDoctor: 'Immediately if experiencing thoughts of self-harm or suicide. Seek help promptly for persistent symptoms.',
    riskFactors: ['trauma', 'family history', 'chronic illness', 'isolation', 'substance abuse']
  },
  // ---- NEW DISEASES ADDED IN v2.0 ----
  'pneumonia': {
    symptoms: ['high fever', 'chest pain', 'cough with phlegm', 'shortness of breath', 'fatigue', 'chills', 'rapid breathing', 'sweating', 'confusion'],
    description: 'An infection that inflames the air sacs in one or both lungs, which may fill with fluid.',
    severity: 'severe', category: 'respiratory',
    medications: ['Antibiotics (Amoxicillin, Azithromycin)', 'Antipyretics', 'Bronchodilators', 'IV fluids if hospitalized'],
    precautions: ['Complete bed rest', 'Hospitalization may be needed', 'Pneumococcal vaccine', 'Avoid smoking'],
    dietPlan: ['High protein foods', 'Warm fluids', 'Vitamin C rich foods', 'Chicken broth', 'Honey'],
    exercises: ['Complete rest during acute phase', 'Breathing exercises during recovery', 'Gradual return to normal activity'],
    whenToSeeDoctor: 'Seek immediate care — pneumonia can be life-threatening, especially in elderly and immunocompromised',
    riskFactors: ['elderly', 'smoking', 'chronic lung disease', 'weakened immune system', 'hospitalization']
  },
  'dengue fever': {
    symptoms: ['high fever', 'severe headache', 'eye pain', 'joint pain', 'muscle pain', 'rash', 'nausea', 'vomiting', 'fatigue', 'bleeding gums'],
    description: 'A mosquito-borne viral infection causing flu-like illness that can sometimes develop into severe dengue.',
    severity: 'severe', category: 'infectious',
    medications: ['Paracetamol (NOT ibuprofen/aspirin)', 'IV fluids', 'Platelet transfusion if severe', 'Hospitalization monitoring'],
    precautions: ['Avoid mosquito bites', 'Use repellent', 'Eliminate standing water', 'Wear full-sleeved clothing', 'Monitor platelet count'],
    dietPlan: ['Papaya leaf juice (may boost platelets)', 'Coconut water for electrolytes', 'Soft easily digestible foods', 'Avoid spicy and oily foods'],
    exercises: ['Complete bed rest', 'No physical exertion during acute phase'],
    whenToSeeDoctor: 'Immediately — dengue can become dengue hemorrhagic fever; any bleeding sign requires emergency care',
    riskFactors: ['tropical regions', 'monsoon season', 'previous dengue infection']
  },
  'thyroid disorder': {
    symptoms: ['fatigue', 'weight changes', 'temperature sensitivity', 'hair loss', 'dry skin', 'constipation', 'muscle weakness', 'depression', 'irregular heartbeat', 'puffiness'],
    description: 'A condition where the thyroid gland produces too much (hyperthyroidism) or too little (hypothyroidism) thyroid hormone.',
    severity: 'moderate', category: 'endocrine',
    medications: ['Levothyroxine (hypothyroid)', 'Methimazole (hyperthyroid)', 'Beta-blockers', 'Radioactive iodine therapy'],
    precautions: ['Regular TSH blood tests', 'Consistent medication timing', 'Avoid extreme iodine intake', 'Monitor mood and energy levels'],
    dietPlan: ['Selenium-rich foods (Brazil nuts, tuna)', 'Moderate iodine (seafood)', 'Avoid raw cruciferous vegetables in excess', 'Anti-inflammatory diet'],
    exercises: ['Yoga and gentle stretching', 'Walking', 'Swimming', 'Avoid excessive high-intensity exercise'],
    whenToSeeDoctor: 'If you notice any sudden weight changes, extreme fatigue, palpitations, or significant mood changes',
    riskFactors: ['female', 'family history', 'autoimmune disease', 'iodine deficiency', 'radiation exposure']
  },
  'arthritis': {
    symptoms: ['joint pain', 'joint swelling', 'stiffness', 'reduced range of motion', 'redness around joints', 'warmth in joints', 'fatigue', 'morning stiffness'],
    description: 'Inflammation of one or more joints causing pain and stiffness, most common forms being osteoarthritis and rheumatoid arthritis.',
    severity: 'moderate', category: 'musculoskeletal',
    medications: ['NSAIDs (Ibuprofen, Naproxen)', 'DMARDs (Methotrexate for RA)', 'Corticosteroids', 'Biologics', 'Topical pain relievers'],
    precautions: ['Maintain healthy weight', 'Joint protection techniques', 'Use assistive devices', 'Avoid overuse of joints', 'Physical therapy'],
    dietPlan: ['Anti-inflammatory diet', 'Omega-3 fatty acids (fish oil)', 'Turmeric and ginger', 'Colorful vegetables', 'Avoid processed foods and sugar'],
    exercises: ['Low-impact exercise (swimming, cycling)', 'Range of motion exercises', 'Strengthening exercises', 'Yoga', 'Tai chi'],
    whenToSeeDoctor: 'If joint pain persists more than a few weeks, is accompanied by redness/warmth, or significantly limits mobility',
    riskFactors: ['age over 50', 'obesity', 'family history', 'previous joint injury', 'female for RA']
  },
  'anemia': {
    symptoms: ['fatigue', 'weakness', 'pale skin', 'shortness of breath', 'dizziness', 'headache', 'cold hands and feet', 'irregular heartbeat', 'chest pain'],
    description: 'A condition where you lack enough healthy red blood cells to carry adequate oxygen to your body\'s tissues.',
    severity: 'moderate', category: 'other',
    medications: ['Iron supplements', 'Vitamin B12 injections', 'Folic acid supplements', 'Erythropoietin injections', 'Blood transfusion if severe'],
    precautions: ['Take iron supplements with Vitamin C', 'Avoid tea/coffee with iron tablets', 'Regular blood tests', 'Treat underlying cause'],
    dietPlan: ['Iron-rich foods (red meat, spinach, lentils)', 'Vitamin C to enhance iron absorption', 'Vitamin B12 (eggs, dairy, meat)', 'Folate (leafy greens, beans)', 'Fortified cereals'],
    exercises: ['Light to moderate exercise as tolerated', 'Avoid strenuous exercise until hemoglobin improves', 'Yoga and breathing exercises'],
    whenToSeeDoctor: 'If you experience extreme fatigue, severe shortness of breath, chest pain, or fainting',
    riskFactors: ['female (menstruation)', 'pregnancy', 'vegetarian/vegan diet', 'chronic disease', 'family history of blood disorders']
  },
  'kidney stones': {
    symptoms: ['severe flank pain', 'pain radiating to groin', 'blood in urine', 'nausea', 'vomiting', 'frequent urination', 'pain during urination', 'cloudy urine', 'fever'],
    description: 'Hard deposits made of minerals and salts that form inside kidneys and can cause severe pain when passing through the urinary tract.',
    severity: 'severe', category: 'other',
    medications: ['Pain relievers (Ketorolac, Ibuprofen)', 'Alpha-blockers to relax ureter', 'Anti-nausea medications', 'IV fluids', 'Lithotripsy for large stones'],
    precautions: ['Drink 2.5-3 liters of water daily', 'Reduce sodium intake', 'Limit animal protein', 'Avoid high-oxalate foods if calcium oxalate stones'],
    dietPlan: ['High fluid intake (water, lemonade)', 'Low sodium diet', 'Moderate calcium intake (from food, not supplements)', 'Limit red meat and shellfish', 'Limit spinach, nuts, chocolate'],
    exercises: ['Regular moderate exercise', 'Stay active to prevent calcium deposits', 'Maintain healthy weight'],
    whenToSeeDoctor: 'Immediately if pain is unbearable, accompanied by fever/chills (sign of infection), or if unable to urinate',
    riskFactors: ['dehydration', 'high protein diet', 'obesity', 'family history', 'digestive diseases', 'certain medications']
  },
  'covid-19': {
    symptoms: ['fever', 'dry cough', 'fatigue', 'loss of taste', 'loss of smell', 'shortness of breath', 'sore throat', 'headache', 'body aches', 'diarrhea'],
    description: 'A respiratory illness caused by the SARS-CoV-2 coronavirus, ranging from mild to severe with potential for long COVID.',
    severity: 'moderate', category: 'infectious',
    medications: ['Paracetamol for fever', 'Antiviral (Paxlovid if eligible)', 'Corticosteroids if severe', 'Oxygen therapy if needed'],
    precautions: ['Isolate for minimum 5 days', 'Wear N95 mask', 'Ventilate rooms', 'Monitor oxygen saturation', 'Stay vaccinated'],
    dietPlan: ['Vitamin C and D rich foods', 'Zinc-rich foods (pumpkin seeds, beef)', 'High protein for recovery', 'Stay well hydrated', 'Ginger and turmeric teas'],
    exercises: ['Complete rest during acute phase', 'Breathing exercises (prone positioning helps)', 'Gradual return over weeks', 'Avoid rushing return to exercise'],
    whenToSeeDoctor: 'If oxygen saturation drops below 94%, breathing is difficult, chest pain, confusion, or bluish lips',
    riskFactors: ['unvaccinated', 'elderly', 'obesity', 'diabetes', 'heart disease', 'immunocompromised']
  },
  'food poisoning': {
    symptoms: ['nausea', 'vomiting', 'diarrhea', 'stomach cramps', 'fever', 'weakness', 'headache', 'loss of appetite'],
    description: 'Illness caused by eating contaminated food containing bacteria, viruses, parasites, or their toxins.',
    severity: 'mild', category: 'digestive',
    medications: ['Oral rehydration salts', 'Anti-nausea medications (Ondansetron)', 'Antibiotics if bacterial cause confirmed', 'Bismuth subsalicylate'],
    precautions: ['Stay hydrated', 'Avoid solid food initially', 'Gradual reintroduction of bland foods', 'Report severe cases to health authorities'],
    dietPlan: ['Clear fluids first (water, broth)', 'BRAT diet (Bananas, Rice, Applesauce, Toast)', 'Electrolyte drinks', 'Avoid dairy, fatty, spicy foods initially'],
    exercises: ['Complete rest', 'Light activity only when feeling better'],
    whenToSeeDoctor: 'If high fever (>38.5°C), blood in stool/vomit, signs of dehydration, or symptoms persist beyond 3 days',
    riskFactors: ['improper food storage', 'undercooked meat', 'immunocompromised', 'elderly', 'pregnancy']
  }
};

class PredictionService {
  static predictDisease(symptoms, healthProfile = null) {
    const symptomsList = symptoms.map(s => s.toLowerCase().trim());
    const scores = {};

    for (const [disease, data] of Object.entries(DISEASE_DATABASE)) {
      let matchCount = 0;
      const totalSymptoms = data.symptoms.length;

      for (const symptom of symptomsList) {
        const matched = data.symptoms.some(ds =>
          ds.includes(symptom) || symptom.includes(ds) ||
          this.calculateSimilarity(ds, symptom) > 0.7
        );
        if (matched) matchCount++;
      }

      if (matchCount > 0) {
        let probability = Math.round((matchCount / Math.max(symptomsList.length, totalSymptoms)) * 100);
        const coverageBonus = matchCount >= 4 ? 20 : matchCount >= 3 ? 15 : matchCount >= 2 ? 8 : 0;
        probability = Math.min(probability + coverageBonus, 95);

        // Health profile boosts
        if (healthProfile && data.riskFactors) {
          const profileBoost = this._applyProfileBoost(disease, data.riskFactors, healthProfile);
          probability = Math.min(probability + profileBoost, 95);
        }

        scores[disease] = probability;
      }
    }

    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([disease, probability]) => ({
        disease: disease.charAt(0).toUpperCase() + disease.slice(1),
        probability,
        severity: DISEASE_DATABASE[disease].severity,
        description: DISEASE_DATABASE[disease].description,
        category: DISEASE_DATABASE[disease].category
      }));

    if (sorted.length === 0) {
      return {
        predictions: [{
          disease: 'Unspecified Condition',
          probability: 30,
          severity: 'mild',
          description: 'Based on the symptoms provided, no specific condition could be identified with certainty. Please consult a healthcare professional.',
          category: 'other'
        }],
        primaryDiagnosis: this.getDefaultDiagnosis()
      };
    }

    const primaryKey = sorted[0].disease.toLowerCase();
    const primaryData = DISEASE_DATABASE[primaryKey] || DISEASE_DATABASE[Object.keys(DISEASE_DATABASE).find(k =>
      k.includes(sorted[0].disease.toLowerCase()) || sorted[0].disease.toLowerCase().includes(k)
    )];

    return {
      predictions: sorted,
      primaryDiagnosis: primaryData ? {
        disease: sorted[0].disease,
        probability: sorted[0].probability,
        description: primaryData.description,
        medications: primaryData.medications,
        precautions: primaryData.precautions,
        dietPlan: primaryData.dietPlan,
        exercises: primaryData.exercises,
        whenToSeeDoctor: primaryData.whenToSeeDoctor
      } : this.getDefaultDiagnosis(sorted[0])
    };
  }

  // Apply risk-factor-based probability boost using health profile
  static _applyProfileBoost(disease, riskFactors, profile) {
    let boost = 0;
    const rf = riskFactors.map(r => r.toLowerCase());

    if (rf.includes('obesity') && profile.bmi && profile.bmi >= 30) boost += 8;
    if (rf.includes('elderly') && profile.age && profile.age >= 65) boost += 10;
    if (rf.includes('female') && profile.gender === 'female') boost += 5;
    if (rf.includes('sedentary') && profile.lifestyleHabits?.exerciseFrequency === 'sedentary') boost += 5;
    if (rf.includes('smoking') && profile.lifestyleHabits?.smoking) boost += 8;
    if ((rf.includes('overweight') || rf.includes('obesity')) && profile.bmi && profile.bmi >= 25) boost += 5;
    if (rf.includes('family history') && profile.existingConditions?.length > 0) boost += 3;
    if (rf.includes('chronic disease') && profile.existingConditions?.length > 0) boost += 5;
    if (rf.includes('age over 45') && profile.age && profile.age >= 45) boost += 6;
    if (rf.includes('age over 50') && profile.age && profile.age >= 50) boost += 7;
    if (rf.includes('stress') && profile.lifestyleHabits?.exerciseFrequency === 'sedentary') boost += 3;

    return Math.min(boost, 15); // cap profile boost at 15%
  }

  static calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    const common = words1.filter(w => words2.includes(w));
    return common.length / Math.max(words1.length, words2.length);
  }

  static getDefaultDiagnosis(prediction = {}) {
    return {
      disease: prediction.disease || 'General Consultation Needed',
      probability: prediction.probability || 30,
      description: 'Please consult a qualified medical professional for an accurate diagnosis.',
      medications: ['Consult doctor for appropriate medication'],
      precautions: ['Rest', 'Stay hydrated', 'Monitor symptoms', 'Seek medical advice'],
      dietPlan: ['Balanced diet', 'Adequate hydration', 'Fruits and vegetables'],
      exercises: ['Light activity as tolerated', 'Rest if severe symptoms'],
      whenToSeeDoctor: 'As soon as possible for proper diagnosis'
    };
  }

  static getDiseaseInfo(diseaseName) {
    const key = diseaseName.toLowerCase();
    const data = DISEASE_DATABASE[key] || Object.entries(DISEASE_DATABASE).find(([k]) =>
      k.includes(key) || key.includes(k)
    )?.[1];
    return data ? { name: diseaseName, ...data } : null;
  }

  static getAllDiseases() {
    return Object.keys(DISEASE_DATABASE).map(name => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      category: DISEASE_DATABASE[name].category,
      severity: DISEASE_DATABASE[name].severity
    }));
  }

  // ── NEW: Health Risk Score ──────────────────────────────────────────────────
  static calculateHealthRiskScore(profile) {
    if (!profile) return null;
    let score = 100; // Start at 100 (perfect health)
    const risks = [];

    // BMI risk
    if (profile.bmi) {
      if (profile.bmi < 18.5) { score -= 8; risks.push({ factor: 'Underweight BMI', impact: 'medium', tip: 'Consult a nutritionist for a healthy weight gain plan.' }); }
      else if (profile.bmi >= 30) { score -= 15; risks.push({ factor: 'Obese BMI', impact: 'high', tip: 'Weight loss through diet and exercise significantly reduces health risks.' }); }
      else if (profile.bmi >= 25) { score -= 8; risks.push({ factor: 'Overweight BMI', impact: 'medium', tip: 'Aim for 30 minutes of moderate exercise 5 days a week.' }); }
    }

    // Lifestyle risks
    if (profile.lifestyleHabits) {
      if (profile.lifestyleHabits.smoking) { score -= 20; risks.push({ factor: 'Smoking', impact: 'high', tip: 'Quitting smoking is the single most important step for your health.' }); }
      if (profile.lifestyleHabits.alcohol) { score -= 8; risks.push({ factor: 'Alcohol consumption', impact: 'medium', tip: 'Limit alcohol to 1-2 units per day maximum.' }); }
      if (profile.lifestyleHabits.exerciseFrequency === 'sedentary') { score -= 12; risks.push({ factor: 'Sedentary lifestyle', impact: 'high', tip: 'Even 20 minutes of walking daily reduces cardiovascular risk significantly.' }); }
      else if (profile.lifestyleHabits.exerciseFrequency === 'light') { score -= 5; risks.push({ factor: 'Low physical activity', impact: 'low', tip: 'Increase to at least 150 minutes of moderate activity per week.' }); }
      if (profile.lifestyleHabits.sleepHours && (profile.lifestyleHabits.sleepHours < 6 || profile.lifestyleHabits.sleepHours > 10)) { score -= 8; risks.push({ factor: 'Poor sleep pattern', impact: 'medium', tip: 'Aim for 7-9 hours of quality sleep per night.' }); }
    }

    // Age risks
    if (profile.age) {
      if (profile.age >= 65) { score -= 10; risks.push({ factor: 'Age-related vulnerability', impact: 'medium', tip: 'Regular health screenings are especially important at your age.' }); }
      else if (profile.age >= 50) { score -= 5; risks.push({ factor: 'Increased age risk', impact: 'low', tip: 'Schedule annual comprehensive health check-ups.' }); }
    }

    // Existing conditions
    if (profile.existingConditions && profile.existingConditions.length > 0) {
      const conditionRisk = Math.min(profile.existingConditions.length * 5, 20);
      score -= conditionRisk;
      risks.push({ factor: `Existing condition(s): ${profile.existingConditions.join(', ')}`, impact: 'high', tip: 'Consistent management of existing conditions is key to preventing complications.' });
    }

    // Allergies
    if (profile.allergies && profile.allergies.length > 0) { score -= 3; risks.push({ factor: 'Known allergies', impact: 'low', tip: 'Keep your allergy action plan updated and carry any prescribed epinephrine.' }); }

    score = Math.max(score, 10); // Floor at 10
    const level = score >= 80 ? 'good' : score >= 60 ? 'fair' : score >= 40 ? 'poor' : 'critical';
    const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Poor' : 'Critical';

    return { score, level, label, risks };
  }

  static generateAIResponse(message, context = {}) {
    const msg = message.toLowerCase();
    if (msg.includes('headache') || msg.includes('head pain')) return 'Headaches can have many causes including tension, dehydration, eye strain, or migraines. Try drinking water, resting in a quiet dark room, and applying a cold or warm compress. If headaches are severe, persistent, or accompanied by other symptoms, please consult a doctor.';
    if (msg.includes('fever') || msg.includes('temperature')) return 'A fever is typically a sign your body is fighting an infection. For adults, temperatures above 38°C (100.4°F) are considered a fever. Rest, stay hydrated, and use antipyretics like paracetamol or ibuprofen. Seek immediate care if fever exceeds 39.5°C or is accompanied by severe symptoms.';
    if (msg.includes('chest pain') || msg.includes('heart')) return '⚠️ Chest pain can be a serious symptom. If you\'re experiencing severe chest pain, especially with shortness of breath, sweating, or pain radiating to the arm or jaw, call emergency services immediately (911/112). These could be signs of a cardiac event.';
    if (msg.includes('cough') || msg.includes('cold')) return 'Coughs can be caused by respiratory infections, allergies, or other conditions. For a productive cough with mucus, stay hydrated and use a humidifier. Dry coughs may benefit from honey and warm water. If a cough persists for more than 3 weeks, see a doctor.';
    if (msg.includes('diabetes') || msg.includes('blood sugar')) return 'Diabetes management involves monitoring blood glucose levels, taking prescribed medications, following a low-glycemic diet, and regular exercise. Keep your A1C below 7%, monitor your feet daily, and have regular check-ups with your healthcare team.';
    if (msg.includes('medication') || msg.includes('medicine') || msg.includes('drug')) return 'I can provide general information about medications, but please always consult your doctor or pharmacist before starting, stopping, or changing any medication. Dosages vary by individual, and drug interactions can be complex.';
    if (msg.includes('emergency') || msg.includes('urgent')) return '🚨 If this is a medical emergency, please call emergency services immediately (911 in the US, 112 in Europe, 999 in the UK, or your local emergency number). Do not delay seeking emergency care.';
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('help')) return 'Hello! I\'m MedAI Assistant, your AI-powered medical information companion. I can help you understand symptoms, medications, diseases, and general health advice. How can I assist you today?';
    return `I understand you're asking about "${message.substring(0, 50)}". While I can provide general health information, I recommend consulting a qualified healthcare professional for personalized medical advice. Is there a specific aspect of your health concern I can help explain?`;
  }
}

module.exports = PredictionService;
