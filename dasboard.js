async function loadDashboard() {
  await Promise.all([loadStats(), loadRecentTable()]);
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const s = await res.json();

    setText('ds-total',   s.total);
    setText('ds-24h',     s.last24h);
    setText('ds-highrisk',s.highRisk);
    setText('ds-hashed',  s.total); // All records are hashed

    // Latest hash
    const hashEl = document.getElementById('latest-hash');
    if (hashEl && s.latestHash) {
      hashEl.innerHTML = `<span class="hash-icon">🔏</span><span>${s.latestHash}</span>`;
    }

    // Type breakdown
    renderTypeBreakdown(s.typeBreakdown || {});

  } catch {
    setText('ds-total', '—');
    setText('ds-24h', '—');
    setText('ds-highrisk', '—');
    setText('ds-hashed', '—');
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderTypeBreakdown(breakdown) {
  const container = document.getElementById('type-breakdown');
  if (!container) return;

  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem;">
        <div class="empty-icon" style="font-size:2rem;">📊</div>
        <p>No incident data yet. <a href="report.html" style="color:var(--accent-cyan);">Report an incident</a> to see stats.</p>
      </div>`;
    return;
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const typeIcons = {
    'Phishing': '🎣', 'Ransomware': '🔐', 'Data Breach': '💾',
    'DDoS': '🌊', 'Malware': '🦠', 'Identity Theft': '👤',
    'Social Engineering': '🎭', 'Unauthorized Access': '🚪',
    'Financial Fraud': '💳', 'Account Compromise': '🔓', 'Other': '❓',
  };
  const colors = ['var(--accent-cyan)', 'var(--accent-red)', 'var(--accent-yellow)',
                  '#a78bfa', 'var(--accent-green)', '#60a5fa', '#f97316', '#ec4899'];

  container.innerHTML = entries.map(([type, count], i) => {
    const pct = Math.round((count / total) * 100);
    const color = colors[i % colors.length];
    const icon = typeIcons[type] || '🛡️';
    return `
      <div style="margin-bottom:1.1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <span style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">${icon} ${type}</span>
          <span style="font-size:0.82rem; font-family:'JetBrains Mono',monospace; color:var(--text-muted);">${count} (${pct}%)</span>
        </div>
        <div style="height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${color}; border-radius:4px; box-shadow:0 0 8px ${color}40; transition:width 1s ease;"></div>
        </div>
      </div>`;
  }).join('');
}

async function loadRecentTable() {
  const container = document.getElementById('recent-table');
  if (!container) return;

  try {
    const res = await fetch(`${API}/evidence`);
    const records = await res.json();
    const recent = records.slice(0, 8); // Show 8 most recent

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:2.5rem;">
          <div class="empty-icon">📋</div>
          <p>No reports yet. <a href="report.html" style="color:var(--accent-cyan);">Submit your first incident.</a></p>
        </div>`;
      return;
    }

    const riskColor = (score) =>
      score >= 75 ? 'var(--accent-red)' :
      score >= 40 ? 'var(--accent-yellow)' :
      'var(--accent-green)';

    const riskLabel = (score) =>
      score >= 75 ? '🔴 HIGH' : score >= 40 ? '🟡 MED' : '🟢 LOW';

    container.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead>
          <tr style="background:rgba(0,245,255,0.05); border-bottom:1px solid var(--border);">
            <th style="padding:0.75rem 1.25rem; text-align:left; color:var(--text-muted); font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Type</th>
            <th style="padding:0.75rem 1.25rem; text-align:left; color:var(--text-muted); font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Timestamp</th>
            <th style="padding:0.75rem 1.25rem; text-align:left; color:var(--text-muted); font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Source IP</th>
            <th style="padding:0.75rem 1.25rem; text-align:left; color:var(--text-muted); font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Risk</th>
            <th style="padding:0.75rem 1.25rem; text-align:left; color:var(--text-muted); font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Hash (preview)</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map((r, idx) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s;" 
                onmouseover="this.style.background='rgba(0,245,255,0.03)'" 
                onmouseout="this.style.background='transparent'">
              <td style="padding:0.8rem 1.25rem; color:var(--text-primary); font-weight:600;">${r.incidentType}</td>
              <td style="padding:0.8rem 1.25rem; color:var(--text-secondary); font-family:'JetBrains Mono',monospace; font-size:0.78rem;">${new Date(r.timestamp).toLocaleString()}</td>
              <td style="padding:0.8rem 1.25rem; color:var(--accent-cyan); font-family:'JetBrains Mono',monospace; font-size:0.78rem;">${r.ip}</td>
              <td style="padding:0.8rem 1.25rem;">
                <span style="font-size:0.75rem; font-weight:700; color:${riskColor(r.detection?.riskScore??0)};">${riskLabel(r.detection?.riskScore??0)}</span>
              </td>
              <td style="padding:0.8rem 1.25rem; font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:var(--accent-green);">
                🔏 ${r.hash ? r.hash.substring(0, 20) + '…' : 'N/A'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  } catch {
    container.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--accent-red); font-size:0.88rem;">⚠️ Could not load records. Is the server running?</div>`;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', loadDashboard);
