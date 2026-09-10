const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const findReplace = (search, replace) => {
  code = code.split(search).join(replace);
};

// Replace isCellLedgered implementation in flat deck
findReplace(
  `  const isCellLedgered = (cellX: number, cellY: number, wBays: number, dBays: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / 1.2);
    if (col < 0 || col >= wBays || row < 0 || row >= dBays) return false;
    if (col < 2 || col >= wBays - 2 || row < 2 || row >= dBays - 2) return true;
    const xBs = getBlockBays(wBays);
    const yBs = getBlockBays(dBays);
    const inX = xBs.some(b => col >= b.start && col < b.end);
    const inY = yBs.some(b => row >= b.start && row < b.end);
    return inX && inY;
  };`,
  `  const isCellLedgered = (cellX: number, cellY: number, wBays: number, dBays: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / 1.2);
    if (col < 0 || col >= wBays || row < 0 || row >= dBays) return false;
    const xBs = getBlockBays(wBays);
    const yBs = getBlockBays(dBays);
    const inX = xBs.some(b => col >= b.start && col < b.end);
    const inY = yBs.some(b => row >= b.start && row < b.end);
    return inX && inY;
  };`
);

// Do the same for raking deck
findReplace(
  `  const isCellLedgered = (cellX: number, cellY: number, wBays: number, dBays: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / stepDepth);
    if (col < 0 || col >= wBays || row < 0 || row >= dBays) return false;
    if (col < 2 || col >= wBays - 2 || row < 2 || row >= dBays - 2) return true;
    const xBs = getBlockBays(wBays);
    const yBs = getBlockBays(dBays);
    const inX = xBs.some(b => col >= b.start && col < b.end);
    const inY = yBs.some(b => row >= b.start && row < b.end);
    return inX && inY;
  };`,
  `  const isCellLedgered = (cellX: number, cellY: number, wBays: number, dBays: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / stepDepth);
    if (col < 0 || col >= wBays || row < 0 || row >= dBays) return false;
    const xBs = getBlockBays(wBays);
    const yBs = getBlockBays(dBays);
    const inX = xBs.some(b => col >= b.start && col < b.end);
    const inY = yBs.some(b => row >= b.start && row < b.end);
    return inX && inY;
  };`
);

fs.writeFileSync('utils/deckLogic.ts', code);
