const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex = /f\.groundHeight = getGroundYAt\(f\.position\.x, f\.position\.y, terrain, exactWidth, exactDepth\);\n    const reqH = f\.targetElevation - f\.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;\n      \n    if \(reqH < 0\.15\) \{/g;

content = content.replace(regex, 'if (reqH < 0.15) {');
fs.writeFileSync('utils/deckLogic.ts', content);
