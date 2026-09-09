const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex = /let isRampLeadingEdge = false;\n    for \(const edge of rampLeadingEdges\) \{\n       if \(edge\.axis === 'x' && Math\.abs\(f\.position\.x - edge\.val\) < 0\.05\) isRampLeadingEdge = true;\n       if \(edge\.axis === 'y' && Math\.abs\(f\.position\.y - edge\.val\) < 0\.05\) isRampLeadingEdge = true;\n    \}/g;

const replacement = `let isRampLeadingEdge = false;
    for (const edge of rampLeadingEdges) {
       if (edge.axis === 'x' && Math.abs(f.position.x - edge.val) < 0.05 && f.position.y >= edge.rd.startY - 0.05 && f.position.y <= edge.rd.startY + edge.rd.exactRampWidth + 0.05) {
           isRampLeadingEdge = true;
       }
       if (edge.axis === 'y' && Math.abs(f.position.y - edge.val) < 0.05 && f.position.x >= edge.rd.startX - 0.05 && f.position.x <= edge.rd.startX + edge.rd.exactRampWidth + 0.05) {
           isRampLeadingEdge = true;
       }
    }`;

content = content.replace(regex, replacement);
fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Updated leading edge check");
