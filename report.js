const form = document.getElementById('incident-form');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');
const successBox = document.getElementById('success-box');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const incidentType = document.getElementById('incidentType').value.trim();
  const description  = document.getElementById('description').value.trim();
  const contactEmail = document.getElementById('contactEmail').value.trim();
  const affectedSystem = document.getElementById('affectedSystem').value.trim();

  // Validation
  if (!incidentType || !description) {
    formError.style.display = 'block';
    return;
  }
  formError.style.display = 'none';

  // Update button state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(0,0,0,0.3);border-top-color:#000;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Preserving Evidence…';

  try {
    const response = await fetch(`${API}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentType, description, contactEmail, affectedSystem }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Show success
    document.getElementById('success-id').textContent   = data.id;
    document.getElementById('success-hash').textContent = data.hash;
    document.getElementById('success-time').textContent = new Date(data.timestamp).toLocaleString();

    // Show detection result
    if (data.detection) {
      const det = data.detection;
      const riskClass = det.riskScore >= 75 ? 'red' : det.riskScore >= 40 ? 'yellow' : 'green';
      const riskLabel = det.riskScore >= 75 ? '🔴 HIGH' : det.riskScore >= 40 ? '🟡 MEDIUM' : '🟢 LOW';
      document.getElementById('success-detection').innerHTML = `
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:1rem;margin-bottom:0.5rem;">
          <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:0.75rem;">Threat Analysis</div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <span style="font-size:0.85rem;color:var(--text-secondary);">Risk Score:</span>
            <span class="badge badge-${riskClass}">${riskLabel} — ${det.riskScore}/100</span>
          </div>
          <div class="risk-bar">
            <div class="risk-bar-fill ${det.riskScore >= 75 ? 'high' : det.riskScore >= 40 ? 'medium' : 'low'}"
                 style="width:${det.riskScore}%"></div>
          </div>
          ${det.matchedKeywords.length > 0 ? `
          <div style="margin-top:0.75rem;">
            <span style="font-size:0.78rem;color:var(--text-muted);">Matched Keywords: </span>
            ${det.matchedKeywords.map(k => `<span class="badge badge-red" style="margin:2px;">${k}</span>`).join('')}
          </div>` : ''}
        </div>
      `;

      // Fire alert if suspicious
      if (det.isSuspicious && typeof showAlert === 'function') {
        setTimeout(() => {
          showAlert({
            level: det.riskScore >= 75 ? 'CRITICAL' : 'HIGH',
            message: `New ${incidentType} incident flagged — Risk Score ${det.riskScore}/100`,
            source: 'CalmTrace Verifier',
            type: incidentType,
            timestamp: new Date().toISOString(),
            id: Date.now().toString(),
          });
        }, 800);
      }
    }

    successBox.classList.add('show');
    form.reset();
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🔒 Submit & Preserve Evidence';
    successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error(err);
    formError.textContent = `⚠️ Failed to submit: ${err.message}. Make sure the server is running (node server.js).`;
    formError.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🔒 Submit & Preserve Evidence';
  }
});
