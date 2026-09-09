const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex1 = /const firstZLow = zBaseBot;\n        const firstZHigh = zBaseBot \+ 2\.0;\n\n        bracesArray\.push\(\{\n          id: prefix \+ "_L1",\n          startPos: \{ x: xA, y: yA, z: lowAtA \? firstZLow : firstZHigh \},\n          endPos: \{ x: xB, y: yB, z: lowAtA \? firstZHigh : firstZLow \},\n          color: '#dc2626'\n        \}\);\n\n        bracesArray\.push\(\{\n          id: prefix \+ "_L2",\n          startPos: \{ x: xA, y: yA, z: lowAtA \? firstZLow \+ 1\.0 : firstZHigh \+ 1\.0 \},\n          endPos: \{ x: xB, y: yB, z: lowAtA \? firstZHigh \+ 1\.0 : firstZLow \+ 1\.0 \},\n          color: '#dc2626'\n        \}\);/g;

const replacement = `let currentZLow = zBaseBot;
        let currentZHigh = zBaseBot + 2.0;
        let layerIdx = 1;
        while (currentZHigh <= zBaseTop + 0.5) {
           bracesArray.push({
             id: prefix + "_L" + layerIdx,
             startPos: { x: xA, y: yA, z: lowAtA ? currentZLow : currentZHigh },
             endPos: { x: xB, y: yB, z: lowAtA ? currentZHigh : currentZLow },
             color: '#dc2626'
           });
           currentZLow += 1.0;
           currentZHigh += 1.0;
           layerIdx++;
        }`;

content = content.replace(regex1, replacement);

fs.writeFileSync('utils/deckLogic.ts', content);
console.log("Updated addParallelBraces layering");
