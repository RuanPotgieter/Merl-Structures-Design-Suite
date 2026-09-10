const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// Replace raking logic 1
content = content.replace(
  `// --- LEDGER GENERATION LOGIC ---
  // Ledger spacing vertically is 1m apart.`,
  `const isCellLedgered = (cellX: number, cellY: number, wBays: number, dBays: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / 1.2);
    if (col < 0 || col >= wBays || row < 0 || row >= dBays) return false;
    if (col < 2 || col >= wBays - 2 || row < 2 || row >= dBays - 2) return true;
    const xBs = getBlockBays(wBays);
    const yBs = getBlockBays(dBays);
    const inX = xBs.some(b => col >= b.start && col < b.end);
    const inY = yBs.some(b => row >= b.start && row < b.end);
    return inX && inY;
  };

  // --- LEDGER GENERATION LOGIC ---
  // Ledger spacing vertically is 1m apart.`
);

// Replace raking isCellBraced for ledgers
content = content.replace(
  `            const cellAboveBraced = isCellBraced(x, y);
            const cellBelowBraced = isCellBraced(x, y - 1.2);
            if (cellAboveBraced || cellBelowBraced) {`,
  `            const cellAboveBraced = isCellLedgered(x, y, widthBays, depthBays);
            const cellBelowBraced = isCellLedgered(x, y - 1.2, widthBays, depthBays);
            if (cellAboveBraced || cellBelowBraced) {`
);

content = content.replace(
  `            const cellRightBraced = isCellBraced(x, y);
            const cellLeftBraced = isCellBraced(x - 1.2, y);
            if (cellRightBraced || cellLeftBraced) {`,
  `            const cellRightBraced = isCellLedgered(x, y, widthBays, depthBays);
            const cellLeftBraced = isCellLedgered(x - 1.2, y, widthBays, depthBays);
            if (cellRightBraced || cellLeftBraced) {`
);


// Replace flat isCellBraced for ledgers
// Wait, the flat deck uses cols, depthBays.
content = content.replace(
  `          const cellAboveBraced = isCellBraced(x, y);
          const cellBelowBraced = isCellBraced(x, y - 1.2);
          
          if (cellAboveBraced || cellBelowBraced) {`,
  `          const cellAboveBraced = isCellLedgered(x, y, cols, depthBays);
          const cellBelowBraced = isCellLedgered(x, y - 1.2, cols, depthBays);
          
          if (cellAboveBraced || cellBelowBraced) {`
);

content = content.replace(
  `          const cellRightBraced = isCellBraced(x, y);
          const cellLeftBraced = isCellBraced(x - 1.2, y);
          
          if (cellRightBraced || cellLeftBraced) {`,
  `          const cellRightBraced = isCellLedgered(x, y, cols, depthBays);
          const cellLeftBraced = isCellLedgered(x - 1.2, y, cols, depthBays);
          
          if (cellRightBraced || cellLeftBraced) {`
);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed ledgers");
