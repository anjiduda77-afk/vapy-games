#!/usr/bin/env node
/**
 * VAPY Games - Full Stack Starter
 * Runs backend and frontend simultaneously
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');

console.log('🚀 VAPY Games - Full Stack Starter');
console.log('==================================\n');

let backendReady = false;
let frontendReady = false;

function checkBothReady() {
  if (backendReady && frontendReady) {
    console.log('\n✅ Full Stack is Running!');
    console.log('\n📍 Access Points:');
    console.log('   Backend:  http://localhost:5000');
    console.log('   Frontend: http://localhost:5173');
    console.log('\n💡 API Documentation:');
    console.log('   • Health: GET http://localhost:5000/health');
    console.log('   • Leaderboard: GET http://localhost:5000/leaderboard');
    console.log('\n⚠️  Press Ctrl+C to stop both servers\n');
  }
}

// Start Backend
console.log('🔧 Starting Backend (port 5000)...');
const backend = spawn(isWindows ? 'npm.cmd' : 'npm', ['start'], {
  cwd: backendDir,
  stdio: 'pipe'
});

backend.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(`[Backend] ${output}`);
  if (output.includes('Server running on')) {
    backendReady = true;
    checkBothReady();
  }
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[Backend] ${data}`);
});

// Start Frontend
console.log('📦 Starting Frontend (port 5173)...\n');
const frontend = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'pipe'
});

frontend.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(`[Frontend] ${output}`);
  if (output.includes('VITE') || output.includes('Local:')) {
    frontendReady = true;
    checkBothReady();
  }
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`[Frontend] ${data}`);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping servers...');
  backend.kill();
  frontend.kill();
  setTimeout(() => process.exit(0), 1000);
});

backend.on('error', (err) => {
  console.error('❌ Backend failed to start:', err.message);
  process.exit(1);
});

frontend.on('error', (err) => {
  console.error('❌ Frontend failed to start:', err.message);
  process.exit(1);
});
