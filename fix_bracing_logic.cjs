const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const getBracingBlockReplacement = (isRaking) => `
  const getBlockBays = (totalBays: number) => {
    if (totalBays <= 2) {
      return [{ start: 0, end: totalBays }];
    }
    const list: { start: number; end: number }[] = [];
    let cur = 0;
    while (cur + 2 <= totalBays) {
      list.push({ start: cur, end: cur + 2 });
      cur += 3;
    }
    const last = list[list.length - 1];
    if (last && last.end < totalBays) {
      const endStart = totalBays - 2;
      if (endStart !== last.start) {
        list.push({ start: endStart, end: totalBays });
      }
    }
    return list;
  };

  const xBlocks = getBlockBays(${isRaking ? 'widthBays' : 'cols'});
  const yBlocks = getBlockBays(depthBays);

  interface BracingBlockDef {
    colStart: number;
    colEnd: number;
    rowStart: number;
    rowEnd: number;
  }

  const getBracedIndices = (blocks: any[], size: number) => {
    const indices = new Set<number>();
    if (size > 20) {
      if (blocks.length > 0) indices.add(0);
      if (blocks.length > 1) indices.add(1);
      if (blocks.length > 0) indices.add(blocks.length - 1);
      if (blocks.length > 1) indices.add(blocks.length - 2);
      if (blocks.length > 0) indices.add(Math.floor(blocks.length / 2));
    } else {
      if (blocks.length > 0) indices.add(0);
      if (blocks.length > 0) indices.add(blocks.length - 1);
    }
    return indices;
  };

  const bracedX = getBracedIndices(xBlocks, exactWidth);
  const bracedY = getBracedIndices(yBlocks, exactDepth);

  const bracingBlocks: BracingBlockDef[] = [];
  xBlocks.forEach((xb, xIdx) => {
    yBlocks.forEach((yb, yIdx) => {
      if (bracedX.has(xIdx) || bracedY.has(yIdx)) {
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
    if (col < 0 || col >= ${isRaking ? 'widthBays' : 'cols'} || row < 0 || row >= depthBays) return false;
    return bracingBlocks.some(b => col >= b.colStart && col < b.colEnd && row >= b.rowStart && row < b.rowEnd);
  };`;

const rakingRegex = /const getBlockBays = \(totalBays: number\) => \{[\s\S]*?const isCellBraced = \(cellX: number, cellY: number\): boolean => \{[\s\S]*?return bracingBlocks\.some\(b => col >= b\.colStart && col < b\.colEnd && row >= b\.rowStart && row < b\.rowEnd\);\n\s*\};/g;

const matches = [...content.matchAll(rakingRegex)];
if (matches.length === 2) {
    let result = content.substring(0, matches[0].index);
    result += getBracingBlockReplacement(true);
    result += content.substring(matches[0].index + matches[0][0].length, matches[1].index);
    result += getBracingBlockReplacement(false);
    result += content.substring(matches[1].index + matches[1][0].length);
    fs.writeFileSync('utils/deckLogic.ts', result);
    console.log("Replaced both blocks.");
} else {
    console.log("Could not find blocks. Matches: " + matches.length);
}

