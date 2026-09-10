const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic_temp.ts', 'utf8');

code = code.replace(`console.log("Entering flat ledger logic"`, `
console.log("feetMap keys:", Array.from(feetMap.keys()).slice(0, 5));
console.log("Entering flat ledger logic"`);

fs.writeFileSync('utils/deckLogic_temp.ts', code);
