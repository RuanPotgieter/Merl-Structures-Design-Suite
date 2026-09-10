const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic_temp.ts', 'utf8');

code = code.replace(`          if (cellAboveBraced || cellBelowBraced) {`, `
          console.log("cellAbove:", cellAboveBraced, "cellBelow:", cellBelowBraced);
          if (cellAboveBraced || cellBelowBraced) {`);

fs.writeFileSync('utils/deckLogic_temp.ts', code);
