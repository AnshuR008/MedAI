/**
 * aiChatService.js
 * Rule-based + keyword AI medical assistant.
 * Designed to be swapped for an LLM API (OpenAI, Anthropic, etc.)
 * by replacing the `generateResponse` export.
 */

'use strict';

/* ── Knowledge base ──────────────────────────────────────── */

const KNOWLEDGE = {
  greetings: {
    patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)/i],
    response: () =>
      `Hello! 👋 I'm **MedAI Assistant**, your AI-powered medical information companion.\n\n` +
      `I can help you with:\n` +
      `• Understanding symptoms and possible conditions\n` +
      `• Information about diseases and medications\n` +
      `• Diet, exercise, and lifestyle guidance\n` +
      `• When to seek professional medical care\n\n` +
      `⚠️ *I provide information only — always consult a qualified doctor for diagnosis and treatment.*\n\n` +
      `How can I help you today?`,
  },

  emergency: {
    patterns: [
      /chest\s*pain/i, /can't\s*breathe/i, /difficulty\s*breath/i,
      /stroke/i, /unconscious/i, /overdose/i, /severe\s*bleed/i,
      /heart\s*attack/i, /anaphylaxis/i, /seizure/i,
    ],
    response: (msg) =>
      `🚨 **EMERGENCY ALERT**\n\n` +
      `The symptoms you described may indicate a **medical emergency**.\n\n` +
      `**Please call emergency services immediately:**\n` +
      `• 🇮🇳 India: **112**\n` +
      `• 🇺🇸 USA/Canada: **911**\n` +
      `• 🇬🇧 UK: **999**\n` +
      `• 🌍 International: **112**\n\n` +
      `Do not wait — early intervention saves lives.`,
  },

  mentalHealth: {
    patterns: [/suicid/i, /self[\s-]harm/i, /want to die/i, /kill myself/i],
    response: () =>
      `💙 I hear you, and I want you to know that **you matter**.\n\n` +
      `Please reach out to a crisis helpline right now:\n` +
      `• 🇮🇳 iCall (India): **9152987821**\n` +
      `• 🇺🇸 988 Suicide & Crisis Lifeline (USA): **988**\n` +
      `• 🌍 International: **findahelpline.com**\n\n` +
      `You don't have to face this alone. Trained counselors are available 24/7.`,
  },

  topics: [
    {
      patterns: [/fever|high\s*temp|temperature/i],
      response: () =>
        `**🌡️ Fever — What You Should Know**\n\n` +
        `A fever (≥ 38°C / 100.4°F in adults) is usually your immune system fighting an infection.\n\n` +
        `**Management:**\n` +
        `• Rest and stay well-hydrated (water, oral rehydration salts)\n` +
        `• Paracetamol (500–1000 mg) or Ibuprofen for discomfort — follow package dosing\n` +
        `• Lukewarm sponge bath to reduce temperature\n` +
        `• Light, easily digestible food\n\n` +
        `**See a doctor if:**\n` +
        `• Fever > 39.5°C (103°F) in adults\n` +
        `• Lasts more than 3 days\n` +
        `• Accompanied by stiff neck, rash, confusion, or difficulty breathing\n` +
        `• In infants under 3 months — ANY fever requires immediate medical attention`,
    },
    {
      patterns: [/headache|migraine|head\s*pain|head\s*ache/i],
      response: () =>
        `**🧠 Headache & Migraine Guide**\n\n` +
        `**Tension headache** (most common) — dull pressure, both sides\n` +
        `**Migraine** — throbbing, often one side, with nausea / light sensitivity\n` +
        `**Cluster headache** — severe, around one eye, in clusters\n\n` +
        `**Immediate relief:**\n` +
        `• Paracetamol or Ibuprofen (not more than 3 days/week)\n` +
        `• Hydrate — dehydration is a common trigger\n` +
        `• Rest in a quiet, dark room\n` +
        `• Cold or warm compress on forehead/neck\n\n` +
        `**Consult a doctor if:**\n` +
        `• Sudden, severe "thunderclap" headache\n` +
        `• Headache after head injury\n` +
        `• Accompanied by fever, stiff neck, vision changes, or confusion\n` +
        `• Progressively worsening over weeks`,
    },
    {
      patterns: [/cough|cold|runny\s*nose|nasal\s*congestion/i],
      response: () =>
        `**🤧 Cold & Cough Management**\n\n` +
        `Most colds are viral and resolve in 7–10 days without antibiotics.\n\n` +
        `**Symptom relief:**\n` +
        `• Warm salt-water gargle for sore throat\n` +
        `• Steam inhalation for congestion\n` +
        `• Honey + ginger tea (adults/children >1 yr)\n` +
        `• Antihistamines for runny nose; decongestants for stuffiness\n` +
        `• Increase fluid intake; rest\n\n` +
        `**Consult a doctor if:**\n` +
        `• Cough persists > 3 weeks\n` +
        `• Blood in sputum\n` +
        `• Breathing difficulty or wheezing\n` +
        `• Fever > 38.5°C persisting > 3 days`,
    },
    {
      patterns: [/diabetes|blood\s*sugar|insulin|glucose/i],
      response: () =>
        `**🩸 Diabetes — Key Information**\n\n` +
        `**Type 1:** Autoimmune — insulin-producing cells destroyed; requires insulin.\n` +
        `**Type 2:** Insulin resistance; managed with lifestyle + oral medications.\n\n` +
        `**Daily management:**\n` +
        `• Monitor fasting blood glucose (target: 70–130 mg/dL)\n` +
        `• HbA1c target: < 7% (discuss with your doctor)\n` +
        `• Low-glycaemic index diet; limit refined carbs and sugars\n` +
        `• 30 min moderate exercise most days\n` +
        `• Take medications as prescribed; never skip doses\n` +
        `• Regular eye, foot, and kidney check-ups\n\n` +
        `**Hypoglycaemia (low sugar) — act fast:**\n` +
        `Glucose tablets, fruit juice, or 15 g fast-acting carbs → recheck in 15 min`,
    },
    {
      patterns: [/blood\s*pressure|hypertension|bp\s*high/i],
      response: () =>
        `**❤️ Hypertension (High Blood Pressure)**\n\n` +
        `Normal BP: < 120/80 mmHg | Stage 1 HTN: 130–139/80–89 | Stage 2: ≥ 140/90\n\n` +
        `**Lifestyle changes (first-line):**\n` +
        `• DASH diet — fruits, vegetables, low-sodium, whole grains\n` +
        `• Reduce sodium to < 2,300 mg/day\n` +
        `• Aerobic exercise 150 min/week\n` +
        `• Limit alcohol; quit smoking\n` +
        `• Stress management (yoga, meditation)\n\n` +
        `**Medications** (as prescribed): ACE inhibitors, ARBs, beta-blockers, calcium-channel blockers, diuretics\n\n` +
        `⚠️ BP ≥ 180/120 with symptoms = **hypertensive crisis** — seek emergency care`,
    },
    {
      patterns: [/asthma|wheez|inhaler|bronch/i],
      response: () =>
        `**🫁 Asthma Management**\n\n` +
        `**Triggers to avoid:** dust mites, pet dander, pollen, smoke, cold air, exercise (if exercise-induced)\n\n` +
        `**Medication types:**\n` +
        `• **Reliever (rescue):** Short-acting β2 agonist (e.g., Salbutamol) — for acute symptoms\n` +
        `• **Controller (preventer):** Inhaled corticosteroid (e.g., Beclomethasone) — daily use\n\n` +
        `**During an attack:**\n` +
        `1. Sit upright, stay calm\n` +
        `2. Use rescue inhaler (1 puff every 30–60 s, up to 10 puffs)\n` +
        `3. Call emergency if no improvement in 15 min\n\n` +
        `**Always carry your rescue inhaler.**`,
    },
    {
      patterns: [/diet|nutrition|eating|food|weight\s*loss|obesity/i],
      response: () =>
        `**🥗 Nutrition & Healthy Eating**\n\n` +
        `**Balanced plate (per meal):**\n` +
        `• ½ plate: Non-starchy vegetables (broccoli, spinach, carrots)\n` +
        `• ¼ plate: Lean protein (chicken, fish, legumes, tofu)\n` +
        `• ¼ plate: Complex carbs (brown rice, whole wheat, oats)\n` +
        `• 1–2 tsp healthy fat (olive oil, nuts, avocado)\n\n` +
        `**Key habits:**\n` +
        `• Drink 8–10 glasses of water daily\n` +
        `• Limit ultra-processed foods, added sugar, saturated fats\n` +
        `• Eat at regular times; avoid skipping meals\n` +
        `• Fibre target: 25–30 g/day`,
    },
    {
      patterns: [/exercise|workout|fitness|physical\s*activity/i],
      response: () =>
        `**🏃 Exercise Recommendations**\n\n` +
        `**WHO guidelines for adults:**\n` +
        `• 150–300 min moderate aerobic activity per week (brisk walk, cycling, swimming)\n` +
        `• OR 75–150 min vigorous activity (running, HIIT)\n` +
        `• Muscle-strengthening exercises ≥ 2 days/week\n\n` +
        `**Benefits:** reduces cardiovascular risk, improves mood, controls weight, lowers BP\n\n` +
        `**Starting out:**\n` +
        `• Begin with 10–15 min walks and build gradually\n` +
        `• Warm up and cool down to prevent injury\n` +
        `• Stay hydrated; stop if you feel chest pain or dizziness`,
    },
    {
      patterns: [/sleep|insomnia|can't\s*sleep|tired/i],
      response: () =>
        `**😴 Sleep Hygiene Guide**\n\n` +
        `Adults need **7–9 hours** of quality sleep per night.\n\n` +
        `**Good sleep habits:**\n` +
        `• Fixed sleep/wake times — even on weekends\n` +
        `• Dark, cool (18–20°C), quiet bedroom\n` +
        `• No screens 60 min before bed (blue light suppresses melatonin)\n` +
        `• Avoid caffeine after 2 PM; limit alcohol\n` +
        `• Relaxing wind-down routine: reading, light stretching, meditation\n\n` +
        `**See a doctor if:**\n` +
        `• Insomnia > 3 nights/week for > 3 months\n` +
        `• Snoring + choking/gasping (possible sleep apnea)\n` +
        `• Excessive daytime sleepiness despite adequate sleep`,
    },
    {
      patterns: [/anxiety|stress|panic\s*attack|nervous|worry/i],
      response: () =>
        `**🧘 Anxiety & Stress Management**\n\n` +
        `**Immediate techniques:**\n` +
        `• **4-7-8 breathing:** inhale 4 s → hold 7 s → exhale 8 s (repeat 4×)\n` +
        `• **5-4-3-2-1 grounding:** name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste\n` +
        `• Progressive muscle relaxation\n\n` +
        `**Long-term strategies:**\n` +
        `• Regular aerobic exercise (natural mood booster)\n` +
        `• Limit caffeine and alcohol\n` +
        `• Cognitive-Behavioural Therapy (CBT) is highly effective\n` +
        `• Mindfulness meditation (even 10 min/day helps)\n\n` +
        `**Consider professional help if anxiety significantly impairs daily life**`,
    },
    {
      patterns: [/medication|medicine|drug|tablet|capsule|dose|dosage/i],
      response: () =>
        `**💊 Medication Safety**\n\n` +
        `**General principles:**\n` +
        `• Always follow the prescribed dose and schedule\n` +
        `• Complete full antibiotic courses — never stop early\n` +
        `• Inform all doctors about every medication you take (including supplements)\n` +
        `• Store medications correctly (away from heat, light, moisture)\n` +
        `• Never share prescription medications\n\n` +
        `⚠️ *For specific medication information, drug interactions, or dosing guidance, please consult your pharmacist or doctor — I cannot provide personalised prescribing advice.*`,
    },
    {
      patterns: [/vaccine|vaccination|immunis|immuniz/i],
      response: () =>
        `**💉 Vaccination Information**\n\n` +
        `Vaccines are one of the most effective public-health interventions available.\n\n` +
        `**Key adult vaccines to discuss with your doctor:**\n` +
        `• Influenza — annually\n` +
        `• COVID-19 — as per current guidelines\n` +
        `• Tetanus-Diphtheria (Td) booster — every 10 years\n` +
        `• Hepatitis B (if not previously vaccinated)\n` +
        `• HPV (up to age 45, as recommended)\n` +
        `• Pneumococcal — for adults ≥ 65 or high-risk groups\n\n` +
        `Vaccination schedules vary by country. Check your national health authority's recommendations.`,
    },
  ],
};

/* ── Response generator ──────────────────────────────────── */

/**
 * generateResponse(message, context)
 * Returns a markdown-formatted string response.
 *
 * @param {string} message  - User's input text
 * @param {object} [context] - Optional context { userName, recentDiagnosis }
 * @returns {string}
 */
const generateResponse = (message, context = {}) => {
  const msg = (message || '').trim();
  if (!msg) return "I didn't catch that. Could you please rephrase your question?";

  // Emergency check first (highest priority)
  for (const pattern of KNOWLEDGE.emergency.patterns) {
    if (pattern.test(msg)) return KNOWLEDGE.emergency.response(msg);
  }

  // Mental health crisis
  for (const pattern of KNOWLEDGE.mentalHealth.patterns) {
    if (pattern.test(msg)) return KNOWLEDGE.mentalHealth.response();
  }

  // Greetings
  for (const pattern of KNOWLEDGE.greetings.patterns) {
    if (pattern.test(msg)) return KNOWLEDGE.greetings.response();
  }

  // Topic matching
  for (const topic of KNOWLEDGE.topics) {
    for (const pattern of topic.patterns) {
      if (pattern.test(msg)) return topic.response();
    }
  }

  // Contextual fallback
  const name = context.userName ? `, ${context.userName.split(' ')[0]}` : '';
  return (
    `I understand you're asking about: *"${msg.substring(0, 60)}${msg.length > 60 ? '…' : ''}"*\n\n` +
    `While I can share general medical information, I don't have enough specifics to give you a precise answer on that topic${name}.\n\n` +
    `**Here's what I suggest:**\n` +
    `• Use the **Symptom Checker** if you have specific symptoms\n` +
    `• Use **Disease Search** for detailed condition information\n` +
    `• For personalised medical advice, consult a qualified healthcare professional\n\n` +
    `Is there a specific health topic I can help clarify?`
  );
};

/**
 * classifyTopic(message) — returns a short topic label for logging / analytics.
 */
const classifyTopic = (message) => {
  const msg = (message || '').toLowerCase();
  const map = [
    ['emergency',    /chest pain|can't breathe|stroke|seizure/i],
    ['fever',        /fever|temperature/i],
    ['headache',     /headache|migraine/i],
    ['respiratory',  /cough|cold|asthma|wheez/i],
    ['diabetes',     /diabetes|blood sugar|insulin/i],
    ['hypertension', /blood pressure|hypertension/i],
    ['mental_health',/anxiety|stress|depression|panic/i],
    ['nutrition',    /diet|food|nutrition|weight|eat|eating|meal/i],
    ['medication',   /medication|drug|tablet|dose/i],
    ['sleep',        /sleep|insomnia/i],
    ['general',      /.*/],
  ];
  return map.find(([, re]) => re.test(msg))?.[0] ?? 'general';
};

module.exports = { generateResponse, classifyTopic };
