// ═══════════════════════════════════════════════════════════════
//  SecurePulse Extension — Popup Logic
// ═══════════════════════════════════════════════════════════════

const API_BASE = 'https://securepulse-backend.onrender.com';

// ── State ─────────────────────────────────────────────────────
let currentUrl = '';
let currentUser = null;
let scanResults = null;
let showAllFindings = false;

// ── DOM Elements ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Get the current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || '';
    $('url-text').textContent = currentUrl || 'Unable to detect URL';
  } catch (e) {
    $('url-text').textContent = 'Unable to detect URL';
  }

  // 2. Check for saved session
  try {
    const stored = await chrome.storage.local.get(['user', 'skipAuth']);
    if (stored.user) {
      currentUser = stored.user;
      showLoggedIn();
    } else if (stored.skipAuth) {
      showLoggedIn(); // guest mode
    } else {
      showAuthSection();
    }
  } catch (e) {
    // If chrome.storage fails (dev environment), just show scan
    showLoggedIn();
  }

  // 3. Bind events
  $('scan-btn').addEventListener('click', startScan);
  $('auth-login-btn').addEventListener('click', handleLogin);
  $('auth-skip-btn').addEventListener('click', handleSkipAuth);
  $('logout-btn').addEventListener('click', handleLogout);
  $('retry-btn').addEventListener('click', startScan);
  $('rescan-btn').addEventListener('click', () => {
    showSection('url');
    scanResults = null;
  });
  $('toggle-findings').addEventListener('click', toggleFindings);

  // Enter key on auth inputs
  $('auth-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ── Section Visibility ────────────────────────────────────────
function showSection(name) {
  ['url-section', 'loading-section', 'results-section', 'error-section', 'auth-section'].forEach(id => {
    $(id).classList.add('hidden');
  });

  switch (name) {
    case 'url':     $('url-section').classList.remove('hidden'); break;
    case 'loading': $('loading-section').classList.remove('hidden'); break;
    case 'results': $('results-section').classList.remove('hidden'); break;
    case 'error':   $('error-section').classList.remove('hidden'); break;
    case 'auth':    $('auth-section').classList.remove('hidden'); break;
  }
}

function showAuthSection() {
  $('user-badge').classList.add('hidden');
  showSection('auth');
}

function showLoggedIn() {
  $('auth-section').classList.add('hidden');

  if (currentUser) {
    $('user-badge').classList.remove('hidden');
    $('user-name').textContent = currentUser.name || 'User';
    $('user-email').textContent = currentUser.email || '';
  } else {
    $('user-badge').classList.add('hidden');
  }

  showSection('url');
}

// ── Auth Handlers ─────────────────────────────────────────────
async function handleLogin() {
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value.trim();

  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }

  $('auth-login-btn').textContent = 'Signing in...';
  $('auth-login-btn').disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();
    currentUser = data.user;

    // Save session
    await chrome.storage.local.set({ user: currentUser });

    showLoggedIn();
  } catch (e) {
    showAuthError(e.message || 'Unable to connect to server');
  } finally {
    $('auth-login-btn').textContent = 'Sign In';
    $('auth-login-btn').disabled = false;
  }
}

async function handleSkipAuth() {
  try {
    await chrome.storage.local.set({ skipAuth: true });
  } catch (e) {}
  showLoggedIn();
}

async function handleLogout() {
  currentUser = null;
  try {
    await chrome.storage.local.remove(['user', 'skipAuth']);
  } catch (e) {}
  showAuthSection();
}

function showAuthError(msg) {
  const el = $('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ── Scan Logic ────────────────────────────────────────────────
async function startScan() {
  if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://') || currentUrl.startsWith('about:')) {
    showError('Cannot scan browser internal pages. Navigate to a website first.');
    return;
  }

  showSection('loading');
  setStatus('scanning', 'Scanning');

  // Animate the progress and steps
  animateProgress();

  try {
    const body = {
      website_url: currentUrl,
      app_url: '',
      repo_url: '',
      scanner_type: 'python',
      user_id: currentUser?.id || null,
    };

    const res = await fetch(`${API_BASE}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error (${res.status})`);
    }

    scanResults = await res.json();

    // Complete the progress animation
    completeProgress();

    // Short delay so the user sees the final step animation
    setTimeout(() => {
      displayResults(scanResults);
      setStatus('ready', 'Complete');

      // Notify background to update badge
      try {
        chrome.runtime.sendMessage({
          action: 'scanComplete',
          data: {
            url: currentUrl,
            score: scanResults.final.score,
            grade: scanResults.final.grade,
          },
        });
      } catch (e) {}
    }, 600);

  } catch (e) {
    showError(e.message || 'Connection failed. Is the backend running?');
    setStatus('error', 'Error');
  }
}

// ── Progress Animation ────────────────────────────────────────
let progressInterval = null;
function animateProgress() {
  let progress = 0;
  const steps = ['step-headers', 'step-ssl', 'step-vulns', 'step-score'];
  const descs = [
    'Checking security headers and cookies...',
    'Analyzing SSL/TLS configuration...',
    'Detecting vulnerabilities and injections...',
    'Calculating final security score...',
  ];

  // Reset steps
  steps.forEach(s => {
    $(s).classList.remove('active', 'done');
  });
  $(steps[0]).classList.add('active');
  $('progress-fill').style.width = '0%';

  let stepIdx = 0;
  progressInterval = setInterval(() => {
    progress += Math.random() * 8 + 2;
    if (progress > 85) progress = 85; // cap at 85 until real completion

    $('progress-fill').style.width = `${progress}%`;

    const newStepIdx = Math.min(Math.floor(progress / 22), steps.length - 1);
    if (newStepIdx > stepIdx) {
      $(steps[stepIdx]).classList.remove('active');
      $(steps[stepIdx]).classList.add('done');
      stepIdx = newStepIdx;
      $(steps[stepIdx]).classList.add('active');
      $('loading-desc').textContent = descs[stepIdx];
    }
  }, 400);
}

function completeProgress() {
  clearInterval(progressInterval);
  $('progress-fill').style.width = '100%';

  const steps = ['step-headers', 'step-ssl', 'step-vulns', 'step-score'];
  steps.forEach(s => {
    $(s).classList.remove('active');
    $(s).classList.add('done');
  });
}

// ── Display Results ───────────────────────────────────────────
function displayResults(data) {
  const { final, findings } = data;

  // Grade badge
  const gradeBadge = $('grade-badge');
  gradeBadge.textContent = final.grade;
  gradeBadge.className = `grade-badge grade-${final.grade}`;

  // Score
  $('score-value').textContent = final.score;
  $('score-message').textContent = final.message;

  // Score bar
  const barFill = $('score-bar-fill');
  const barColor = final.score >= 70 ? '#00b894' : final.score >= 40 ? '#fdcb6e' : '#d63031';
  barFill.style.background = `linear-gradient(90deg, ${barColor}aa, ${barColor})`;
  setTimeout(() => { barFill.style.width = `${final.score}%`; }, 100);

  // Severity counts
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, PASS: 0 };
  findings.forEach(f => {
    if (counts.hasOwnProperty(f.severity)) counts[f.severity]++;
  });
  $('count-critical').textContent = counts.CRITICAL;
  $('count-high').textContent = counts.HIGH;
  $('count-medium').textContent = counts.MEDIUM;
  $('count-pass').textContent = counts.PASS;

  // Findings list
  renderFindings(findings);

  showSection('results');
}

function renderFindings(findings) {
  const list = $('findings-list');
  const toggleBtn = $('toggle-findings');

  // If not showing all, show only non-PASS (max 6)
  let displayFindings;
  if (showAllFindings) {
    displayFindings = findings;
    toggleBtn.textContent = 'Show Less';
  } else {
    displayFindings = findings.filter(f => f.severity !== 'PASS').slice(0, 6);
    toggleBtn.textContent = `Show All (${findings.length})`;
  }

  if (displayFindings.length === 0) {
    list.innerHTML = `
      <div class="finding-item" style="justify-content:center; color: var(--green); padding: 20px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span style="margin-left:8px; font-weight:600;">All checks passed!</span>
      </div>
    `;
    return;
  }

  list.innerHTML = displayFindings.map(f => `
    <div class="finding-item">
      <span class="finding-sev ${f.severity}">${f.severity}</span>
      <div class="finding-info">
        <div class="finding-title">${escapeHtml(f.title)}</div>
        ${f.fix ? `<div class="finding-fix">${escapeHtml(f.fix)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function toggleFindings() {
  showAllFindings = !showAllFindings;
  if (scanResults) {
    renderFindings(scanResults.findings);
  }
}

// ── Error Display ─────────────────────────────────────────────
function showError(msg) {
  $('error-message').textContent = msg;
  showSection('error');
}

// ── Status Bar ────────────────────────────────────────────────
function setStatus(type, label) {
  const dot = $('status-dot');
  const lbl = $('status-label');

  dot.className = 'status-dot';
  if (type === 'scanning') dot.classList.add('scanning');
  else if (type === 'error') dot.classList.add('error');

  lbl.textContent = label;
}

// ── Utility ───────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
