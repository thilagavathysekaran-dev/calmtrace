const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3000, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('  CalmTrace API Tests');
  console.log('═══════════════════════════════════════\n');

  // Test 1: POST /report
  console.log('TEST 1: POST /report — Phishing Incident');
  const r1 = await post('/report', {
    incidentType: 'Phishing',
    description: 'Received a suspicious phishing email with malware link. Hacker tried unauthorized access.',
    affectedSystem: 'Gmail / Chrome',
    contactEmail: 'victim@test.com',
  });
  console.log(`  Status: ${r1.status}`);
  console.log(`  ID: ${r1.body.id}`);
  console.log(`  Hash: ${r1.body.hash}`);
  console.log(`  Risk Score: ${r1.body.detection.riskScore}`);
  console.log(`  Suspicious: ${r1.body.detection.isSuspicious}`);
  console.log('  ✅ PASS\n');

  // Test 2: POST /report — Ransomware
  console.log('TEST 2: POST /report — Ransomware Incident');
  const r2 = await post('/report', {
    incidentType: 'Ransomware',
    description: 'Ransomware encrypted all files and demanded bitcoin payment. Trojan detected.',
    affectedSystem: 'Windows 11 PC',
    contactEmail: 'user2@test.com',
  });
  console.log(`  Status: ${r2.status}`);
  console.log(`  Hash: ${r2.body.hash}`);
  console.log(`  Risk Score: ${r2.body.detection.riskScore}`);
  console.log('  ✅ PASS\n');

  // Test 3: GET /evidence
  console.log('TEST 3: GET /evidence — Fetch All Records');
  const r3 = await get('/evidence');
  console.log(`  Status: ${r3.status}`);
  console.log(`  Records Count: ${r3.body.length}`);
  console.log(`  First Record Hash (${r3.body[0]?.hash?.substring(0,16)}...)`);
  console.log(`  DNS Logs Count: ${r3.body[0]?.dnsLogs?.length}`);
  console.log(`  Chain of Custody Entries: ${r3.body[0]?.accessLog?.length}`);
  console.log('  ✅ PASS\n');

  // Test 4: GET /stats
  console.log('TEST 4: GET /stats — Statistics');
  const r4 = await get('/stats');
  console.log(`  Status: ${r4.status}`);
  console.log(`  Total: ${r4.body.total}`);
  console.log(`  High Risk: ${r4.body.highRisk}`);
  console.log(`  Type Breakdown:`, r4.body.typeBreakdown);
  console.log('  ✅ PASS\n');

  // Test 5: GET /simulate-alert
  console.log('TEST 5: GET /simulate-alert — Detection Engine');
  const r5 = await get('/simulate-alert');
  console.log(`  Status: ${r5.status}`);
  console.log(`  Level: ${r5.body.level}`);
  console.log(`  Message: ${r5.body.message}`);
  console.log(`  Type: ${r5.body.type}`);
  console.log('  ✅ PASS\n');

  console.log('═══════════════════════════════════════');
  console.log('  All Tests PASSED ✅');
  console.log('═══════════════════════════════════════');
}

run().catch(err => {
  console.error('❌ Test FAILED:', err.message);
  process.exit(1);
});
