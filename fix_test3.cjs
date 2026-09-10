const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic_temp.ts', 'utf8');

code = code.replace(`    if (feetMap.has(neighborNextXKey)) {`, `
    console.log("has neighbor X?", neighborNextXKey, feetMap.has(neighborNextXKey));
    if (feetMap.has(neighborNextXKey)) {`);

fs.writeFileSync('utils/deckLogic_temp.ts', code);
