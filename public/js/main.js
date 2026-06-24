// ============================================================
// MedAI Platform - Core JavaScript
// ============================================================

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
  });
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('visible');
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
  });
}

// Current date in topbar
const dateEl = document.getElementById('currentDate');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

// ==================== TOAST SYSTEM ====================
window.showToast = function(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info}"></i>
    <span class="toast-msg">${message}</span>
    <span class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// ==================== API HELPER ====================
window.api = {
  async request(url, options = {}) {
    const defaults = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    const config = { ...defaults, ...options };
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const res = await fetch(url, config);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Request failed: ${res.status}`);
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError') {
        throw new Error('Network error. Please check your connection.');
      }
      throw err;
    }
  },

  get: (url) => window.api.request(url),
  post: (url, body) => window.api.request(url, { method: 'POST', body }),
  put: (url, body) => window.api.request(url, { method: 'PUT', body }),
  delete: (url) => window.api.request(url, { method: 'DELETE' })
};

// ==================== COUNT-UP ANIMATION ====================
function animateCount(el, target, duration = 1500) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const update = () => {
    current = Math.min(current + increment, target);
    el.textContent = Math.floor(current).toLocaleString();
    if (current < target) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

// Run count animations on stat cards
document.querySelectorAll('.stat-value[data-count]').forEach(el => {
  const target = parseInt(el.dataset.count);
  if (!isNaN(target)) {
    animateCount(el, target);
  }
});

// ==================== FORM HELPERS ====================
window.setButtonLoading = function(btn, loading, text) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> ${text || 'Processing...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || text || 'Submit';
  }
};

// ==================== PASSWORD TOGGLE ====================
document.querySelectorAll('[data-toggle-password]').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.togglePassword;
    const input = document.getElementById(targetId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      btn.querySelector('i')?.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      btn.querySelector('i')?.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

// ==================== VOICE RECOGNITION ====================
window.VoiceInput = {
  recognition: null,
  isListening: false,

  init(onResult, onError) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
      this.isListening = false;
    };

    this.recognition.onerror = (event) => {
      if (onError) onError(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    return true;
  },

  toggle() {
    if (!this.recognition) return false;
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.recognition.start();
      this.isListening = true;
    }
    return this.isListening;
  }
};

// ==================== CHART DEFAULTS ====================
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = 'DM Sans';
  Chart.defaults.color = '#64748b';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 16;
}

// Format relative time
window.timeAgo = function(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
};

// Check URL params for messages
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('message')) {
  setTimeout(() => showToast(urlParams.get('message'), 'info'), 200);
}
if (urlParams.get('error')) {
  setTimeout(() => showToast(urlParams.get('error'), 'error'), 200);
}
