const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex = /export const getLedgerElevations = \(f1: Foot, f2: Foot\): number\[\] => \{[\s\S]*?return Array\.from\(new Set\(selected\)\)\.sort\(\(a, b\) => a - b\);\n\};/;

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

  if (highestCommon > kicker + 0.4) {
    let curr = highestCommon;
    while (curr >= kicker + 0.45) { // allow pushing ledgers at least ~0.5m apart from kicker
      selected.push(curr);
      const nextElev = common.slice().reverse().find(e => curr - e >= 0.95);
      if (!nextElev) break;
      curr = nextElev;
    }
  }
  
  return Array.from(new Set(selected)).sort((a, b) => a - b);
};`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('utils/deckLogic.ts', content);
    console.log("Successfully replaced getLedgerElevations.");
} else {
    console.log("Could not find getLedgerElevations with regex.");
}
