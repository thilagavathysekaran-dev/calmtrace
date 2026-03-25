const API = 'http://localhost:3000';
let alertCount = 0;
let monitorActive = true;
let monitorInterval = null;

// ─── Alert Toast System ──────────────────────────────────────────────────────

function showAlert(alertData) {
  alertCount++;

  const container = document.getElementById('alert-container');
  if (!container) return;

  const icons = { CRITICAL: '🚨', HIGH: '⚠️', MEDIUM: '🔵' };
  const icon = icons[alertData.level] || '⚠️';

  const toast = document.createElement('div');
  toast.className = `alert-toast ${alertData.level}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.id = `toast-${alertData.id || Date.now()}`;

  toast.innerHTML = `
    <div class="alert-icon">${icon}</div>
    <div class="alert-body">
      <div class="alert-level">⚡ ${alertData.level} THREAT DETECTED</div>
      <div class="alert-message">${alertData.message}</div>
      <div class="alert-meta">
        Type: ${alertData.type} &nbsp;|&nbsp; Source: ${alertData.source}
        ${alertData.timestamp ? ' &nbsp;|&nbsp; ' + new Date(alertData.timestamp).toLocaleTimeString() : ''}
      </div>
    </div>
    <button class="alert-close" onclick="dismissAlert('${toast.id}')" aria-label="Close alert">✕</button>
  `;

  container.prepend(toast);

  // Auto-dismiss after 7s
  setTimeout(() => dismissAlert(toast.id), 7000);

  // Log to dashboard monitor if present
  logToMonitor(alertData);

  // Update alert counter on dashboard
  const counter = document.getElementById('alert-count');
  if (counter) counter.textContent = alertCount;
}

function dismissAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 300);
}

// ─── Simulate Alert ──────────────────────────────────────────────────────────

async function triggerSimulatedAlert() {
  try {
    const res = await fetch(`${API}/simulate-alert`);
    const data = await res.json();
    showAlert(data);
  } catch {
    // Fallback if server not running
    showAlert({
      level: 'HIGH',
      message: 'Suspicious network probe detected on port 22',
      source: '185.220.101.45',
      type: 'Brute Force',
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
  }
}

// ─── Load Home Stats ─────────────────────────────────────────────────────────

async function loadHomeStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const s = await res.json();
    const total = document.getElementById('stat-total');
    const h24 = document.getElementById('stat-24h');
    const hr = document.getElementById('stat-highrisk');
    if (total) total.textContent = s.total;
    if (h24)   h24.textContent = s.last24h;
    if (hr)    hr.textContent = s.highRisk;
  } catch { /* silently ignore */ }
}

// ─── Monitor Log (dashboard) ─────────────────────────────────────────────────

function logToMonitor(alertData) {
  const log = document.getElementById('monitor-log');
  if (!log) return;

  // Remove placeholder
  const placeholder = log.querySelector('[data-placeholder]');
  if (placeholder) placeholder.remove();

  const colors = { CRITICAL: 'var(--accent-red)', HIGH: 'var(--accent-yellow)', MEDIUM: '#60a5fa' };
  const entry = document.createElement('div');
  entry.style.cssText = 'display:flex;gap:8px;align-items:flex-start;font-size:0.8rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.05);';
  entry.innerHTML = `
    <span style="color:${colors[alertData.level]||'#60a5fa'};font-weight:700;flex-shrink:0;">[${alertData.level}]</span>
    <span style="color:var(--text-secondary);flex:1;">${alertData.message}</span>
    <span style="color:var(--text-muted);font-family:'JetBrains Mono',monospace;font-size:0.72rem;flex-shrink:0;">${new Date().toLocaleTimeString()}</span>
  `;
  log.prepend(entry);

  // Keep max 12 entries
  while (log.children.length > 12) log.lastChild.remove();
}

// ─── Monitor Toggle (dashboard) ──────────────────────────────────────────────

function toggleMonitor() {
  const btn = document.getElementById('monitor-toggle-btn');
  const status = document.getElementById('monitor-status');
  if (monitorActive) {
    monitorActive = false;
    clearInterval(monitorInterval);
    if (btn)    btn.textContent = '▶️ Resume Auto';
    if (status) status.textContent = '🔴 OFF';
  } else {
    monitorActive = true;
    startAutoMonitor();
    if (btn)    btn.textContent = '⏸️ Pause Auto';
    if (status) status.textContent = '🟢 ON';
  }
}

function startAutoMonitor() {
  monitorInterval = setInterval(() => {
    if (monitorActive) triggerSimulatedAlert();
  }, 12000); // Every 12 seconds
}

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Load stats on home page
  if (document.getElementById('stat-total')) loadHomeStats();

  // Auto-trigger first alert after 3s on dashboard / home to demo the system
  if (document.getElementById('alert-container')) {
    setTimeout(triggerSimulatedAlert, 3000);
    // Start periodic auto-alerts on dashboard only
    if (document.getElementById('monitor-log')) {
      startAutoMonitor();
    }
  }

  // Init monitor log placeholder
  const log = document.getElementById('monitor-log');
  if (log && log.children.length === 0) {
    const ph = document.createElement('div');
    ph.setAttribute('data-placeholder', '1');
    ph.style.cssText = 'font-size:0.82rem;color:var(--text-muted);text-align:center;padding:1rem;';
    ph.textContent = 'No alerts yet. Click "Trigger Now" or wait for auto-triggers.';
    log.appendChild(ph);
  }
});
