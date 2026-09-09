const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// Inside calculateRakingDeck, add rampPlates generation
content = content.replace(
  /const exactDepth = tiers \* stepDepth;/g,
  `const exactDepth = tiers * stepDepth;\n  const rampPlates: import('../types').RampPlate[] = [];\n  let remainingRampW = exactWidth;\n  let px = 0;\n  while (remainingRampW >= 0.1) {\n    let pW = 1.2;\n    if (remainingRampW >= 2.4 - 0.05) {\n      pW = 2.4;\n    } else {\n      pW = remainingRampW;\n    }\n    rampPlates.push({\n      id: \`RAKE_PLATE_\${px}\`,\n      position: { x: px + pW / 2, y: -0.3, z: terrain.deckHeight + stepHeight - DECK_THICKNESS },\n      width: pW,\n      depth: 0.6,\n      rotation: 0\n    });\n    px += pW;\n    remainingRampW -= pW;\n  }`
);

// Remove feet assembly at y=0
content = content.replace(
  /foot\.groundHeight = getGroundYAt\(foot\.position\.x, foot\.position\.y, terrain, exactWidth, exactDepth\);\n    \/\/ Steel structure must support underside of deck \(minus deck board and sole board\)/g,
  `foot.groundHeight = getGroundYAt(foot.position.x, foot.position.y, terrain, exactWidth, exactDepth);
    // Remove basejacks on front edge (y=0) for raking decks
    if (Math.abs(foot.position.y) < 0.05) {
       return; // skip assembly generation
    }
    // Steel structure must support underside of deck (minus deck board and sole board)`
);

// Add rampPlates to the return object of calculateRakingDeck
content = content.replace(
  /braces,\n    uprights,\n    handrails,\n    swivelConnectors,\n    totalArea: exactWidth \* exactDepth,/g,
  `braces,\n    uprights,\n    handrails,\n    swivelConnectors,\n    rampPlates,\n    totalArea: exactWidth * exactDepth,`
);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed raking deck rampplates");
