#!/usr/bin/env node
/**
 * Comprehensive API Test Suite - 100% Accuracy Verification
 * Tests all backend endpoints to ensure they work correctly
 */

const https = require('https');

const BASE_URL = 'https://vapy-games.onrender.com';
let testsPassed = 0;
let testsFailed = 0;
let authToken = '';
let userId = '';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('🚀 Starting 100% Accuracy API Test Suite...\n');

  // 1. Health Check
  await test('Health endpoint', async () => {
    const res = await makeRequest('GET', '/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.status) throw new Error('Missing status field');
  });

  // 2. Root endpoint
  await test('Root endpoint', async () => {
    const res = await makeRequest('GET', '/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'ok') throw new Error('API not ready');
  });

  // 3. Register user
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testNickname = `Player_${Math.floor(Math.random() * 10000)}`;

  await test('Register new user', async () => {
    const res = await makeRequest('POST', '/register', {
      email: testEmail,
      password: testPassword,
      nickname: testNickname,
      role: 'player'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.token) throw new Error('No token returned');
    if (!res.data.user) throw new Error('No user data');
    authToken = res.data.token;
    userId = res.data.user.id;
  });

  await delay(500);

  // 4. Login
  await test('Login user', async () => {
    const res = await makeRequest('POST', '/login', {
      email: testEmail,
      password: testPassword
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.token) throw new Error('No token returned');
  });

  // 5. Get user profile (/me)
  await test('Get user profile', async () => {
    const res = await makeRequest('GET', '/me', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.profile) throw new Error('No profile returned');
  });

  // 6. Get all profiles
  await test('Get all profiles', async () => {
    const res = await makeRequest('GET', '/profiles');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  // 7. Get leaderboard
  await test('Get leaderboard', async () => {
    const res = await makeRequest('GET', '/leaderboard?limit=10');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  // 8. Update profile
  await test('Update user profile', async () => {
    const res = await makeRequest('PUT', '/profiles', {
      nickname: testNickname + '_Updated',
      avatar_url: 'https://example.com/avatar.png'
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Update failed');
  });

  // 9. Add points (with match_id to prevent duplicates)
  const matchId = `match_${Date.now()}_${Math.random()}`;
  await test('Add points for win (easy)', async () => {
    const res = await makeRequest('POST', '/add-points', {
      result: 'win',
      gameId: 'test-game',
      difficulty: 'easy',
      match_id: matchId
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Add points failed');
    if (res.data.scoreAwarded !== 1) throw new Error(`Expected 1 point, got ${res.data.scoreAwarded}`);
  });

  // 10. Duplicate match prevention
  await test('Prevent duplicate match submission', async () => {
    const res = await makeRequest('POST', '/add-points', {
      result: 'win',
      gameId: 'test-game',
      difficulty: 'easy',
      match_id: matchId // Same match_id
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (!res.data.error) throw new Error('Should have error message');
  });

  // 11. Get games
  await test('Get all games', async () => {
    const res = await makeRequest('GET', '/games');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  // 12. Get stats
  await test('Get dashboard stats', async () => {
    const res = await makeRequest('GET', '/stats');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (typeof res.data.totalPlayers !== 'number') throw new Error('Missing totalPlayers');
    if (typeof res.data.totalGames !== 'number') throw new Error('Missing totalGames');
  });

  // 13. Reset password (dummy endpoint)
  await test('Reset password endpoint', async () => {
    const res = await makeRequest('POST', '/reset-password', {
      email: testEmail
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Reset failed');
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log(`📈 Accuracy: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);
  console.log('='.repeat(50));

  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Server is working with 100% accuracy.');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
