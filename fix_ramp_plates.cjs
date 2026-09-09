const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regexFeet = /const errors: string\[\] = \[\];\n\n  feet\.forEach\(f => \{/g;
const replacementFeet = `const errors: string[] = [];

  const rampLeadingEdges = rampDataForBracing.map(rd => {
    if (rd.rc.side === 'bottom') return { axis: 'y', val: rd.startY - rd.exactRampLength, rd };
    if (rd.rc.side === 'top') return { axis: 'y', val: rd.startY + rd.exactRampLength, rd };
    if (rd.rc.side === 'left') return { axis: 'x', val: rd.startX - rd.exactRampLength, rd };
    if (rd.rc.side === 'right') return { axis: 'x', val: rd.startX + rd.exactRampLength, rd };
    return null;
  }).filter(Boolean);

  const rampPlates: import('../types').RampPlate[] = [];
  
  rampDataForBracing.forEach(rd => {
    let currentPos = 0;
    while (currentPos < rd.exactRampWidth - 0.05) {
      let pWidth = 1.2;
      if (rd.exactRampWidth - currentPos >= 2.4 - 0.05) {
         pWidth = 2.4;
      } else {
         pWidth = 1.2;
      }
      
      let px = 0, py = 0, rot = 0;
      let depth = 0.6;
      
      if (rd.rc.side === 'bottom') {
         py = rd.startY - rd.exactRampLength - depth / 2;
         px = rd.startX + rd.exactRampWidth - currentPos - pWidth / 2;
         rot = 0;
      } else if (rd.rc.side === 'top') {
         py = rd.startY + rd.exactRampLength + depth / 2;
         px = rd.startX + rd.exactRampWidth - currentPos - pWidth / 2;
         rot = 0;
      } else if (rd.rc.side === 'left') {
         px = rd.startX - rd.exactRampLength - depth / 2;
         py = rd.startY + rd.exactRampWidth - currentPos - pWidth / 2;
         rot = Math.PI / 2;
      } else if (rd.rc.side === 'right') {
         px = rd.startX + rd.exactRampLength + depth / 2;
         py = rd.startY + rd.exactRampWidth - currentPos - pWidth / 2;
         rot = Math.PI / 2;
      }
      
      rampPlates.push({
        id: \`RAMP_PLATE_\${rd.rc.id}_\${currentPos}\`,
        position: { x: px, y: py, z: rd.farEndElev },
        width: pWidth,
        depth: depth,
        rotation: rot
      });
      
      currentPos += pWidth;
    }
  });

  feet.forEach(f => {
    f.groundHeight = getGroundYAt(f.position.x, f.position.y, terrain, exactWidth, exactDepth);
    const reqH = f.targetElevation - f.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;

    let isRampLeadingEdge = false;
    for (const edge of rampLeadingEdges) {
       if (edge.axis === 'x' && Math.abs(f.position.x - edge.val) < 0.05) isRampLeadingEdge = true;
       if (edge.axis === 'y' && Math.abs(f.position.y - edge.val) < 0.05) isRampLeadingEdge = true;
    }

    if (isRampLeadingEdge) {
       return;
    }
`;

let newContent = content.replace(regexFeet, replacementFeet);
fs.writeFileSync('utils/deckLogic.ts', newContent);
console.log("Replaced feet loop!");
