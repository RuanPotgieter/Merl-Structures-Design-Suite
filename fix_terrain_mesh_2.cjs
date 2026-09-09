const fs = require('fs');
let content = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

const regex = /const rMinElev = Math\.min\(r\.startElevation \?\? Infinity, r\.endElevation \?\? Infinity\);/g;

content = content.replace(regex, `const startE = r.startElevation !== undefined ? r.startElevation : (Number(terrain?.deckHeight) || 0);
           const endE = r.endElevation !== undefined ? r.endElevation : (Number(terrain?.deckHeight) || 0);
           const rMinElev = Math.min(startE, endE);`);

fs.writeFileSync('components/DeckVisualizer3D.tsx', content);
console.log("Updated TerrainMesh 2");
