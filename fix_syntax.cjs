const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

// I'll just replace the whole ledger loop to be perfectly balanced.
const regex = /\/\/ --- LEDGER GENERATION LOGIC ---[\s\S]*?\/\/ --- BRACING GENERATION LOGIC ---/g;

let block = `// --- LEDGER GENERATION LOGIC ---
  // Ledger spacing vertically is 1m apart.
  // When the foot size on respective level exceeds 1750mm a standard with a double cluster is used to double up on the ledger line.
  const ledgerCounts = { blueBlue: 0, blueBlack: 0, blackBlack: 0 };
  const ledgers: Ledger[] = [];
  const processedConnections = new Set<string>();

  // Helper to connect adjacent feet with ledgers
  feet.forEach(f => {
    if (!f.assembly) return;
    const { x, y } = f.position;

    // Connect across width (x + 1.2 or next x in feetMap)
    feet.forEach(f2 => {
      if (f2.id === f.id || !f2.assembly) return;
      const dx = f2.position.x - x;
      const dy = f2.position.y - y;

      // Horizontal connection along X (same depth y)
      if (Math.abs(dy) < 0.05 && dx > 0.5 && dx <= 2.45) {
        const hasMiddleFoot = feet.some(f3 => f3.id !== f.id && f3.id !== f2.id && f3.assembly && Math.abs(f3.position.y - y) < 0.05 && f3.position.x > x + 0.1 && f3.position.x < f2.position.x - 0.1);
        if (!hasMiddleFoot) {
          const connKey = \`H_\$\{x.toFixed(2)\}_\$\{y.toFixed(2)\}_\$\{f2.position.x.toFixed(2)\}\`;
          if (!processedConnections.has(connKey)) {
            const cellAboveBraced = isCellBraced(x, y);
            const cellBelowBraced = isCellBraced(x, y - 1.2);
            if (cellAboveBraced || cellBelowBraced) {
              processedConnections.add(connKey);
              
              const elevations = getLedgerElevations(f, f2);

              const ledgerLen = dx;
              elevations.forEach((elev, idx) => {
                ledgerCounts.blueBlue++;
                ledgers.push({
                  id: \`RAKE_LDG_\$\{connKey\}_\$\{idx\}\`,
                  position: { x: (x + f2.position.x) / 2, y, z: elev },
                  rotation: { x: 0, y: 0, z: Math.PI / 2 },
                  length: ledgerLen,
                  color: '#3b82f6',
                  type: 'blueBlue'
                });
              });
            }
          }
        }
      }

      // Depth connection along Z (same x)
      if (Math.abs(dx) < 0.05 && dy > 0.4 && dy <= stepDepth * 1.1) {
        const hasMiddleFoot = feet.some(f3 => f3.id !== f.id && f3.id !== f2.id && f3.assembly && Math.abs(f3.position.x - x) < 0.05 && f3.position.y > y + 0.1 && f3.position.y < f2.position.y - 0.1);
        if (!hasMiddleFoot) {
          const connKey = \`V_\$\{x.toFixed(2)\}_\$\{y.toFixed(2)\}_\$\{f2.position.y.toFixed(2)\}\`;
          if (!processedConnections.has(connKey)) {
            const cellRightBraced = isCellBraced(x, y);
            const cellLeftBraced = isCellBraced(x - 1.2, y);
            if (cellRightBraced || cellLeftBraced) {
              processedConnections.add(connKey);
              
              const elevations = getLedgerElevations(f, f2);
              
              elevations.forEach((elev, idx) => {
                ledgerCounts.blueBlack++;
                ledgers.push({
                  id: \`RAKE_LDG_\$\{connKey\}_\$\{idx\}\`,
                  position: { x, y: (y + f2.position.y) / 2, z: elev },
                  rotation: { x: Math.PI / 2, y: 0, z: 0 },
                  length: dy,
                  color: '#22c55e',
                  type: 'blueBlack'
                });
              });
            }
          }
        }
      }
    });
  });

  // --- BRACING GENERATION LOGIC ---`;

content = content.replace(regex, block);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Fixed syntax");
