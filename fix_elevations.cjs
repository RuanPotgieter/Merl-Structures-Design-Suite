const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const targetRegex = /const selected: number\[\] = \[\];[\s\S]*?return selected;/;

const newLogic = `const selected: number[] = [];
  const kicker = common[0];
  selected.push(kicker);

  const highestCommon = common[common.length - 1];

  if (highestCommon > kicker + 0.4) {
    let curr = highestCommon;
    while (curr > kicker + 0.4) {
      selected.push(curr);
      const nextElev = common.slice().reverse().find(e => curr - e >= 0.95);
      if (!nextElev) break;
      curr = nextElev;
    }
  }

  // Remove duplicates and sort
  const uniqueSelected = [...new Set(selected)].sort((a, b) => a - b);
  return uniqueSelected;`;

content = content.replace(targetRegex, newLogic);
fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Replaced elevations logic.");
