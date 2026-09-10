const fs = require('fs');
let content = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

// Lower the terrain visualizer so it doesn't clip the soleboards
content = content.replace(
  /pos\.setZ\(i, groundY\);/g,
  `pos.setZ(i, groundY - 0.02);`
);

fs.writeFileSync('components/DeckVisualizer3D.tsx', content);
console.log("Lowered terrain mesh by 20mm");
