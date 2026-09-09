const fs = require('fs');
let content = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

content = content.replace(
  /soles\.push\(\{ pos: \[x, f\.groundHeight \+ SOLE_BOARD_THICKNESS \/ 2, y\] \}\);\n         \n      if \(f\.assembly\) \{/g,
  `if (f.assembly) {\n        soles.push({ pos: [x, f.groundHeight + SOLE_BOARD_THICKNESS / 2, y] });`
);

fs.writeFileSync('components/DeckVisualizer3D.tsx', content);
console.log("Fixed sole boards");
