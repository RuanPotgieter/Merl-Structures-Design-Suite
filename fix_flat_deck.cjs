const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const replacement = `  // --- LEDGER GENERATION LOGIC ---
  // Ledger spacing vertically is 1m apart.
  // When the foot size on respective level exceeds 1750mm a standard with a double cluster is used to double up on the ledger line.
  const ledgerCounts = { blueBlue: 0, blueBlack: 0, blackBlack: 0 };
  const ledgers: Ledger[] = [];
  const processedConnections = new Set<string>();

  feet.forEach(f => {
    if (!f.assembly) return;

    const { x, y } = f.position;
    
    // Check Horizontal Connection (Right: x + 1.2)
    const neighborNextXKey = \`\$\{parseFloat((x + 1.2).toFixed(3))},\$\{parseFloat(y.toFixed(3))}\`;
    
    if (feetMap.has(neighborNextXKey)) {
      const neighbor = feetMap.get(neighborNextXKey)!;
      if (neighbor.assembly) {
        const connKey = \`H_\$\{x.toFixed(3)}_\$\{y.toFixed(3)}\`;
        if (!processedConnections.has(connKey)) {
          processedConnections.add(connKey);
          
          const cellAboveBraced = isCellBraced(x, y);
          const cellBelowBraced = isCellBraced(x, y - 1.2);
          
          if (cellAboveBraced || cellBelowBraced) {
            const isHalf = isHalfRowAt(y);
            const isFirstColumn = Math.abs(x) < 0.05;
            
            let colorType: 'blueBlue' | 'blueBlack' | 'blackBlack' = 'blueBlack';
            let colorHex = '';
            
            if (!isHalf) {
              // Standard Row: Horizontal is "horizontal" to rostrum
              colorType = isFirstColumn ? 'blackBlack' : 'blueBlack';
              colorHex = isFirstColumn ? '#1a1a1a' : '#22c55e';
            } else {
              // Half Row: Horizontal is "vertical" to rostrum
              colorType = 'blueBlue';
              colorHex = '#3b82f6';
            }
            
            const elevations = getLedgerElevations(f, neighbor);
            if (colorType === 'blackBlack') ledgerCounts.blackBlack += elevations.length;
            else if (colorType === 'blueBlack') ledgerCounts.blueBlack += elevations.length;
            else ledgerCounts.blueBlue += elevations.length;

            elevations.forEach((elev, idx) => {
               ledgers.push({
                  id: \`FLAT_LDG_\$\{connKey\}_\$\{idx\}\`,
                  position: { x: x + 0.6, y, z: elev },
                  rotation: { x: 0, y: 0, z: Math.PI / 2 },
                  length: 1.2,
                  color: colorHex,
                  type: colorType
               });
            });
          }
        }
      }
    }

    // Check Vertical Connection (Up: y + 1.2)
    const neighborNextYKey = \`\$\{parseFloat(x.toFixed(3))},\$\{parseFloat((y + 1.2).toFixed(3))}\`;
    
    if (feetMap.has(neighborNextYKey)) {
      const neighbor = feetMap.get(neighborNextYKey)!;
      if (neighbor.assembly) {
        const connKey = \`V_\$\{x.toFixed(3)}_\$\{y.toFixed(3)}\`;
        if (!processedConnections.has(connKey)) {
          processedConnections.add(connKey);
          
          const cellRightBraced = isCellBraced(x, y);
          const cellLeftBraced = isCellBraced(x - 1.2, y);
          if (cellRightBraced || cellLeftBraced) {
            const isHalf = isHalfRowAt(y);
            const isFirstColumn = Math.abs(x) < 0.05;
            
            let colorType: 'blueBlue' | 'blueBlack' | 'blackBlack' = 'blueBlack';
            let colorHex = '';
            
            if (!isHalf) {
              // Standard Row: Vertical is "vertical" to rostrum
              colorType = 'blueBlue';
              colorHex = '#3b82f6';
            } else {
              // Half Row: Vertical is "horizontal" to rostrum
              colorType = isFirstColumn ? 'blackBlack' : 'blueBlack';
              colorHex = isFirstColumn ? '#1a1a1a' : '#22c55e';
            }
            
            const elevations = getLedgerElevations(f, neighbor);
            if (colorType === 'blackBlack') ledgerCounts.blackBlack += elevations.length;
            else if (colorType === 'blueBlack') ledgerCounts.blueBlack += elevations.length;
            else ledgerCounts.blueBlue += elevations.length;
            
            elevations.forEach((elev, idx) => {
               ledgers.push({
                  id: \`FLAT_LDG_\$\{connKey\}_\$\{idx\}\`,
                  position: { x, y: y + 0.6, z: elev },
                  rotation: { x: Math.PI / 2, y: 0, z: 0 },
                  length: 1.2,
                  color: colorHex,
                  type: colorType
               });
            });
          }
        }
      }
    }
  });

  // --- BRACING GENERATION LOGIC ---`;

// ONLY replace the SECOND occurrence of LEDGER GENERATION LOGIC!
const parts = content.split('// --- LEDGER GENERATION LOGIC ---');
if (parts.length === 3) {
  content = parts[0] + '// --- LEDGER GENERATION LOGIC ---' + parts[1] + replacement + parts[2].substring(parts[2].indexOf('// --- BRACING GENERATION LOGIC ---') + 33);
  fs.writeFileSync('utils/deckLogic.ts', content);
  console.log("Restored flat deck");
} else {
  console.log("Could not find blocks properly.");
}

