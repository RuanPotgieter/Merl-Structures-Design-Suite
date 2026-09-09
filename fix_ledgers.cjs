const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex = /export const getLedgerElevations = \([\s\S]*?return selected;\n\};/g;

const replacement = `export const getLedgerElevations = (f1: Foot, f2: Foot): number[] => {
  const elevs1 = getVPressingElevations(f1);
  const elevs2 = getVPressingElevations(f2);
  
  const common: number[] = [];
  for (const e1 of elevs1) {
    for (const e2 of elevs2) {
      if (Math.abs(e1 - e2) < 0.05) {
        common.push((e1 + e2) / 2);
        break;
      }
    }
  }
  
  if (common.length === 0) return [];
  common.sort((a, b) => a - b);
  
  const selected: number[] = [];
  const kicker = common[0];
  selected.push(kicker);

  const highestCommon = common[common.length - 1];
  const groundAvg = (f1.groundHeight + f2.groundHeight) / 2;
  const heightAboveGround = highestCommon - groundAvg;

  if (heightAboveGround > 1.75) {
    // Doubling up: one at top, and every 1m down
    let curr = highestCommon;
    while (curr > kicker + 0.5) { // don't overlap with kicker
      selected.push(curr);
      // find next common elevation approx 1m down
      const nextElev = common.slice().reverse().find(e => curr - e >= 0.95);
      if (!nextElev) break;
      curr = nextElev;
    }
  } else {
    // Just 1m intervals up from kicker
    let lastElev = kicker;
    for (let i = 1; i < common.length; i++) {
      if (common[i] - lastElev >= 0.95) {
        selected.push(common[i]);
        lastElev = common[i];
      }
    }
    if (highestCommon - lastElev >= 1.4) {
      selected.push(highestCommon);
    }
  }
  
  return Array.from(new Set(selected)).sort((a, b) => a - b);
};`;

let newContent = content.replace(regex, replacement);
fs.writeFileSync('utils/deckLogic.ts', newContent);
console.log("Replaced ledgers!");
