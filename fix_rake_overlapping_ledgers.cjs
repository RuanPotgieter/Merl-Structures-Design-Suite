const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// We can sort feet by X and Y, and only connect to the immediate next foot in that row/column.
// But the easiest way is to modify the dx/dy check.
// If dx > 0.5 && dx <= 2.45, we should only connect if there is no other foot between f and f2!

content = content.replace(
  /if \(Math\.abs\(dy\) < 0\.05 && dx > 0\.5 && dx <= 2\.45\) \{/g,
  `if (Math.abs(dy) < 0.05 && dx > 0.5 && dx <= 2.45) {
        const hasMiddleFoot = feet.some(f3 => f3.id !== f.id && f3.id !== f2.id && f3.assembly && Math.abs(f3.position.y - y) < 0.05 && f3.position.x > x + 0.1 && f3.position.x < f2.position.x - 0.1);
        if (!hasMiddleFoot) {`
);

content = content.replace(
  /type: 'blueBlue'\n\s*\}\);\n\s*\}\);\n\s*\}\n\s*\}/g,
  `type: 'blueBlue'
            });
          });
          }
        }`
);

content = content.replace(
  /if \(Math\.abs\(dx\) < 0\.05 && dy > 0\.4 && dy <= stepDepth \* 1\.1\) \{/g,
  `if (Math.abs(dx) < 0.05 && dy > 0.4 && dy <= stepDepth * 1.1) {
        const hasMiddleFoot = feet.some(f3 => f3.id !== f.id && f3.id !== f2.id && f3.assembly && Math.abs(f3.position.x - x) < 0.05 && f3.position.y > y + 0.1 && f3.position.y < f2.position.y - 0.1);
        if (!hasMiddleFoot) {`
);

content = content.replace(
  /type: 'blueBlack'\n\s*\}\);\n\s*\}\);\n\s*\}/g,
  `type: 'blueBlack'
            });
          });
          }
        }`
);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed rake overlapping ledgers");
