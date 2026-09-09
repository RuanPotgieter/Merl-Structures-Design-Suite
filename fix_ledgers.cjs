const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

content = content.replace(/if \(cellAboveBraced \|\| cellBelowBraced\) \{/g, `if (true) {`);
content = content.replace(/if \(cellRightBraced \|\| cellLeftBraced\) \{/g, `if (true) {`);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed ledgers");
