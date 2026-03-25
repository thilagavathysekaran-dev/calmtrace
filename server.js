const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'evidence.json');

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper Functions ──────────────────────────────────────────────────────────

function readEvidence() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeEvidence(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateHash(record) {
  const payload = JSON.stringify({
    id: record.id,
    timestamp: record.timestamp,
    ip: record.ip,
    incidentType: record.incidentType,
    description: record.description,
    dnsLogs: record.dnsLogs,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function getMockIP() {
  const subnets = ['192.168', '10.0', '172.16', '203.45', '185.220'];
  const sub = subnets[Math.floor(Math.random() * subnets.length)];
  return `${sub}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function getMockDNSLogs() {
  const domains = [
    'malicious-payload.ru',
    'phishing-portal.xyz',
    'cdn-update.tk',
    'data-exfil.io',
    'svchost-update.net',
    'cmd-control.onion',
    'ransom-decrypt.cc',
    'exploit-kit.pw',
  ];
  const count = Math.floor(Math.random() * 4) + 1;
  const logs = [];
  for (let i = 0; i < count; i++) {
    const domain = domains[Math.floor(Math.random() * domains.length)];
    logs.push({
      domain,
      queryTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      type: ['A', 'AAAA', 'MX', 'TXT'][Math.floor(Math.random() * 4)],
      response: getMockIP(),
    });
  }
  return logs;
}

function buildChainOfCustody(records, currentId) {
  // Return all prior records as the chain
  return records
    .filter((r) => r.id !== currentId)
    .slice(-5)
    .map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      hash: r.hash,
      incidentType: r.incidentType,
    }));
}

function detectSuspicious(description, incidentType) {
  const keywords = [
    'hack',
    'phishing',
    'ransomware',
    'malware',
    'ddos',
    'injection',
    'breach',
    'exploit',
    'unauthorized',
    'suspicious',
    'virus',
    'trojan',
    'keylogger',
    'spyware',
  ];
  const text = (description + ' ' + incidentType).toLowerCase();
  const matched = keywords.filter((k) => text.includes(k));
  return {
    isSuspicious: matched.length > 0,
    matchedKeywords: matched,
    riskScore: Math.min(100, matched.length * 25 + Math.floor(Math.random() * 20)),
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /report
 * Store a new evidence record
 */
app.post('/report', (req, res) => {
  const { incidentType, description, contactEmail, affectedSystem } = req.body;

  if (!incidentType || !description) {
    return res.status(400).json({ error: 'incidentType and description are required.' });
  }

  const evidence = readEvidence();
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  const ip = getMockIP();
  const dnsLogs = getMockDNSLogs();
  const detection = detectSuspicious(description, incidentType);

  const record = {
    id,
    timestamp,
    ip,
    incidentType,
    description,
    contactEmail: contactEmail || 'anonymous@calmtrace.io',
    affectedSystem: affectedSystem || 'Unknown',
    dnsLogs,
    detection,
    chainOfCustody: buildChainOfCustody(evidence, id),
    accessLog: [
      {
        action: 'CREATED',
        timestamp,
        by: 'CalmTrace System',
      },
    ],
  };

  // Generate tamper-proof hash AFTER building the record
  record.hash = generateHash(record);

  evidence.push(record);
  writeEvidence(evidence);

  res.status(201).json({
    success: true,
    message: 'Evidence stored securely.',
    id: record.id,
    hash: record.hash,
    timestamp: record.timestamp,
    detection,
  });
});

/**
 * GET /evidence
 * Fetch all stored evidence records
 */
app.get('/evidence', (req, res) => {
  const evidence = readEvidence();
  // Return in reverse chronological order
  res.json(evidence.reverse());
});

/**
 * GET /evidence/:id
 * Fetch a single evidence record and log access
 */
app.get('/evidence/:id', (req, res) => {
  const evidence = readEvidence();
  const idx = evidence.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Record not found.' });

  // Log the access event
  evidence[idx].accessLog.push({
    action: 'ACCESSED',
    timestamp: new Date().toISOString(),
    by: 'User Query',
  });
  writeEvidence(evidence);

  res.json(evidence[idx]);
});

/**
 * GET /stats
 * Return aggregate statistics for dashboard
 */
app.get('/stats', (req, res) => {
  const evidence = readEvidence();
  const typeCount = {};
  let highRisk = 0;
  evidence.forEach((r) => {
    typeCount[r.incidentType] = (typeCount[r.incidentType] || 0) + 1;
    if (r.detection && r.detection.riskScore >= 75) highRisk++;
  });

  const last24h = evidence.filter(
    (r) => Date.now() - new Date(r.timestamp).getTime() < 86400000
  ).length;

  res.json({
    total: evidence.length,
    last24h,
    highRisk,
    typeBreakdown: typeCount,
    latestHash: evidence.length > 0 ? evidence[evidence.length - 1].hash : null,
  });
});

/**
 * GET /simulate-alert
 * Simulate a suspicious activity detection event
 */
app.get('/simulate-alert', (req, res) => {
  const alerts = [
    {
      level: 'CRITICAL',
      message: 'Port scan detected from external IP',
      source: getMockIP(),
      type: 'Network Intrusion',
    },
    {
      level: 'HIGH',
      message: 'Unusual DNS query pattern detected',
      source: getMockIP(),
      type: 'DNS Anomaly',
    },
    {
      level: 'HIGH',
      message: 'Multiple failed SSH login attempts',
      source: getMockIP(),
      type: 'Brute Force',
    },
    {
      level: 'MEDIUM',
      message: 'Outbound traffic spike to unknown IP',
      source: getMockIP(),
      type: 'Data Exfiltration',
    },
    {
      level: 'CRITICAL',
      message: 'Ransomware signature detected in file system',
      source: 'local-system',
      type: 'Malware',
    },
    {
      level: 'HIGH',
      message: 'Phishing URL clicked by user',
      source: getMockIP(),
      type: 'Phishing',
    },
  ];

  const alert = alerts[Math.floor(Math.random() * alerts.length)];
  alert.timestamp = new Date().toISOString();
  alert.id = uuidv4();

  res.json(alert);
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║          🛡️  CalmTrace Server Running         ║`);
  console.log(`║                                              ║`);
  console.log(`║   URL:  http://localhost:${PORT}               ║`);
  console.log(`║   Mode: Evidence Preservation Active         ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});
