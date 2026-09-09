const fs = require('fs');
let content = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

const regex = /\/\/ Prevent ground from protruding through the deck surface[\s\S]*?pos\.setZ\(i, groundY\);/g;
content = content.replace(regex, `pos.setZ(i, groundY);`);

fs.writeFileSync('components/DeckVisualizer3D.tsx', content);
console.log("Reverted TerrainMesh clipping");
