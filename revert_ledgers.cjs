const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

content = content.replace(/const cellAboveBraced = isCellBraced\(x, y\);\n          const cellBelowBraced = isCellBraced\(x, y - 1\.2\);\n            \n          if \(true\) \{/g, `const cellAboveBraced = isCellBraced(x, y);
          const cellBelowBraced = isCellBraced(x, y - 1.2);
          if (cellAboveBraced || cellBelowBraced) {`);

content = content.replace(/const cellRightBraced = isCellBraced\(x, y\);\n          const cellLeftBraced = isCellBraced\(x - 1\.2, y\);\n            \n          if \(true\) \{/g, `const cellRightBraced = isCellBraced(x, y);
          const cellLeftBraced = isCellBraced(x - 1.2, y);
          if (cellRightBraced || cellLeftBraced) {`);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Reverted ledgers hack");
