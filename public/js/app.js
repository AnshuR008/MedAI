// ============================================================
// MedAI - Page-Specific Application Logic
// ============================================================

// ==================== TAG INPUT FOR SYMPTOMS ====================
class TagInput {
  constructor(wrapper, input) {
    this.wrapper = wrapper;
    this.input = input;
    this.tags = [];
    this.init();
  }

  init() {
    if (!this.wrapper || !this.input) return;

    this.wrapper.addEventListener('click', () => this.input.focus());

    this.input.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && this.input.value.trim()) {
        e.preventDefault();
        this.addTag(this.input.value.trim().replace(',', ''));
      }
      if (e.key === 'Backspace' && !this.input.value && this.tags.length) {
        this.removeTag(this.tags.length - 1);
      }
    });

    this.input.addEventListener('blur', () => {
      if (this.input.value.trim()) {
        this.addTag(this.input.value.trim());
      }
    });
  }

  addTag(text) {
    const clean = text.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
    if (!clean || this.tags.includes(clean)) return;

    this.tags.push(clean);
    this.input.value = '';

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${clean} <button class="tag-remove" onclick=""><i class="fas fa-times"></i></button>`;
    tag.querySelector('.tag-remove').addEventListener('click', () => {
      const idx = this.tags.indexOf(clean);
      this.removeTag(idx);
      tag.remove();
    });

    this.wrapper.insertBefore(tag, this.input);
    this.onChange?.();
  }

  removeTag(idx) {
    this.tags.splice(idx, 1);
    this.onChange?.();
  }

  getTags() { return [...this.tags]; }

  clear() {
    this.tags = [];
    this.wrapper.querySelectorAll('.tag').forEach(t => t.remove());
  }
}

// ==================== PREDICT PAGE ====================
function initPredictPage() {
  const predictForm = document.getElementById('predictForm');
  if (!predictForm) return;

  const tagsWrapper = document.getElementById('tagsWrapper');
  const tagsInput = document.getElementById('tagsInput');
  const voiceBtn = document.getElementById('voiceBtn');
  const predictBtn = document.getElementById('predictBtn');
  const resultsSection = document.getElementById('resultsSection');

  const tagInput = new TagInput(tagsWrapper, tagsInput);

  // Voice input
  if (voiceBtn) {
    const supported = VoiceInput.init((transcript) => {
      voiceBtn.classList.remove('recording');
      voiceBtn.title = 'Start voice input';
      // Parse transcript as comma-separated symptoms
      const parts = transcript.split(/,|and|also|\./i).map(s => s.trim()).filter(s => s.length > 2);
      parts.forEach(p => tagInput.addTag(p));
      showToast(`Voice input: "${transcript}"`, 'success');
    }, (err) => {
      voiceBtn.classList.remove('recording');
      showToast(`Voice error: ${err}`, 'error');
    });

    if (!supported) {
      voiceBtn.title = 'Voice input not supported in this browser';
      voiceBtn.style.opacity = '0.4';
    }

    voiceBtn.addEventListener('click', () => {
      if (!supported) {
        showToast('Voice input not supported in your browser. Try Chrome.', 'warning');
        return;
      }
      const listening = VoiceInput.toggle();
      voiceBtn.classList.toggle('recording', listening);
      voiceBtn.title = listening ? 'Stop recording' : 'Start voice input';
    });
  }

  // Quick symptom suggestions
  document.querySelectorAll('.symptom-suggestion').forEach(btn => {
    btn.addEventListener('click', () => tagInput.addTag(btn.textContent.trim()));
  });

  // Form submit
  predictForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const symptoms = tagInput.getTags();

    if (symptoms.length === 0) {
      showToast('Please enter at least one symptom', 'warning');
      tagsInput.focus();
      return;
    }

    setButtonLoading(predictBtn, true, 'Analyzing...');

    try {
      const data = await api.post('/api/predict', { symptoms, inputMethod: 'text' });

      if (data.success) {
        renderResults(data.prediction);
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(predictBtn, false);
    }
  });

  function renderResults(prediction) {
    const primary = prediction.primaryDiagnosis;
    const predictions = prediction.predictions;

    resultsSection.style.display = 'block';

    // Primary diagnosis
    const primaryHTML = `
      <div class="primary-diagnosis mb-6">
        <div class="diagnosis-header">
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.6;margin-bottom:8px">Primary Diagnosis</div>
            <div class="diagnosis-name">${primary.disease}</div>
            <div class="diagnosis-description mt-2">${primary.description}</div>
          </div>
          <div class="confidence-ring">
            <div class="confidence-value">${predictions[0]?.probability || 0}%</div>
            <div class="confidence-label">Confidence</div>
          </div>
        </div>
        <div class="mt-4">
          <div style="font-size:12px;opacity:0.7;margin-bottom:6px">Symptoms matched: ${prediction.symptoms.join(', ')}</div>
        </div>
      </div>

      <div class="prediction-cards-grid">
        <div class="prediction-info-card">
          <h4><i class="fas fa-pills"></i> Medications</h4>
          <ul>${(primary.medications || []).map(m => `<li>${m}</li>`).join('')}</ul>
        </div>
        <div class="prediction-info-card">
          <h4><i class="fas fa-shield-virus"></i> Precautions</h4>
          <ul>${(primary.precautions || []).map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        <div class="prediction-info-card">
          <h4><i class="fas fa-utensils"></i> Diet Plan</h4>
          <ul>${(primary.dietPlan || []).map(d => `<li>${d}</li>`).join('')}</ul>
        </div>
        <div class="prediction-info-card">
          <h4><i class="fas fa-running"></i> Exercise</h4>
          <ul>${(primary.exercises || []).map(ex => `<li>${ex}</li>`).join('')}</ul>
        </div>
      </div>

      ${primary.whenToSeeDoctor ? `
        <div class="alert alert-warning mt-4">
          <i class="fas fa-user-md"></i>
          <div><strong>When to see a doctor:</strong> ${primary.whenToSeeDoctor}</div>
        </div>
      ` : ''}

      ${predictions.length > 1 ? `
        <div class="card mt-4">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-list"></i> Other Possible Conditions</div>
          </div>
          ${predictions.slice(1).map(p => `
            <div class="mb-4">
              <div class="d-flex justify-between align-center mb-2">
                <span style="font-size:14px;font-weight:600">${p.disease}</span>
                <span style="font-size:13px;color:var(--text-muted)">${p.probability}%</span>
              </div>
              <div class="progress">
                <div class="progress-bar" style="width:${p.probability}%"></div>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${p.description || ''}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="alert alert-info mt-4">
        <i class="fas fa-info-circle"></i>
        <div>This AI analysis is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.</div>
      </div>

      <div class="d-flex gap-2 mt-4 flex-wrap">
        <button class="btn btn-primary" onclick="generateReport('${prediction.id}')">
          <i class="fas fa-file-medical"></i> Generate Report
        </button>
        <button class="btn btn-outline" onclick="window.location.href='/history'">
          <i class="fas fa-history"></i> View History
        </button>
      </div>
    `;

    resultsSection.innerHTML = `<div class="prediction-results">${primaryHTML}</div>`;
  }

  window.generateReport = async (predictionId) => {
    try {
      const data = await api.post(`/api/prediction/${predictionId}/report`, {});
      if (data.success) {
        showToast(`Report generated: ${data.report.reportId}`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// ==================== CHAT PAGE ====================
function initChatPage() {
  const messagesArea = document.getElementById('messagesArea');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');

  if (!messagesArea || !chatInput) return;

  let currentChatId = null;

  function appendMessage(role, content, time) {
    const isUser = role === 'user';
    const initial = isUser ? 'You'.charAt(0) : 'AI';
    const msgTime = time ? timeAgo(time) : 'Just now';

    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
    div.innerHTML = `
      <div class="message-avatar">${initial}</div>
      <div>
        <div class="message-bubble">${content.replace(/\n/g, '<br>')}</div>
        <div class="message-time">${msgTime}</div>
      </div>
    `;

    if (typingIndicator && typingIndicator.parentNode === messagesArea) {
      messagesArea.insertBefore(div, typingIndicator);
    } else {
      messagesArea.appendChild(div);
    }

    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function showTyping(show) {
    if (typingIndicator) typingIndicator.style.display = show ? 'flex' : 'none';
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    appendMessage('user', message);
    showTyping(true);

    if (sendBtn) sendBtn.disabled = true;

    try {
      const data = await api.post('/api/chat', { message, chatId: currentChatId });

      showTyping(false);

      if (data.success) {
        currentChatId = data.chatId;
        setTimeout(() => appendMessage('assistant', data.response, data.timestamp), 300);

        // Update chat list
        const chatList = document.getElementById('chatList');
        if (chatList && !document.querySelector(`[data-chat-id="${data.chatId}"]`)) {
          const item = document.createElement('div');
          item.className = 'chat-item active';
          item.dataset.chatId = data.chatId;
          item.innerHTML = `
            <div class="chat-item-title">${message.substring(0, 35)}${message.length > 35 ? '...' : ''}</div>
            <div class="chat-item-time">Just now</div>
          `;
          chatList.prepend(item);
        }
      }
    } catch (err) {
      showTyping(false);
      showToast(err.message, 'error');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  sendBtn?.addEventListener('click', sendMessage);

  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatInput?.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Load existing chat
  document.querySelectorAll('.chat-item[data-chat-id]').forEach(item => {
    item.addEventListener('click', async () => {
      document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentChatId = item.dataset.chatId;

      messagesArea.innerHTML = '';
      if (typingIndicator) messagesArea.appendChild(typingIndicator);

      try {
        const data = await api.get(`/api/chat/${currentChatId}`);
        if (data.success) {
          data.chat.messages.forEach(m => appendMessage(m.role, m.content, m.timestamp));
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // New chat
  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    currentChatId = null;
    messagesArea.innerHTML = '';
    if (typingIndicator) messagesArea.appendChild(typingIndicator);
    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));

    const welcome = document.createElement('div');
    welcome.className = 'message assistant-message';
    welcome.innerHTML = `
      <div class="message-avatar">AI</div>
      <div>
        <div class="message-bubble">Hello! I'm MedAI Assistant. How can I help you today? You can ask me about symptoms, diseases, medications, or any health-related questions.</div>
        <div class="message-time">Just now</div>
      </div>
    `;
    messagesArea.prepend(welcome);
    chatInput.focus();
  });
}

// ==================== DISEASE SEARCH PAGE ====================
function initDiseasePage() {
  const searchInput = document.getElementById('diseaseSearch');
  const searchBtn = document.getElementById('diseaseSearchBtn');
  const resultsDiv = document.getElementById('diseaseResults');

  if (!searchInput) return;

  let searchTimeout;

  async function performSearch(query) {
    if (!query.trim()) return;

    resultsDiv.innerHTML = `
      <div class="empty-state">
        <div class="loading-spinner dark" style="width:32px;height:32px;margin:0 auto 16px"></div>
        <p>Searching medical database...</p>
      </div>
    `;

    try {
      const data = await api.get(`/api/search-disease?query=${encodeURIComponent(query)}`);

      if (!data.found) {
        resultsDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-search"></i></div>
            <h3>No results for "${query}"</h3>
            <p>${data.message}</p>
            ${data.suggestions ? `
              <div style="margin-top:20px">
                <p style="margin-bottom:10px;font-size:14px;font-weight:600">Try searching for:</p>
                <div class="d-flex gap-2 flex-wrap justify-center" style="justify-content:center">
                  ${data.suggestions.map(s => `<button class="btn btn-outline btn-sm suggestion-btn">${s}</button>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            searchInput.value = btn.textContent;
            performSearch(btn.textContent);
          });
        });
        return;
      }

      const d = data.disease;
      resultsDiv.innerHTML = `
        <div class="disease-result">
          <div class="disease-header">
            <div>
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.6;margin-bottom:6px">Disease Information</div>
              <div class="disease-name">${d.name?.charAt(0).toUpperCase() + d.name?.slice(1) || query}</div>
              <div class="disease-description">${d.description}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
              ${d.severity ? `<span class="badge badge-${d.severity === 'severe' ? 'danger' : d.severity === 'moderate' ? 'warning' : 'success'}">${d.severity}</span>` : ''}
              ${d.category ? `<span class="badge badge-info">${d.category}</span>` : ''}
            </div>
          </div>

          <div class="info-grid">
            ${d.symptoms?.length ? `
              <div class="info-card">
                <div class="info-card-title"><i class="fas fa-thermometer-half"></i> Symptoms</div>
                <ul class="info-list">${d.symptoms.map(s => `<li>${s}</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${d.medications?.length ? `
              <div class="info-card">
                <div class="info-card-title"><i class="fas fa-pills"></i> Medications</div>
                <ul class="info-list">${d.medications.map(m => `<li>${typeof m === 'object' ? m.name : m}</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${d.precautions?.length ? `
              <div class="info-card">
                <div class="info-card-title"><i class="fas fa-shield-alt"></i> Precautions</div>
                <ul class="info-list">${d.precautions.map(p => `<li>${p}</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${d.dietPlan?.length ? `
              <div class="info-card">
                <div class="info-card-title"><i class="fas fa-utensils"></i> Diet Plan</div>
                <ul class="info-list">${d.dietPlan.map(item => `<li>${typeof item === 'object' ? item.recommendation : item}</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${d.exercises?.length ? `
              <div class="info-card">
                <div class="info-card-title"><i class="fas fa-dumbbell"></i> Exercises</div>
                <ul class="info-list">${d.exercises.map(ex => `<li>${typeof ex === 'object' ? ex.name : ex}</li>`).join('')}</ul>
              </div>
            ` : ''}

            ${d.whenToSeeDoctor ? `
              <div class="info-card" style="border-left:3px solid var(--warning)">
                <div class="info-card-title"><i class="fas fa-user-md"></i> When to See Doctor</div>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${d.whenToSeeDoctor}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } catch (err) {
      resultsDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> ${err.message}</div>`;
    }
  }

  searchBtn?.addEventListener('click', () => performSearch(searchInput.value));

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch(searchInput.value);
  });

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    if (searchInput.value.length >= 3) {
      searchTimeout = setTimeout(() => performSearch(searchInput.value), 600);
    }
  });
}

// ==================== ANALYTICS PAGE ====================
function initAnalyticsPage() {
  if (!document.getElementById('topDiseasesChart')) return;

  loadAnalytics();

  async function loadAnalytics() {
    try {
      const data = await api.get('/api/analytics');
      if (!data.success) return;

      const a = data.analytics;

      // Update stat counters
      const totalEl = document.getElementById('totalPredictions');
      const chatsEl = document.getElementById('totalChats');
      const reportsEl = document.getElementById('totalReports');

      if (totalEl) animateCount(totalEl, a.totalPredictions);
      if (chatsEl) animateCount(chatsEl, a.totalChats);
      if (reportsEl) animateCount(reportsEl, a.totalReports);

      // Top diseases chart
      const topCtx = document.getElementById('topDiseasesChart')?.getContext('2d');
      if (topCtx && a.topDiseases.length) {
        new Chart(topCtx, {
          type: 'bar',
          data: {
            labels: a.topDiseases.map(d => d.disease),
            datasets: [{
              label: 'Predictions',
              data: a.topDiseases.map(d => d.count),
              backgroundColor: 'rgba(0, 180, 216, 0.8)',
              borderColor: 'rgba(0, 180, 216, 1)',
              borderWidth: 2,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // Daily predictions chart
      const dailyCtx = document.getElementById('dailyPredictionsChart')?.getContext('2d');
      if (dailyCtx && a.dailyCounts.length) {
        new Chart(dailyCtx, {
          type: 'line',
          data: {
            labels: a.dailyCounts.map(d => d.date),
            datasets: [{
              label: 'Daily Predictions',
              data: a.dailyCounts.map(d => d.count),
              borderColor: 'var(--teal)',
              backgroundColor: 'rgba(0, 180, 216, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'var(--teal)',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // Severity distribution donut
      const severityCtx = document.getElementById('severityChart')?.getContext('2d');
      if (severityCtx && a.categoryDistribution.length) {
        const colors = {
          'mild': '#10b981', 'moderate': '#f59e0b',
          'severe': '#ef4444', 'critical': '#7c3aed'
        };
        new Chart(severityCtx, {
          type: 'doughnut',
          data: {
            labels: a.categoryDistribution.map(c => c.category || 'Other'),
            datasets: [{
              data: a.categoryDistribution.map(c => c.count),
              backgroundColor: a.categoryDistribution.map(c => colors[c.category] || '#94a3b8'),
              borderWidth: 2, borderColor: 'white'
            }]
          },
          options: {
            responsive: true,
            cutout: '65%',
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }

    } catch (err) {
      console.error('Analytics load error:', err);
    }
  }
}

// ==================== ADMIN PAGE ====================
function initAdminPage() {
  if (!document.getElementById('adminUsersTable')) return;

  loadAdminStats();

  async function loadAdminStats() {
    try {
      const data = await api.get('/api/admin/stats');
      if (!data.success) return;

      const s = data.stats;

      // Update counters
      ['totalUsers', 'totalPredictions', 'totalChats', 'activeUsersToday'].forEach(key => {
        const el = document.getElementById(key);
        if (el && s[key] !== undefined) animateCount(el, s[key]);
      });

      // Top diseases chart
      const ctx = document.getElementById('adminDiseasesChart')?.getContext('2d');
      if (ctx && s.topDiseases.length) {
        new Chart(ctx, {
          type: 'horizontalBar',
          type: 'bar',
          data: {
            labels: s.topDiseases.slice(0, 8).map(d => d.disease),
            datasets: [{
              data: s.topDiseases.slice(0, 8).map(d => d.count),
              backgroundColor: s.topDiseases.slice(0, 8).map((_, i) =>
                `hsl(${195 + i * 15}, 80%, ${55 - i * 3}%)`
              ),
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              y: { grid: { display: false } }
            }
          }
        });
      }

      // User signups trend
      const signupCtx = document.getElementById('signupTrendChart')?.getContext('2d');
      if (signupCtx && s.dailySignups.length) {
        new Chart(signupCtx, {
          type: 'line',
          data: {
            labels: s.dailySignups.map(d => d.date),
            datasets: [
              {
                label: 'New Users',
                data: s.dailySignups.map(d => d.count),
                borderColor: '#06d6a0',
                backgroundColor: 'rgba(6, 214, 160, 0.1)',
                fill: true, tension: 0.4
              },
              {
                label: 'Predictions',
                data: s.dailyPredictions.map(d => d.count),
                borderColor: '#00b4d8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                fill: true, tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // Render recent users table
      const tbody = document.getElementById('adminUsersTable');
      if (tbody && s.recentUsers.length) {
        tbody.innerHTML = s.recentUsers.map(u => `
          <tr>
            <td>
              <div class="d-flex align-center gap-2">
                <div class="user-avatar" style="width:32px;height:32px;font-size:12px">${u.name.charAt(0)}</div>
                <div>
                  <div style="font-weight:600;font-size:13px">${u.name}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${u.email}</div>
                </div>
              </div>
            </td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-danger' : 'badge-primary'}">${u.role}</span></td>
            <td style="font-size:13px;color:var(--text-muted)">${new Date(u.createdAt).toLocaleDateString()}</td>
            <td style="font-size:13px">${u.loginCount || 0}</td>
            <td>
              <button class="btn btn-sm btn-outline toggle-user-btn" data-id="${u._id}">
                <i class="fas fa-toggle-on"></i>
              </button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.toggle-user-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            try {
              const data = await api.put(`/api/admin/users/${btn.dataset.id}/toggle`, {});
              showToast(data.message, 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      }

    } catch (err) {
      showToast('Failed to load admin stats', 'error');
    }
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  initPredictPage();
  initChatPage();
  initDiseasePage();
  initAnalyticsPage();
  initAdminPage();
});
