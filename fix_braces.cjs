const fs = require('fs');
let content = fs.readFileSync('utils/deckLogic.ts', 'utf8');

const regex1 = /const addParallelBraces = \([\s\S]*?\} else \{[\s\S]*?const maxBraceSpan = 2\.0;[\s\S]*?let currentOffset = 0;[\s\S]*?let layer = 0;[\s\S]*?while \(currentOffset < maxH - 0\.1\) \{[\s\S]*?layer\+\+;\n        \}\n      \}\n    \};/g;

const replacement = `const addParallelBraces = (
      bracesArray: any[],
      prefix: string,
      xA: number, yA: number, botA: number, topA: number,
      xB: number, yB: number, botB: number, topB: number,
      lowAtA: boolean,
      isHighDeck: boolean
    ) => {
      const hA = topA - botA;
      const hB = topB - botB;
      const maxH = Math.max(hA, hB);

      const zBaseBot = Math.min(botA, botB);
      const zBaseTop = Math.max(topA, topB);

      if (!isHighDeck || maxH <= 3.0) {
        if (typeof (globalThis as any).addBraceSafe === 'function' || bracesArray.length > -100) {
           // Just push normally
           const brace = {
            id: prefix,
            startPos: { x: xA, y: yA, z: lowAtA ? botA : topA },
            endPos: { x: xB, y: yB, z: lowAtA ? topB : botB },
            color: '#dc2626'
           };
           // In flat deck, we need to check duplicates if addBraceSafe is available, 
           // but since we are replacing a local function, we can just do a simple check.
           if (!bracesArray.find(b => b.id === prefix)) {
               bracesArray.push(brace);
           }
        }
      } else {
        // Deck > 3m: Brace cant stretch full height. Second layer 1m above first.
        const firstZLow = zBaseBot;
        const firstZHigh = zBaseBot + 2.0;

        bracesArray.push({
          id: prefix + "_L1",
          startPos: { x: xA, y: yA, z: lowAtA ? firstZLow : firstZHigh },
          endPos: { x: xB, y: yB, z: lowAtA ? firstZHigh : firstZLow },
          color: '#dc2626'
        });

        bracesArray.push({
          id: prefix + "_L2",
          startPos: { x: xA, y: yA, z: lowAtA ? firstZLow + 1.0 : firstZHigh + 1.0 },
          endPos: { x: xB, y: yB, z: lowAtA ? firstZHigh + 1.0 : firstZLow + 1.0 },
          color: '#dc2626'
        });
      }
    };`;

let newContent = content.replace(regex1, replacement);
fs.writeFileSync('utils/deckLogic.ts', newContent);
console.log("Replaced!");
