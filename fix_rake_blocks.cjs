const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// The injected getBlockBays in raking deck is around line 408
// We'll just replace the whole getBlockBays block up to xBlocks
const regex = /const getBlockBays = \(totalBays: number\) => \{[\s\S]*?return list;\n\s*\};\n\n\s*const xBlocks = getBlockBays\(widthBays\);/g;

const replacement = `const getBlockBays = (totalBays: number) => {
    if (totalBays <= 2) {
      return [{ start: 0, end: totalBays }];
    }
    const list: { start: number; end: number }[] = [];
    let cur = 0;
    while (cur < totalBays) {
      const start = cur;
      const end = Math.min(totalBays, start + 2);
      if (end > start) {
        list.push({ start, end });
      }
      // 1 open bay between blocks
      cur = end + 1;
    }
    // Ensure the far edge has a securing block if there are remaining unbraced bays
    const last = list[list.length - 1];
    if (last && last.end < totalBays) {
      const endStart = Math.max(0, totalBays - 2);
      if (!list.some(item => item.start === endStart)) {
        list.push({ start: endStart, end: totalBays });
      }
    }
    return list;
  };

  const xBlocks = getBlockBays(widthBays);`;

content = content.replace(regex, replacement);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed rake deck getBlockBays");
