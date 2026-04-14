const fs = require('fs');
const path = require('path');

const brain = 'C:/Users/ANJI/.gemini/antigravity/brain/be56ee80-d9eb-4656-aef7-fa2379e92b42';
const src = path.join(__dirname, 'src');

fs.copyFileSync(
  path.join(brain, 'memorymatch_1775233154999.png'),
  path.join(src, 'memorymatch.png')
);
console.log('memorymatch.png copied');

fs.copyFileSync(
  path.join(brain, 'reactiontime_1775233197608.png'),
  path.join(src, 'reactiontime.png')
);
console.log('reactiontime.png copied');
