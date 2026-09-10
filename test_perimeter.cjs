const fs = require('fs');
let code = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// For Flat Deck Horizontal
code = code.split(
  `          const cellAboveBraced = isCellLedgered(x, y, cols, depthBays);
          const cellBelowBraced = isCellLedgered(x, y - 1.2, cols, depthBays);
          
          if (cellAboveBraced || cellBelowBraced) {`
).join(
  `          const cellAboveBraced = isCellLedgered(x, y, cols, depthBays);
          const cellBelowBraced = isCellLedgered(x, y - 1.2, cols, depthBays);
          const isPerimeter = y <= 0.05 || y >= deck.depth - 0.05;
          if (isPerimeter || cellAboveBraced || cellBelowBraced) {`
);

// For Flat Deck Vertical
code = code.split(
  `          const cellRightBraced = isCellLedgered(x, y, cols, depthBays);
          const cellLeftBraced = isCellLedgered(x - 1.2, y, cols, depthBays);
          if (cellRightBraced || cellLeftBraced) {`
).join(
  `          const cellRightBraced = isCellLedgered(x, y, cols, depthBays);
          const cellLeftBraced = isCellLedgered(x - 1.2, y, cols, depthBays);
          const isPerimeter = x <= 0.05 || x >= deck.width - 0.05;
          if (isPerimeter || cellRightBraced || cellLeftBraced) {`
);

// For Raking Deck Horizontal
code = code.split(
  `            const cellAboveBraced = isCellLedgered(x, y, widthBays, depthBays);
            const cellBelowBraced = isCellLedgered(x, y - 1.2, widthBays, depthBays);
            if (cellAboveBraced || cellBelowBraced) {`
).join(
  `            const cellAboveBraced = isCellLedgered(x, y, widthBays, depthBays);
            const cellBelowBraced = isCellLedgered(x, y - 1.2, widthBays, depthBays);
            const isPerimeter = y <= 0.05 || y >= (depthBays * stepDepth) - 0.05;
            if (isPerimeter || cellAboveBraced || cellBelowBraced) {`
);

// For Raking Deck Vertical
code = code.split(
  `            const cellRightBraced = isCellLedgered(x, y, widthBays, depthBays);
            const cellLeftBraced = isCellLedgered(x - 1.2, y, widthBays, depthBays);
            if (cellRightBraced || cellLeftBraced) {`
).join(
  `            const cellRightBraced = isCellLedgered(x, y, widthBays, depthBays);
            const cellLeftBraced = isCellLedgered(x - 1.2, y, widthBays, depthBays);
            const isPerimeter = x <= 0.05 || x >= deck.width - 0.05;
            if (isPerimeter || cellRightBraced || cellLeftBraced) {`
);


fs.writeFileSync('utils/deckLogic.ts', code);
