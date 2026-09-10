const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

content = content.replace(
  `          const cellRightBraced = isCellBraced(x, y);
          const cellLeftBraced = isCellBraced(x - 1.2, y);
          if (cellRightBraced || cellLeftBraced) {`,
  `          const cellRightBraced = isCellLedgered(x, y, cols, depthBays);
          const cellLeftBraced = isCellLedgered(x - 1.2, y, cols, depthBays);
          if (cellRightBraced || cellLeftBraced) {`
);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed vertical flat ledgers");
