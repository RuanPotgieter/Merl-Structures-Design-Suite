const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const missingFunctions = `
  const getBlockBays = (totalBays: number) => {
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
      cur = end + 1;
    }
    const last = list[list.length - 1];
    if (last && last.end < totalBays) {
      const endStart = Math.max(0, totalBays - 2);
      if (!list.some(item => item.start === endStart)) {
        list.push({ start: endStart, end: totalBays });
      }
    }
    return list;
  };

  const xBlocks = getBlockBays(widthBays);
  const yBlocks = getBlockBays(depthBays);

  interface BracingBlockDef {
    colStart: number;
    colEnd: number;
    rowStart: number;
    rowEnd: number;
  }

  const bracingBlocks: BracingBlockDef[] = [];
  xBlocks.forEach(xb => {
    yBlocks.forEach(yb => {
      if (true) {
        bracingBlocks.push({
          colStart: xb.start,
          colEnd: xb.end,
          rowStart: yb.start,
          rowEnd: yb.end
        });
      }
    });
  });

  const isCellBraced = (cellX: number, cellY: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / 1.2);
    if (col < 0 || col >= widthBays || row < 0 || row >= depthBays) return false;
    return bracingBlocks.some(b => col >= b.colStart && col < b.colEnd && row >= b.rowStart && row < b.rowEnd);
  };

  const isHalfRowAt = (cellY: number): boolean => {
    let currentY = 0;
    for (const h of rowHeights) {
      if (cellY >= currentY - 0.05 && cellY < currentY + h - 0.05) {
        return Math.abs(h - 1.2) < 0.1;
      }
      currentY += h;
    }
    return false;
  };
`;

const parts = content.split('// --- LEDGER GENERATION LOGIC ---');
if (parts.length === 3) {
  content = parts[0] + '// --- LEDGER GENERATION LOGIC ---' + parts[1] + missingFunctions + '\n  // --- LEDGER GENERATION LOGIC ---' + parts[2];
  fs.writeFileSync('utils/deckLogic.ts', content);
  console.log("Restored missing functions");
}
