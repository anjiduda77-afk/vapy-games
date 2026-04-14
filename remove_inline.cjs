const fs = require('fs');
const lines = fs.readFileSync('src/pages/Games.tsx', 'utf-8').split('\n');
// We want to delete from line 409 to line 1108 (inclusive)
// Array is 0-indexed, so line 409 is index 408
lines.splice(408, 1108 - 408 + 1);
fs.writeFileSync('src/pages/Games.tsx', lines.join('\n'));
console.log('Done');
