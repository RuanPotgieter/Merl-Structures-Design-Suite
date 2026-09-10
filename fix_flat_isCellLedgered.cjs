const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// I will insert it right before:
// const ledgerCounts = { blueBlue: 0, blueBlack: 0, blackBlack: 0 };
// inside createFlatDeck
const target = `  const ledgerCounts = { blueBlue: 0, blueBlack: 0, blackBlack: 0 };`;
const replacement = `  const isCellLedgered = (cellX: number, cellY: number, wBays: number, dBays: number): boolean => {
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

  const ledgerCounts = { blueBlue: 0, blueBlack: 0, blackBlack: 0 };`;

// Make sure we only replace the one in flat deck? Actually it doesn't matter if we just find the last index.
const index = content.lastIndexOf(target);
if (index !== -1) {
    const start = content.substring(0, index);
    const end = content.substring(index + target.length);
    fs.writeFileSync('utils/deckLogic.ts', start + replacement + end);
    console.log("Injected isCellLedgered to flat deck");
} else {
    console.log("Target not found");
}

