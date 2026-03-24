const http = require('http');

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  const backend = await checkPort(5000);
  const frontend = await checkPort(5173);
  console.log(`Backend (5000): ${backend}`);
  console.log(`Frontend (5173): ${frontend}`);
}

main();
