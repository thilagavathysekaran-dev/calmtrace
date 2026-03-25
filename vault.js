let allRecords = [];

async function loadEvidence() {
  const list = document.getElementById('evidence-list');
  list.innerHTML = '<div class="spinner"></div>';

  try {
    const res = await fetch(`${API}/evidence`);
    if (!res.ok) throw new Error(res.statusText);
    allRecords = await res.json();
    renderRecords(allRecords);
  } catch (err) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p style="color:var(--accent-red); margin-bottom:0.5rem; font-weight:600;">Could not connect to CalmTrace server</p>
        <p>Make sure the server is running: <code style="font-family:'JetBrains Mono',monospace; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">node server.js</code></p>
      </div>`;
  }
}

function renderRecords(records) {
  const list = document.getElementById('evidence-list');
  const countEl = document.getElementById('record-count');

  if (countEl) countEl.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;

  if (records.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🗄️</div>
        <p>No evidence records found.</p>
        <a href="report.html" class="btn btn-primary" style="margin-top:1rem; display:inline-flex;">+ Report First Incident</a>
      </div>`;
    return;
  }

  list.innerHTML = '';

  const recordsContainer = document.createElement('div');
  recordsContainer.style.display = 'flex';
  recordsContainer.style.flexDirection = 'column';
  recordsContainer.style.gap = '1rem';

  records.forEach((rec) => {
    const riskScore = rec.detection?.riskScore ?? 0;
    const riskClass = riskScore >= 75 ? 'red' : riskScore >= 40 ? 'yellow' : 'green';
    const riskLabel = riskScore >= 75 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';
    const riskBarClass = riskScore >= 75 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

    const card = document.createElement('div');
    card.className = 'evidence-record';
    card.innerHTML = `
      <!-- Header (clickable) -->
      <div class="evidence-header" onclick="toggleRecord('body-${rec.id}')">
        <div>
          <div class="evidence-id">ID: ${rec.id}</div>
          <div class="evidence-title">${getTypeIcon(rec.incidentType)} ${rec.incidentType}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px; font-family:'JetBrains Mono',monospace;">
            ${new Date(rec.timestamp).toLocaleString()}
          </div>
        </div>
        <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap;">
          <span class="badge badge-${riskClass}">⚡ ${riskLabel} RISK</span>
          ${rec.detection?.isSuspicious ? '<span class="badge badge-red">🚨 SUSPICIOUS</span>' : ''}
          <span style="color:var(--text-muted); font-size:0.85rem; transition:transform 0.3s;" id="chevron-${rec.id}">▼</span>
        </div>
      </div>

      <!-- Body (collapsible) -->
      <div class="evidence-body" id="body-${rec.id}">

        <!-- Core Metadata -->
        <div class="detail-grid">
          <div class="detail-item">
            <label>Source IP</label>
            <span>${rec.ip}</span>
          </div>
          <div class="detail-item">
            <label>Incident Type</label>
            <span>${rec.incidentType}</span>
          </div>
          <div class="detail-item">
            <label>Affected System</label>
            <span>${rec.affectedSystem || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <label>Contact</label>
            <span>${rec.contactEmail || 'anonymous'}</span>
          </div>
        </div>

        <!-- Description -->
        <div style="margin-bottom:1.25rem;">
          <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.4rem;">Description</label>
          <div style="background:rgba(255,255,255,0.04); border-radius:8px; padding:0.75rem 1rem; font-size:0.88rem; color:var(--text-secondary); line-height:1.6;">
            ${rec.description}
          </div>
        </div>

        <!-- SHA-256 Hash -->
        <div style="margin-bottom:1.25rem;">
          <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.4rem;">
            🔏 SHA-256 Tamperproof Hash
          </label>
          <div class="hash-display">
            <span class="hash-icon">🔒</span>
            <span>${rec.hash}</span>
          </div>
        </div>

        <!-- Risk Score -->
        <div style="margin-bottom:1.25rem;">
          <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.4rem;">
            Risk Score — ${riskScore}/100
          </label>
          <div class="risk-bar">
            <div class="risk-bar-fill ${riskBarClass}" style="width:${riskScore}%"></div>
          </div>
          ${rec.detection?.matchedKeywords?.length > 0 ? `
          <div style="margin-top:0.5rem;">
            <span style="font-size:0.76rem; color:var(--text-muted);">Threat keywords: </span>
            ${rec.detection.matchedKeywords.map(k => `<span class="badge badge-red" style="margin:2px;">${k}</span>`).join('')}
          </div>` : ''}
        </div>

        <!-- DNS Logs -->
        ${rec.dnsLogs && rec.dnsLogs.length > 0 ? `
        <div style="margin-bottom:1.25rem;">
          <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.4rem;">
            🔗 Suspicious DNS Query Log (${rec.dnsLogs.length} entries)
          </label>
          <div style="background:rgba(0,0,0,0.3); border-radius:8px; overflow:hidden; border:1px solid var(--border);">
            <table class="dns-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Type</th>
                  <th>Response IP</th>
                  <th>Query Time</th>
                </tr>
              </thead>
              <tbody>
                ${rec.dnsLogs.map(log => `
                  <tr>
                    <td style="color:var(--accent-red);">${log.domain}</td>
                    <td><span class="badge badge-cyan" style="font-size:0.65rem;">${log.type}</span></td>
                    <td>${log.response}</td>
                    <td>${new Date(log.queryTime).toLocaleTimeString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <!-- Chain of Custody -->
        <div style="margin-bottom:1rem;">
          <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.75rem;">
            ⛓️ Chain of Custody — Access Log
          </label>
          ${rec.accessLog && rec.accessLog.length > 0 ? `
          <ul class="chain-list">
            ${rec.accessLog.map(entry => `
              <li>
                <strong style="color:var(--accent-cyan);">[${entry.action}]</strong>
                ${entry.by} &mdash; ${new Date(entry.timestamp).toLocaleString()}
              </li>
            `).join('')}
          </ul>` : '<p style="color:var(--text-muted); font-size:0.85rem;">No access log entries.</p>'}

          ${rec.chainOfCustody && rec.chainOfCustody.length > 0 ? `
          <div style="margin-top:0.75rem;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.5px;">Prior Records in Chain</div>
            <ul class="chain-list">
              ${rec.chainOfCustody.map(c => `
                <li>
                  <strong style="color:var(--text-secondary);">${c.incidentType}</strong>
                  &mdash; ${new Date(c.timestamp).toLocaleString()}
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:1px;">Hash: ${c.hash.substring(0, 32)}…</div>
                </li>
              `).join('')}
            </ul>
          </div>` : ''}
        </div>

      </div>
    `;

    recordsContainer.appendChild(card);
  });

  list.appendChild(recordsContainer);
}

function toggleRecord(bodyId) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  const recordId = bodyId.replace('body-', '');
  const chevron = document.getElementById(`chevron-${recordId}`);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open');
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function filterRecords() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const type   = document.getElementById('filter-type').value;
  const risk   = document.getElementById('filter-risk').value;

  const filtered = allRecords.filter(rec => {
    const matchSearch = !search ||
      rec.incidentType.toLowerCase().includes(search) ||
      rec.description.toLowerCase().includes(search) ||
      rec.ip.includes(search) ||
      rec.id.toLowerCase().includes(search);

    const matchType = !type || rec.incidentType === type;

    const score = rec.detection?.riskScore ?? 0;
    const matchRisk = !risk ||
      (risk === 'high'   && score >= 75) ||
      (risk === 'medium' && score >= 40 && score < 75) ||
      (risk === 'low'    && score < 40);

    return matchSearch && matchType && matchRisk;
  });

  renderRecords(filtered);
}

function getTypeIcon(type) {
  const icons = {
    'Phishing': '🎣',
    'Ransomware': '🔐',
    'Data Breach': '💾',
    'DDoS': '🌊',
    'Malware': '🦠',
    'Identity Theft': '👤',
    'Social Engineering': '🎭',
    'Unauthorized Access': '🚪',
    'Financial Fraud': '💳',
    'Account Compromise': '🔓',
    'Other': '❓',
  };
  return icons[type] || '🛡️';
}

// Boot
document.addEventListener('DOMContentLoaded', loadEvidence);
