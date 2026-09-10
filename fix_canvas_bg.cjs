const fs = require('fs');
let code = fs.readFileSync('components/DeckVisualizer3D.tsx', 'utf8');

code = code.replace(
  'const BG_COLOR = "#e5e7eb";',
  'const BG_COLOR = "#ffffff";'
);

fs.writeFileSync('components/DeckVisualizer3D.tsx', code);
