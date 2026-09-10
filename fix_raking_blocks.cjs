const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const oldBlock = `  const bracingBlocks: BracingBlockDef[] = [];
  xBlocks.forEach(xb => {
    yBlocks.forEach(yb => {
      const isPerimeter = xb.start === 0 || xb.end === widthBays || yb.start === 0 || yb.end === depthBays;
      if (true) {
        bracingBlocks.push({
          colStart: xb.start,
          colEnd: xb.end,
          rowStart: yb.start,
          rowEnd: yb.end
        });
      }
    });
  });`;

const newBlock = `  const bracingBlocks: BracingBlockDef[] = [];
  xBlocks.forEach(xb => {
    yBlocks.forEach(yb => {
      const isPerimeter = xb.start === 0 || xb.end === widthBays || yb.start === 0 || yb.end === depthBays;
      if (isPerimeter) {
        bracingBlocks.push({
          colStart: xb.start,
          colEnd: xb.end,
          rowStart: yb.start,
          rowEnd: yb.end
        });
      }
    });
  });`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed raking deck blocks");
