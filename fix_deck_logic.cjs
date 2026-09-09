const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// fix const swivelConnectors,\n    rampPlates:
content = content.replace(/const swivelConnectors,\n    rampPlates/g, 'const swivelConnectors');

// fix swivelConnectors,\n    rampPlates.push(
content = content.replace(/swivelConnectors,\n    rampPlates\.push\(/g, 'swivelConnectors.push(');

// fix swivelConnectors,\n    rampPlates: [],
content = content.replace(/swivelConnectors,\n    rampPlates: \[\]/g, 'swivelConnectors: [],\n    rampPlates: []');

// fix singleResult.swivelConnectors,\n    rampPlates
content = content.replace(/singleResult\.swivelConnectors,\n    rampPlates/g, 'singleResult.swivelConnectors');

// fix !result.swivelConnectors,\n    rampPlates
content = content.replace(/!result\.swivelConnectors,\n    rampPlates/g, '!result.swivelConnectors');

// fix result.swivelConnectors,\n    rampPlates = \[\]
content = content.replace(/result\.swivelConnectors,\n    rampPlates = \[\]/g, 'result.swivelConnectors = []');

// fix result.swivelConnectors,\n    rampPlates!
content = content.replace(/result\.swivelConnectors,\n    rampPlates!/g, 'result.swivelConnectors!');

// For the correct addition in return statements, I'll add rampPlates correctly.
// we need to make sure we didn't remove rampPlates from calculateRakingDeck return.
// Let's check calculateRakingDeck return:
// swivelConnectors,
// rampPlates,
// totalArea:

// In calculateDeck:
// we should have result.rampPlates = [] initialization.
// and we should merge rampPlates.

fs.writeFileSync('utils/deckLogic.ts', content);
