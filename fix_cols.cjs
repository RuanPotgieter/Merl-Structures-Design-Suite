const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// I'll replace the block I just injected with the right variables
const regex = /const xBlocks = getBlockBays\(widthBays\);\n\s*const yBlocks = getBlockBays\(depthBays\);[\s\S]*?const isCellBraced = \(cellX: number, cellY: number\): boolean => \{[\s\S]*?if \(col < 0 \|\| col >= widthBays \|\| row < 0 \|\| row >= depthBays\) return false;[\s\S]*?return false;\n\s*\};/g;

const replacement = `const xBlocks = getBlockBays(cols);
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
  };`;

// Because I injected this block AT THE VERY END OF parts[1], I should just do a replace.
const occurrences = content.split('const xBlocks = getBlockBays(widthBays);');
if (occurrences.length >= 3) {
  // It's the second occurrence we want to replace (the one in calculateSingleDeck)
  // Let's just do a string replace on the last instance in the file.
  const lastIndex = content.lastIndexOf('const xBlocks = getBlockBays(widthBays);');
  if (lastIndex !== -1) {
    const start = content.substring(0, lastIndex);
    let end = content.substring(lastIndex);
    end = end.replace(/const xBlocks = getBlockBays\(widthBays\);\n\s*const yBlocks = getBlockBays\(depthBays\);[\s\S]*?return false;\n\s*\};/, replacement);
    fs.writeFileSync('utils/deckLogic.ts', start + end);
    console.log("Fixed vars");
  }
}

