const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// For Raking Deck
content = content.replace(
  /const isPerimeter = xb\.start === 0 \|\| xb\.end === widthBays \|\| yb\.start === 0 \|\| yb\.end === depthBays;\n\s*if \(isPerimeter\) \{/g,
  `const isPerimeter = xb.start === 0 || xb.end === widthBays || yb.start === 0 || yb.end === depthBays;
      if (true) {`
);

// For Flat Deck (around line 1637)
content = content.replace(
  /const isPerimeter =\n\s*xb\.start === 0 \|\| xb\.end === widthBays \|\|\n\s*yb\.start === 0 \|\| yb\.end === depthBays;\n\s*if \(isPerimeter\) \{/g,
  `const isPerimeter = xb.start === 0 || xb.end === widthBays || yb.start === 0 || yb.end === depthBays;
      if (true) {`
);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Enabled bracing blocks everywhere");
