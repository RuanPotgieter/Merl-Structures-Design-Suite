const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic_temp.ts', 'utf8');

code = code.replace(`    // Check Horizontal Connection (Right: x + 1.2)`, `
    // Check Horizontal Connection (Right: x + 1.2)
    // console.log("Checking", x, y, feetMap.has(neighborNextXKey));
`);

code = code.replace(`            const elevations = getLedgerElevations(f, neighbor);`, `
            const elevations = getLedgerElevations(f, neighbor);
            console.log("elevations for", x, y, ":", elevations);
`);

fs.writeFileSync('utils/deckLogic_temp.ts', code);
