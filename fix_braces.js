const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex1 = /const addParallelBraces = \([\s\S]*?\} else \{[\s\S]*?const maxBraceSpan = 2\.0;[\s\S]*?let currentOffset = 0;[\s\S]*?let layer = 0;[\s\S]*?while \(currentOffset < maxH - 0\.1\) \{[\s\S]*?layer\+\+;\n        \}\n      \}\n    \};/g;

let matches = content.match(regex1);
console.log("Matches found:", matches ? matches.length : 0);
