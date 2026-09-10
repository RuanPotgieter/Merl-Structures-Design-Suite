const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic.ts', 'utf8');

code = code.replace(
  `const neighborNextXKey = \`\${parseFloat((x + 1.2).toFixed(3))},\${parseFloat(y.toFixed(3))}\`;`,
  `const neighborNextXKey = \`\${(x + 1.2).toFixed(3)},\${y.toFixed(3)}\`;`
);

code = code.replace(
  `const neighborNextYKey = \`\${parseFloat(x.toFixed(3))},\${parseFloat((y + 1.2).toFixed(3))}\`;`,
  `const neighborNextYKey = \`\${x.toFixed(3)},\${(y + 1.2).toFixed(3)}\`;`
);

fs.writeFileSync('utils/deckLogic.ts', code);
