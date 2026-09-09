const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex1 = /const topElev = Math\.min\(f\.targetElevation, f2\.targetElevation\) - DECK_THICKNESS;\s*const footH1 = f\.targetElevation - f\.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;\s*const footH2 = f2\.targetElevation - f2\.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;\s*const minFootH = Math\.min\(footH1, footH2\);\s*const elevations: number\[\] = \[topElev\];\s*if \(minFootH > 1\.75\) \{\s*let lowerElev = topElev - 1\.0;\s*const minGround = Math\.max\(f\.groundHeight, f2\.groundHeight\) \+ 0\.15;\s*while \(lowerElev >= minGround\) \{\s*elevations\.push\(lowerElev\);\s*lowerElev -= 1\.0;\s*\}\s*\}/g;

content = content.replace(regex1, `const elevations = getLedgerElevations(f, f2);`);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed rake ledgers");
