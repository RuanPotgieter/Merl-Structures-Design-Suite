const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// I need to add const depthBays = Math.round(exactDepth / 1.2); just before the flat deck's xBlocks.
// The flat deck uses cols for widthBays.
const target = `  const xBlocks = getBlockBays(cols);
  const yBlocks = getBlockBays(depthBays);`;

const replacement = `  const depthBays = Math.round(exactDepth / 1.2);
  const xBlocks = getBlockBays(cols);
  const yBlocks = getBlockBays(depthBays);`;

const index = content.lastIndexOf(target);
if (index !== -1) {
    const start = content.substring(0, index);
    const end = content.substring(index + target.length);
    fs.writeFileSync('utils/deckLogic.ts', start + replacement + end);
    console.log("Fixed depthBays");
} else {
    console.log("Target not found");
}
