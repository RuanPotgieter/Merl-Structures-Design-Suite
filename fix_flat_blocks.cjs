const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// Replace the flat deck blocks logic
const oldBlock = `  const xBlocks = getBlockBays(cols);
  const yBlocks = getBlockBays(rows);

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
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    return bracingBlocks.some(b => col >= b.colStart && col < b.colEnd && row >= b.rowStart && row < b.rowEnd);
  };`;

const newBlock = `  const depthBays = Math.round(exactDepth / 1.2);
  const xBlocks = getBlockBays(cols);
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
      const isPerimeter = xb.start === 0 || xb.end === cols || yb.start === 0 || yb.end === depthBays;
      if (isPerimeter) {
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
    if (col < 0 || col >= cols || row < 0 || row >= depthBays) return false;
    return bracingBlocks.some(b => col >= b.colStart && col < b.colEnd && row >= b.rowStart && row < b.rowEnd);
  };`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed flat deck blocks");
