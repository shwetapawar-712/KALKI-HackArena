/* ===================================================
   Main App Controller
   Navigation, UI, Notifications, Init
   =================================================== */

// ===== THEME TOGGLE =====
function changeTheme(themeValue) {
  const root = document.documentElement;
  if (themeValue === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  localStorage.setItem('sanskriti_theme', themeValue);
}

// ===== NAVIGATION =====
function navigateTo(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Show target page
  const target = document.getElementById(`page-${pageName}`);
  if (target) {
    target.classList.add('active');
  }

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  // Close mobile menu
  document.getElementById('navLinks')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('active');
}

// ===== VOICE TOGGLE =====
function toggleVoice() {
  SanskritiAssistant.toggleListening();
}

// ===== ASSISTANT CARD =====
function hideAssistantCard() {
  const card = document.getElementById('assistantCard');
  if (card) card.style.display = 'none';
}

// ===== LANGUAGE =====
function changeLanguage(lang) {
  SanskritiAssistant.setLanguage(lang);

  // Update nav dropdown
  const options = document.querySelectorAll('.lang-option');
  options.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === lang);
  });

  // Update label
  const activeOpt = document.querySelector(`.lang-option[data-lang="${lang}"]`);
  if (activeOpt) {
    document.getElementById('currentLangLabel').textContent = activeOpt.dataset.label;
  }

  // Update settings dropdown
  const settingsLang = document.getElementById('settingsLang');
  if (settingsLang) settingsLang.value = lang;

  // Update greeting
  updateGreeting();

  // Close dropdown
  document.getElementById('langSelector')?.classList.remove('open');
}

// ===== SPEECH SETTINGS =====
function updateSpeechRate(val) {
  SanskritiAssistant.setRate(val);
  document.getElementById('speechRateVal').textContent = parseFloat(val).toFixed(1);
}

function updateSpeechPitch(val) {
  SanskritiAssistant.setPitch(val);
  document.getElementById('speechPitchVal').textContent = parseFloat(val).toFixed(1);
}

// ===== NOTIFICATIONS =====
function showNotification(type, icon, title, message) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.innerHTML = `
    <span class="notif-icon">${icon}</span>
    <div class="notif-content">
      <div class="notif-title">${title}</div>
      <div class="notif-message">${message}</div>
    </div>
    <button class="notif-close" onclick="this.parentElement.classList.add('leaving'); setTimeout(()=>this.parentElement.remove(), 300)">✕</button>
  `;

  container.appendChild(notif);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notif.parentElement) {
      notif.classList.add('leaving');
      setTimeout(() => notif.remove(), 300);
    }
  }, 5000);
}

// ===== GREETING =====
function updateGreeting() {
  const greeting = SanskritiAssistant.getGreeting();
  const el = document.getElementById('greetingText');
  if (el) el.textContent = greeting.split('!')[0] + '!';

  const subtitle = document.getElementById('greetingSubtitle');
  if (subtitle) {
    const parts = greeting.split('!');
    subtitle.textContent = parts.length > 1 ? parts[1].trim() : '';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Load theme
  const savedTheme = localStorage.getItem('sanskriti_theme') || 'light';
  changeTheme(savedTheme);
  const settingsTheme = document.getElementById('settingsTheme');
  if (settingsTheme) settingsTheme.value = savedTheme;

  // Init assistant
  SanskritiAssistant.init();

  // Load voices (needs a small delay in some browsers)
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // Set greeting
  updateGreeting();

  // Load notes
  loadNotes();

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }
  });

  // Nav link clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Hamburger
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      document.getElementById('navLinks').classList.toggle('open');
    });
  }

  // Language dropdown
  const langBtn = document.getElementById('langBtn');
  const langSelector = document.getElementById('langSelector');
  if (langBtn && langSelector) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langSelector.classList.toggle('open');
    });

    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', () => {
        changeLanguage(opt.dataset.lang);
      });
    });

    // Close on outside click
    document.addEventListener('click', () => {
      langSelector.classList.remove('open');
    });
  }

  // Welcome message after a short delay
  setTimeout(() => {
    const welcomeText = SanskritiAssistant.getTranslation('welcome');
    showNotification('info', '🙏', 'Sanskriti', welcomeText);
    SanskritiAssistant.speak(welcomeText);
  }, 1000);

  // Play subtle chime (optional)
  playChime();
});

// ===== CHIME SOUND (Web Audio API) =====
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Audio context not available, skip chime
  }
}

// Keyboard shortcut: Space to toggle voice (when not focused on input)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    toggleVoice();
  }
});
