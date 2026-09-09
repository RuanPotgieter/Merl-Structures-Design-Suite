const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// Fix duplicated reqH
content = content.replace(/f\.groundHeight = getGroundYAt\(f\.position\.x, f\.position\.y, terrain, exactWidth, exactDepth\);\n    const reqH = f\.targetElevation - f\.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;\n      \n    if \(reqH < 0\.15\)/g, 'if (reqH < 0.15)');

// Add const rampPlates: any[] = []; to calculateRakingDeck
// calculateRakingDeck starts around line 191
// let's put it around line 234 where const errors: string[] = []; is.
content = content.replace(/const errors: string\[\] = \[\];\n\n  \/\/ Track foot elevations/g, 'const errors: string[] = [];\n  const rampPlates: import(\'../types\').RampPlate[] = [];\n\n  // Track foot elevations');

fs.writeFileSync('utils/deckLogic.ts', content);
