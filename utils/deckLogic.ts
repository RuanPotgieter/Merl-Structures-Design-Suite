import { 
  DeckCalculationResult, 
  Foot, 
  Rostrum, 
  TerrainConfig, 
  LegAssembly,
  RampConfig,
  Ledger,
  Brace,
  Upright,
  Handrail
} from '../types';
import { 
  STANDARD_HEIGHTS_MM, 
  BASEJACK_TYPES_MM, 
  JACK_PIPE_COMPATIBILITY,
  DECK_THICKNESS,
  SOLE_BOARD_THICKNESS
} from '../constants';

/**
 * Bilinear Ground Sampling (PER_FOOT)
 */
export const getGroundYAt = (x: number, y: number, terrain: TerrainConfig, width: number, depth: number): number => {
  const u = width ? Math.max(0, Math.min(1, x / width)) : 0;
  const v = depth ? Math.max(0, Math.min(1, y / depth)) : 0;
  
  const offsets = terrain?.groundOffsets || {} as any;
  const h00 = 0; 
  const h10 = -(Number(offsets.widthEnd) || 0);  
  const h01 = -(Number(offsets.depthEnd) || 0);  
  const h11 = -(Number(offsets.diagonal) || 0); 

  return (1 - u) * (1 - v) * h00 + u * (1 - v) * h10 + (1 - u) * v * h01 + u * v * h11;
};

/**
 * Engineering Solver: Selects discrete components (Basejack, Pipe, Standards)
 * Basejacks are adjustable. We aim for a runout within 100mm-400mm.
 */
const legAssemblyCache = new Map<string, LegAssembly | null>();

const solveLegAssembly = (requiredHeightM: number, specifiedDeckHeightM: number): LegAssembly | null => {
  const targetMm = Math.round(requiredHeightM * 1000);
  const cacheKey = `${targetMm}_${specifiedDeckHeightM}`;
  if (legAssemblyCache.has(cacheKey)) {
    return legAssemblyCache.get(cacheKey);
  }

  const MIN_RUNOUT = 100;
  const MAX_RUNOUT = 400;

  // 1. Low height support: Basejack only (100mm - 400mm safe adjustment)
  if (targetMm >= MIN_RUNOUT && targetMm <= MAX_RUNOUT) {
    const result: LegAssembly = {
      basejack: targetMm,
      pipe: 0,
      standards: [],
      totalHeight: requiredHeightM
    };
    legAssemblyCache.set(cacheKey, result);
    return result;
  }

  // 2. Basejack + Pipe only (e.g. 200mm, 400mm pipe)
  for (const pipe of [200, 400]) {
    const runoutNeeded = targetMm - pipe;
    if (runoutNeeded >= MIN_RUNOUT && runoutNeeded <= MAX_RUNOUT) {
      const result: LegAssembly = {
        basejack: runoutNeeded,
        pipe: pipe,
        standards: [],
        totalHeight: requiredHeightM
      };
      legAssemblyCache.set(cacheKey, result);
      return result;
    }
  }

  const allowStacking = true; // Always allow stacking if needed
  const sortedStds = [...STANDARD_HEIGHTS_MM].sort((a, b) => b - a);
  const suitableJacks = BASEJACK_TYPES_MM.filter(bj => bj >= 400);

  // Helper function to recursively find standard combinations
  const findStandards = (remainingMm: number, currentCombo: number[]): number[] | null => {
    if (remainingMm >= MIN_RUNOUT && remainingMm <= MAX_RUNOUT) {
      return currentCombo;
    }
    // If we overshoot or have stacked too many (limit to 10 for safety), abort this path
    if (remainingMm < MIN_RUNOUT || currentCombo.length > 10) return null;

    for (const std of sortedStds) {
      const combo = findStandards(remainingMm - std, [...currentCombo, std]);
      if (combo) return combo;
    }
    return null;
  };

  for (const bj of suitableJacks) {
    const compatiblePipes = JACK_PIPE_COMPATIBILITY[bj] || [];
    for (const pipe of compatiblePipes) {
      const remainingForStds = targetMm - pipe;
      
      const standards = findStandards(remainingForStds, []);
      if (standards) {
        const runoutNeeded = remainingForStds - standards.reduce((a, b) => a + b, 0);
        const result = {
          basejack: runoutNeeded,
          pipe: pipe,
          standards: standards,
          totalHeight: requiredHeightM
        };
        legAssemblyCache.set(cacheKey, result);
        return result;
      }
    }
  }
  
  legAssemblyCache.set(cacheKey, null);
  return null;
};

const vPressingCache = new Map<string, number[]>();

export const getVPressingElevations = (f: Foot): number[] => {
  if (!f.assembly) return [];
  
  const cacheKey = `${f.groundHeight}_${f.assembly.basejack}_${f.assembly.pipe}_${f.assembly.standards.join(',')}`;
  if (vPressingCache.has(cacheKey)) {
    return vPressingCache.get(cacheKey)!;
  }

  const elevations: number[] = [];
  let currentElev = f.groundHeight + SOLE_BOARD_THICKNESS + (f.assembly.basejack / 1000) + (f.assembly.pipe / 1000);
  
  for (const s of f.assembly.standards) {
    const sM = s / 1000;
    let numPressings = 1; // Default for 500
    if (s === 1000) numPressings = 2;
    if (s === 1500) numPressings = 3;
    if (s === 2000) numPressings = 4;
    if (s === 2500) numPressings = 5;
    if (s === 3000) numPressings = 6;
    
    for (let i = 0; i < numPressings; i++) {
      elevations.push(currentElev + 0.25 + i * 0.5);
    }
    currentElev += sM;
  }
  
  vPressingCache.set(cacheKey, elevations);
  return elevations;
};

export const getLedgerElevations = (f1: Foot, f2: Foot): number[] => {
  const elevs1 = getVPressingElevations(f1);
  const elevs2 = getVPressingElevations(f2);
  
  const common: number[] = [];
  for (const e1 of elevs1) {
    for (const e2 of elevs2) {
      if (Math.abs(e1 - e2) < 0.05) {
        common.push((e1 + e2) / 2);
        break;
      }
    }
  }
  
  if (common.length === 0) return [];
  common.sort((a, b) => a - b);
  
  const selected: number[] = [];
  const kicker = common[0];
  selected.push(kicker);

  const highestCommon = common[common.length - 1];
  const groundAvg = (f1.groundHeight + f2.groundHeight) / 2;
  const heightAboveGround = highestCommon - groundAvg;

  if (heightAboveGround > 1.75) {
    // Doubling up: one at top, and every 1m down
    let curr = highestCommon;
    while (curr > kicker + 0.5) { // don't overlap with kicker
      selected.push(curr);
      // find next common elevation approx 1m down
      const nextElev = common.slice().reverse().find(e => curr - e >= 0.95);
      if (!nextElev) break;
      curr = nextElev;
    }
  } else {
    // Just 1m intervals up from kicker
    let lastElev = kicker;
    for (let i = 1; i < common.length; i++) {
      if (common[i] - lastElev >= 0.95) {
        selected.push(common[i]);
        lastElev = common[i];
      }
    }
    if (highestCommon - lastElev >= 1.4) {
      selected.push(highestCommon);
    }
  }
  
  return Array.from(new Set(selected)).sort((a, b) => a - b);
};

const calculateRakingDeck = (
  deck: import('../types').DeckConfig,
  rawRampConfigs: import('../types').RampConfig[] = [],
  handrailConfigs: import('../types').HandrailConfig[] = []
): import('../types').DeckCalculationResult => {
  const targetWidth = Number(deck.width) || 8.4;
  const tiers = Math.max(1, Math.min(20, Number(deck.tiers) || 8));
  const stepHeight = Number(deck.stepHeight) || 0.25; // 250mm step height between tiers
  const stepDepth = Number(deck.stepDepth) || 1.2;    // 1.2m step depth matching standard 1.2m rostrum side
  const numW = Math.min(Math.max(targetWidth, 1.2), 100);
  
  const terrain: import('../types').TerrainConfig = {
    deckHeight: Number(deck.terrain?.deckHeight) || 0,
    groundOffsets: {
      origin: Number(deck.terrain?.groundOffsets?.origin) || 0,
      widthEnd: Number(deck.terrain?.groundOffsets?.widthEnd) || 0,
      depthEnd: Number(deck.terrain?.groundOffsets?.depthEnd) || 0,
      diagonal: Number(deck.terrain?.groundOffsets?.diagonal) || 0,
    }
  };

  const cols = Math.max(1, Math.round(numW / 1.2));
  const exactWidth = cols * 1.2;
  const exactDepth = tiers * stepDepth;

  const rostrums: import('../types').Rostrum[] = [];
  const feetMap = new Map<string, import('../types').Foot>();
  const errors: string[] = [];
  const rampPlates: import('../types').RampPlate[] = [];

  // Track foot elevations (upright standards)
  const registerFoot = (x: number, z: number, elev: number) => {
    const key = `${x.toFixed(3)},${z.toFixed(3)}`;
    if (!feetMap.has(key)) {
      feetMap.set(key, { 
        id: key, 
        position: { x, y: z }, 
        groundHeight: 0, 
        targetElevation: elev 
      });
    } else {
      const existing = feetMap.get(key)!;
      if (elev > existing.targetElevation) {
        existing.targetElevation = elev;
      }
    }
  };

  const addRostrumBay = (
    id: string,
    xStart: number,
    xEnd: number,
    zStart: number,
    zEnd: number,
    elev: number,
    row: number,
    col: number,
    extra: Partial<import('../types').Rostrum> = {}
  ) => {
    const isTopTier = row === tiers - 1;
    // For intermediate tiers, stop 35mm before the riser line so the taller upright standard supporting the next tier sits cleanly behind this tier without penetrating through this tier's floor
    const effectiveZEnd = isTopTier ? zEnd : (zEnd - 0.035);
    const w = xEnd - xStart;
    const d = effectiveZEnd - zStart;
    rostrums.push({
      id,
      gridRow: row,
      gridCol: col,
      center: { x: (xStart + xEnd) / 2, y: (zStart + effectiveZEnd) / 2 },
      topLeft: { x: xEnd, y: effectiveZEnd },
      bottomRight: { x: xStart, y: zStart },
      width: w,
      depth: d,
      rotationY: 0,
      startElevation: elev,
      endElevation: elev,
      ...extra
    });

    // Feet at the four corners of this rostrum bay
    registerFoot(xStart, zStart, elev);
    registerFoot(xEnd, zStart, elev);
    registerFoot(xStart, zEnd, elev);
    registerFoot(xEnd, zEnd, elev);
    // If bay width > 1.8m (standard 2.4m rostrum span), add mid-span support standards
    if (w > 1.8) {
      registerFoot(xStart + 1.2, zStart, elev);
      registerFoot(xStart + 1.2, zEnd, elev);
    }
  };

  // Determine bay widths across each tier row:
  // Standard full rostrum is 2.4m wide; half rostrum is 1.2m wide.
  // Whenever half rostrums are required (odd number of 1.2m modules across exactWidth),
  // they must be placed closest to the middle of the row in line with each other, not on the ends.
  const fullCount = Math.floor(cols / 2);
  const hasHalf = cols % 2 !== 0;

  const rowBayWidths: number[] = [];
  if (!hasHalf) {
    for (let i = 0; i < fullCount; i++) {
      rowBayWidths.push(2.4);
    }
  } else if (fullCount === 0) {
    rowBayWidths.push(1.2);
  } else {
    // When half rostrums are required, place them closest to the middle of the row, flanked by full rostrums
    const leftFullCount = Math.floor(fullCount / 2);
    const rightFullCount = fullCount - leftFullCount;
    for (let i = 0; i < leftFullCount; i++) {
      rowBayWidths.push(2.4);
    }
    rowBayWidths.push(1.2);
    for (let i = 0; i < rightFullCount; i++) {
      rowBayWidths.push(2.4);
    }
  }

  // 1. Generate tiers: each tier uses the identical rowBayWidths layout so half rostrums line up strictly in line
  const baseDeckHeight = Number(terrain.deckHeight) || 0;
  for (let t = 0; t < tiers; t++) {
    const zStart = t * stepDepth;
    const zEnd = (t + 1) * stepDepth;
    const height = baseDeckHeight + (t + 1) * stepHeight;

    let curX = 0;
    rowBayWidths.forEach((bW, bayIndex) => {
      const xStart = curX;
      const xEnd = curX + bW;

      addRostrumBay(
        `RAKE_T${t}_B${bayIndex}`,
        xStart,
        xEnd,
        zStart,
        zEnd,
        height,
        t,
        bayIndex
      );
      curX += bW;
    });
  }

  const feet = Array.from(feetMap.values());
  
  // Calculate leg assemblies to support the underside of the rostrum without protruding
  feet.forEach(foot => {
    foot.groundHeight = getGroundYAt(foot.position.x, foot.position.y, terrain, exactWidth, exactDepth);
    // Steel structure must support underside of deck (minus deck board and sole board)
    const reqH = foot.targetElevation - foot.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;
    
    if (reqH < 0.05) {
      foot.error = "UNDER_MIN_HEIGHT";
      errors.push(`Height too low at ${foot.id}: ${reqH.toFixed(3)}m`);
    } else {
      const targetMm = Math.round(reqH * 1000);
      const assembly = solveLegAssembly(reqH, deck.terrain?.deckHeight || 2.0);
      if (assembly) {
        foot.assembly = assembly;
      } else {
        // Fallback for custom heights: safe adjustable jack + standard
        if (targetMm <= 400) {
          foot.assembly = {
            basejack: Math.max(100, targetMm),
            pipe: 0,
            standards: [],
            totalHeight: reqH
          };
        } else if (targetMm <= 600) {
          foot.assembly = {
            basejack: Math.max(100, targetMm - 200),
            pipe: 200,
            standards: [],
            totalHeight: reqH
          };
        } else {
          const sortedStds = [...STANDARD_HEIGHTS_MM].sort((a, b) => b - a);
          // Just stack 3000mm standards until we are within range
          let remaining = targetMm;
          const stds: number[] = [];
          while (remaining > 3450) {
            stds.push(3000);
            remaining -= 3000;
          }
          const suitableStd = sortedStds.find(s => remaining - s >= 100 && remaining - s <= 450) || 500;
          stds.push(suitableStd);
          const jackRunout = Math.max(100, Math.min(450, remaining - suitableStd));
          foot.assembly = {
            basejack: jackRunout,
            pipe: 0,
            standards: stds,
            totalHeight: reqH
          };
        }
      }
    }
  });

  // --- LEDGER GENERATION LOGIC ---
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
        const connKey = `H_${x.toFixed(2)}_${y.toFixed(2)}_${f2.position.x.toFixed(2)}`;
        if (!processedConnections.has(connKey)) {
          processedConnections.add(connKey);
          
          const elevations = getLedgerElevations(f, f2);

          const ledgerLen = dx;
          elevations.forEach((elev, idx) => {
            ledgerCounts.blueBlue++;
            ledgers.push({
              id: `RAKE_LDG_${connKey}_${idx}`,
              position: { x: (x + f2.position.x) / 2, y, z: elev },
              rotation: { x: 0, y: 0, z: Math.PI / 2 },
              length: ledgerLen,
              color: '#3b82f6',
              type: 'blueBlue'
            });
          });
        }
      }

      // Depth connection along Z (same x)
      if (Math.abs(dx) < 0.05 && dy > 0.4 && dy <= stepDepth * 1.1) {
        const connKey = `V_${x.toFixed(2)}_${y.toFixed(2)}_${f2.position.y.toFixed(2)}`;
        if (!processedConnections.has(connKey)) {
          processedConnections.add(connKey);
          
          const elevations = getLedgerElevations(f, f2);
          
          elevations.forEach((elev, idx) => {
            ledgerCounts.blueBlack++;
            ledgers.push({
              id: `RAKE_LDG_${connKey}_${idx}`,
              position: { x, y: (y + f2.position.y) / 2, z: elev },
              rotation: { x: Math.PI / 2, y: 0, z: 0 },
              length: dy,
              color: '#22c55e',
              type: 'blueBlack'
            });
          });
        }
      }
    });
  });

  // --- BRACING GENERATION LOGIC ---
  // Specific Raking Bracing Rules per Engineering Specs:
  // 1. "Bracing on a rake starts only from 1m and higher"
  // 2. "Starting from the highest level, the brace should be tied from the outer corner foot to the right, to the bottom of the 3rd foot from the right. Then from the top of the third foot to the bottom of the 5th foot. In this direction the foot in the middle of these braces get a blue swivel connector to tie all three crossed feet together."
  // 3. "Viewing the bracing from the back of the rake, the first brace starts at the bottom of the far most left standard, to the top of the 3rd standard. The second brace starts on the 4th standard at the top, and runs to the bottom of the 6th standard and so on."
  // 4. "in the width there is a ledger bay open between each bracing bay."
  // 5. "Thats 2 sides of the bracing bay done. Replicate the res so looking through the back to the front braces form a cross pattern, and looking from the side all same direction."
  // 6. "This only applies to the bracing on a raking. Do not change the bracing layout on the decks"
  const braces: Brace[] = [];
  const swivelConnectors: import('../types').SwivelConnector[] = [];
  const swivelSet = new Set<string>();

  // Unique sorted standard coordinates on the grid
  const xCoords = Array.from(new Set(feet.map(f => Math.round(f.position.x * 1000) / 1000))).sort((a, b) => a - b);
  const yCoords = Array.from(new Set(feet.map(f => Math.round(f.position.y * 1000) / 1000))).sort((a, b) => a - b);

  // 1. Identify depth stages:
  // "Bracing on a rake starts only from 1m and higher"
  // Collect the distinct rows of standards along Y where standard height is >= 0.95m
  const eligibleYRows: { y: number; maxElev: number }[] = [];
  yCoords.forEach(y => {
    const feetAtY = feet.filter(f => Math.abs(f.position.y - y) < 0.05);
    if (feetAtY.length > 0) {
      const maxH = Math.max(...feetAtY.map(f => f.targetElevation - f.groundHeight));
      if (maxH >= 0.95) {
        eligibleYRows.push({ y, maxElev: Math.max(...feetAtY.map(f => f.targetElevation)) });
      }
    }
  });

  // If the deck is lower overall, fallback to rows with height >= 0.6m
  if (eligibleYRows.length < 2) {
    yCoords.forEach(y => {
      const feetAtY = feet.filter(f => Math.abs(f.position.y - y) < 0.05);
      if (feetAtY.length > 0) {
        const maxH = Math.max(...feetAtY.map(f => f.targetElevation - f.groundHeight));
        if (maxH >= 0.6 && !eligibleYRows.some(r => Math.abs(r.y - y) < 0.05)) {
          eligibleYRows.push({ y, maxElev: Math.max(...feetAtY.map(f => f.targetElevation)) });
        }
      }
    });
    eligibleYRows.sort((a, b) => a.y - b.y);
  }

  // Ensure the backmost row is included
  const yBack = yCoords[yCoords.length - 1];
  if (eligibleYRows.length > 0 && Math.abs(eligibleYRows[eligibleYRows.length - 1].y - yBack) > 0.05) {
    const feetAtBack = feet.filter(f => Math.abs(f.position.y - yBack) < 0.05);
    const maxBackE = Math.max(...feetAtBack.map(f => f.targetElevation));
    eligibleYRows.push({ y: yBack, maxElev: maxBackE });
  }

  // Helper to safely stack braces vertically
  const addStackedBraces = (
    prefix: string,
    x0: number, y0: number, top0: number, bot0: number,
    x1: number, y1: number, top1: number, bot1: number,
    topDown: boolean // True: from (x0,y0) high to (x1,y1) low; False: from (x0,y0) low to (x1,y1) high
  ) => {
    // Scaffold braces typically span ~2m vertically per lift.
    const startTop = topDown ? top0 : bot0;
    const startBot = topDown ? bot0 : top0;
    
    const endTop = topDown ? bot1 : top1;
    const endBot = topDown ? top1 : bot1;
    
    const liftH = 2.0;
    const maxZ = Math.max(top0, top1);
    const minZ = Math.min(bot0, bot1);
    const heightSpan = maxZ - minZ;
    
    let currentZ0 = startTop;
    let currentZ1 = endBot;
    
    let liftCount = 0;
    while (Math.abs(currentZ0 - startBot) > 0.5 && Math.abs(currentZ1 - endTop) > 0.5) {
      let nextZ0 = topDown ? Math.max(startBot, currentZ0 - liftH) : Math.min(startBot, currentZ0 + liftH);
      let nextZ1 = topDown ? Math.min(endTop, currentZ1 + liftH) : Math.max(endTop, currentZ1 - liftH);
      
      braces.push({
        id: `${prefix}_LIFT${liftCount}`,
        startPos: { x: x0, y: y0, z: currentZ0 },
        endPos: { x: x1, y: y1, z: currentZ1 },
        color: '#dc2626'
      });
      
      currentZ0 = nextZ0;
      currentZ1 = nextZ1;
      liftCount++;
      if (liftCount > 10) break; // safety
    }
    
    // Add the final bracing segment if gap remains
    if (liftCount === 0 || (Math.abs(currentZ0 - startBot) > 0.1 && Math.abs(currentZ1 - endTop) > 0.1)) {
        braces.push({
          id: `${prefix}_LIFT${liftCount}`,
          startPos: { x: x0, y: y0, z: currentZ0 },
          endPos: { x: x1, y: y1, z: endTop },
          color: '#dc2626'
        });
    }
  };

  // Node helper: bottom node near basejack, top node near deck elevation
  const getStandardNodes = (x: number, y: number) => {
    const f = feetMap.get(`${x.toFixed(3)},${y.toFixed(3)}`) || 
              feet.find(ft => Math.abs(ft.position.x - x) < 0.05 && Math.abs(ft.position.y - y) < 0.05);
    const ground = f ? f.groundHeight : 0;
    const target = f ? f.targetElevation : 2.0;
    return {
      bottomElev: ground + 0.15,
      topElev: Math.max(ground + 0.5, target - DECK_THICKNESS)
    };
  };

  if (eligibleYRows.length >= 2 && xCoords.length >= 2) {
    // 2. Identify bracing bays across width:
    // Bay 1: Standards 1 to 3 (ties 2 bays together)
    // Open bay: 1 ledger bay between each bracing bay (Standards 3 to 4)
    // Bay 2: Standards 4 to 6 (ties 2 bays together)
    // Open bay: Standards 6 to 7
    // Bay 3: Standards 7 to 9...
    const widthBays: { xLeft: number; xRight: number; bayIdx: number }[] = [];
    let curStdIdx = 0;
    let bayIdx = 0;
    while (curStdIdx < xCoords.length - 1) {
      const startIdx = curStdIdx;
      const endIdx = Math.min(xCoords.length - 1, startIdx + 2);
      if (endIdx > startIdx) {
        widthBays.push({
          xLeft: xCoords[startIdx],
          xRight: xCoords[endIdx],
          bayIdx: bayIdx++
        });
      }
      // 1 ledger bay open between each bracing bay
      curStdIdx = endIdx + 1;
    }

    const yFront = eligibleYRows[0].y;
    const yRear = eligibleYRows[eligibleYRows.length - 1].y;

    // 3. Longitudinal Depth Bracing on EVERY foot line across the width:
    // "Viewing from the back the bracing that all run in the same direction should be on every foot line instead of every second one like with the outer rear face bracing. This is to increase structure stability because each level is essentially its own structure."
    // Order eligible depth rows from highest level (back row / outer corner foot to the right) to lowest level (front)
    const rowsFromHigh = [...eligibleYRows].sort((a, b) => b.y - a.y);

    // Helper to add layered parallel braces if height > 3.0m
    const addParallelBraces = (
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
        let currentZLow = zBaseBot;
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
        }
      }
    };

    const processLongitudinalBraces = (xCoord: number, linePrefix: string) => {
      let k = 0;
      while (k < rowsFromHigh.length - 1) {
        const highRow = rowsFromHigh[k];
        const highNodes = getStandardNodes(xCoord, highRow.y);

        if (k + 2 < rowsFromHigh.length) {
          // Span 2 bays (3 feet): from top of foot k to bottom of foot k+2
          const lowRow = rowsFromHigh[k + 2];
          const midRow = rowsFromHigh[k + 1];
          const lowNodes = getStandardNodes(xCoord, lowRow.y);
          
          // Raking deck height depends on the current tier.
          // We apply layers if the specific brace's height span is large (> 3m roughly, mapped via maxH).
          // We trigger layering if topElev - bottomElev > 3.0 at the higher tier.
          const isHighDeck = (highNodes.topElev - highNodes.bottomElev) > 3.0;

          addParallelBraces(
            braces,
            `RAKE_BRC_DEPTH_${linePrefix}_SPAN_${k}_TO_${k + 2}`,
            xCoord, highRow.y, highNodes.bottomElev, highNodes.topElev,
            xCoord, lowRow.y, lowNodes.bottomElev, lowNodes.topElev,
            false, // false = highAtA (since A is highRow and we go from A top to B bottom)
            isHighDeck
          );

          // Middle foot gets a light pink swivel connector where the diagonal brace crosses it
          // Swivel height is halfway between the top of the high node and the bottom of the low node
          const ratio = (midRow.y - highRow.y) / (lowRow.y - highRow.y);
          const zMid = highNodes.topElev + ratio * (lowNodes.bottomElev - highNodes.topElev);

          const swivelKey = `${xCoord.toFixed(2)}_${midRow.y.toFixed(2)}_${zMid.toFixed(2)}`;
          if (!swivelSet.has(swivelKey)) {
            swivelSet.add(swivelKey);
            swivelConnectors.push({
              id: `SWIVEL_${swivelKey}`,
              position: { x: xCoord, y: midRow.y, z: zMid },
              color: '#f472b6' // Light pink
            });
          }

          k += 2;
        } else {
          // "Towards the front of the raking the last brace only ties 2 feet. If this happens, rather remove that row of bracing."
          // Only 2 feet left (1 bay) - remove that row of bracing
          break;
        }
      }
    };

    // Run on EVERY foot line across the width
    xCoords.forEach((xCoord, xIdx) => {
      processLongitudinalBraces(xCoord, `STD_${xIdx}`);
    });

    // 4. Width Bracing on outer rear and front faces:
    widthBays.forEach(({ xLeft, xRight, bayIdx: bIdx }) => {
      const rearLeftNodes = getStandardNodes(xLeft, yRear);
      const rearRightNodes = getStandardNodes(xRight, yRear);
      const frontLeftNodes = getStandardNodes(xLeft, yFront);
      const frontRightNodes = getStandardNodes(xRight, yFront);

      const xMid = (xLeft + xRight) / 2;

      if (bIdx % 2 === 0) {
        // Bay 1 (and alternate bays):
        // Back: bottom of left standard -> top of right standard
        addParallelBraces(
          braces,
          `RAKE_BRC_WIDTH_BACK_BAY${bIdx}`,
          xLeft, yRear, rearLeftNodes.bottomElev, rearLeftNodes.topElev,
          xRight, yRear, rearRightNodes.bottomElev, rearRightNodes.topElev,
          true, // lowAtA (left is bottom, right is top)
          (rearLeftNodes.topElev - rearLeftNodes.bottomElev) > 3.0
        );
        const rearZMid = (rearLeftNodes.bottomElev + rearRightNodes.topElev) / 2;
        const rearSwivelKey = `${xMid.toFixed(2)}_${yRear.toFixed(2)}_${rearZMid.toFixed(2)}`;
        if (!swivelSet.has(rearSwivelKey)) {
          swivelSet.add(rearSwivelKey);
          swivelConnectors.push({
            id: `SWIVEL_${rearSwivelKey}`,
            position: { x: xMid, y: yRear, z: rearZMid },
            color: '#f472b6'
          });
        }

        // Front: top of left standard -> bottom of right standard
        addParallelBraces(
          braces,
          `RAKE_BRC_WIDTH_FRONT_BAY${bIdx}`,
          xLeft, yFront, frontLeftNodes.bottomElev, frontLeftNodes.topElev,
          xRight, yFront, frontRightNodes.bottomElev, frontRightNodes.topElev,
          false, // highAtA (left is top, right is bottom)
          (frontLeftNodes.topElev - frontLeftNodes.bottomElev) > 3.0
        );
        const frontZMid = (frontLeftNodes.topElev + frontRightNodes.bottomElev) / 2;
        const frontSwivelKey = `${xMid.toFixed(2)}_${yFront.toFixed(2)}_${frontZMid.toFixed(2)}`;
        if (!swivelSet.has(frontSwivelKey)) {
          swivelSet.add(frontSwivelKey);
          swivelConnectors.push({
            id: `SWIVEL_${frontSwivelKey}`,
            position: { x: xMid, y: yFront, z: frontZMid },
            color: '#f472b6'
          });
        }
      } else {
        // Bay 2 (and alternate bays):
        // Back: top of left standard -> bottom of right standard
        addParallelBraces(
          braces,
          `RAKE_BRC_WIDTH_BACK_BAY${bIdx}`,
          xLeft, yRear, rearLeftNodes.bottomElev, rearLeftNodes.topElev,
          xRight, yRear, rearRightNodes.bottomElev, rearRightNodes.topElev,
          false, // highAtA
          (rearLeftNodes.topElev - rearLeftNodes.bottomElev) > 3.0
        );
        const rearZMid = (rearLeftNodes.topElev + rearRightNodes.bottomElev) / 2;
        const rearSwivelKey = `${xMid.toFixed(2)}_${yRear.toFixed(2)}_${rearZMid.toFixed(2)}`;
        if (!swivelSet.has(rearSwivelKey)) {
          swivelSet.add(rearSwivelKey);
          swivelConnectors.push({
            id: `SWIVEL_${rearSwivelKey}`,
            position: { x: xMid, y: yRear, z: rearZMid },
            color: '#f472b6'
          });
        }

        // Front: bottom of left standard -> top of right standard
        addParallelBraces(
          braces,
          `RAKE_BRC_WIDTH_FRONT_BAY${bIdx}`,
          xLeft, yFront, frontLeftNodes.bottomElev, frontLeftNodes.topElev,
          xRight, yFront, frontRightNodes.bottomElev, frontRightNodes.topElev,
          true, // lowAtA
          (frontLeftNodes.topElev - frontLeftNodes.bottomElev) > 3.0
        );
        const frontZMid = (frontLeftNodes.bottomElev + frontRightNodes.topElev) / 2;
        const frontSwivelKey = `${xMid.toFixed(2)}_${yFront.toFixed(2)}_${frontZMid.toFixed(2)}`;
        if (!swivelSet.has(frontSwivelKey)) {
          swivelSet.add(frontSwivelKey);
          swivelConnectors.push({
            id: `SWIVEL_${frontSwivelKey}`,
            position: { x: xMid, y: yFront, z: frontZMid },
            color: '#f472b6'
          });
        }
      }
    });
  }

  // --- HANDRAILS GENERATION LOGIC ---
  const handrails: any[] = [];
  const uprights: any[] = [];
  let uprightIdCounter = 0;
  let handrailIdCounter = 0;

  if (deck.handrailType !== 'none') {
    const bottomElev = stepHeight;
    const fExt = 0.6; // 600mm forward extension matching ramp D-rail termination standard

    // D-rail safety return loop at the bottom of the rake (Left side x = 0, y = 0):
    // Standard upright at bottom-front corner of tier 0
    uprights.push({
      id: `UP_L_START`,
      x: 0,
      y: 0,
      zDeck: bottomElev,
      type: 'DOUBLE',
      rotation: 0
    });

    // (a) Top rail extension stub (z = bottomElev + 1.0)
    handrails.push({
      id: `HR_RAKE_L_EXT_TOP`,
      startPos: { x: 0, y: 0, z: bottomElev + 1.0 },
      endPos: { x: 0, y: -fExt, z: bottomElev + 1.0 },
      length: fExt,
      isExplicit: true
    });

    // (b) Vertical return drop pipe connecting top rail down to mid rail
    handrails.push({
      id: `HR_RAKE_L_V_DROP`,
      startPos: { x: 0, y: -fExt, z: bottomElev + 0.5 },
      endPos: { x: 0, y: -fExt, z: bottomElev + 1.0 },
      length: 0.5,
      isExplicit: true,
      isTermination: true
    });

    // (c) Mid rail return stub (z = bottomElev + 0.5)
    handrails.push({
      id: `HR_RAKE_L_EXT_MID`,
      startPos: { x: 0, y: -fExt, z: bottomElev + 0.5 },
      endPos: { x: 0, y: 0, z: bottomElev + 0.5 },
      length: fExt,
      isExplicit: true
    });

    // Stepped handrails along Left side (x = 0)
    for (let t = 0; t < tiers; t++) {
      const zStart = t * stepDepth;
      const zEnd = (t + 1) * stepDepth;
      const tierElev = (t + 1) * stepHeight;

      // Upright at end of tier
      uprights.push({
        id: `UP_L_${uprightIdCounter++}`,
        x: 0,
        y: zEnd,
        zDeck: tierElev,
        type: 'DOUBLE',
        rotation: 0
      });

      // Horizontal rail for this tier
      handrails.push({
        id: `HR_L_${handrailIdCounter++}`,
        startPos: { x: 0, y: zStart, z: tierElev },
        endPos: { x: 0, y: zEnd, z: tierElev },
        length: stepDepth
      });

      // Vertical handrail connector stepping up to next tier
      if (t < tiers - 1) {
        const nextElev = (t + 2) * stepHeight;
        handrails.push({
          id: `HR_L_STEP_${handrailIdCounter++}`,
          startPos: { x: 0, y: zEnd, z: tierElev },
          endPos: { x: 0, y: zEnd, z: nextElev },
          length: nextElev - tierElev
        });
      }
    }

    // D-rail safety return loop at the bottom of the rake (Right side x = exactWidth, y = 0):
    // Standard upright at bottom-front corner of tier 0
    uprights.push({
      id: `UP_R_START`,
      x: exactWidth,
      y: 0,
      zDeck: bottomElev,
      type: 'DOUBLE',
      rotation: 0
    });

    // (a) Top rail extension stub (z = bottomElev + 1.0)
    handrails.push({
      id: `HR_RAKE_R_EXT_TOP`,
      startPos: { x: exactWidth, y: 0, z: bottomElev + 1.0 },
      endPos: { x: exactWidth, y: -fExt, z: bottomElev + 1.0 },
      length: fExt,
      isExplicit: true
    });

    // (b) Vertical return drop pipe connecting top rail down to mid rail
    handrails.push({
      id: `HR_RAKE_R_V_DROP`,
      startPos: { x: exactWidth, y: -fExt, z: bottomElev + 0.5 },
      endPos: { x: exactWidth, y: -fExt, z: bottomElev + 1.0 },
      length: 0.5,
      isExplicit: true,
      isTermination: true
    });

    // (c) Mid rail return stub (z = bottomElev + 0.5)
    handrails.push({
      id: `HR_RAKE_R_EXT_MID`,
      startPos: { x: exactWidth, y: -fExt, z: bottomElev + 0.5 },
      endPos: { x: exactWidth, y: 0, z: bottomElev + 0.5 },
      length: fExt,
      isExplicit: true
    });

    // Stepped handrails along Right side (x = exactWidth)
    for (let t = 0; t < tiers; t++) {
      const zStart = t * stepDepth;
      const zEnd = (t + 1) * stepDepth;
      const tierElev = (t + 1) * stepHeight;

      // Upright at end of tier
      uprights.push({
        id: `UP_R_${uprightIdCounter++}`,
        x: exactWidth,
        y: zEnd,
        zDeck: tierElev,
        type: 'DOUBLE',
        rotation: 0
      });

      // Horizontal rail for this tier
      handrails.push({
        id: `HR_R_${handrailIdCounter++}`,
        startPos: { x: exactWidth, y: zStart, z: tierElev },
        endPos: { x: exactWidth, y: zEnd, z: tierElev },
        length: stepDepth
      });

      // Vertical handrail connector stepping up to next tier
      if (t < tiers - 1) {
        const nextElev = (t + 2) * stepHeight;
        handrails.push({
          id: `HR_R_STEP_${handrailIdCounter++}`,
          startPos: { x: exactWidth, y: zEnd, z: tierElev },
          endPos: { x: exactWidth, y: zEnd, z: nextElev },
          length: nextElev - tierElev
        });
      }
    }

    // Rear continuous handrail along the top tier (z = exactDepth)
    const topElev = tiers * stepHeight;
    const numRearSegments = Math.ceil(exactWidth / 2.4);
    const rearChunk = exactWidth / numRearSegments;

    uprights.push({
      id: `UP_REAR_START`,
      x: 0,
      y: exactDepth,
      zDeck: topElev,
      type: 'RIGHT',
      rotation: 0
    });

    for (let s = 0; s < numRearSegments; s++) {
      const x1 = s * rearChunk;
      const x2 = (s + 1) * rearChunk;

      handrails.push({
        id: `HR_REAR_${handrailIdCounter++}`,
        startPos: { x: x1, y: exactDepth, z: topElev },
        endPos: { x: x2, y: exactDepth, z: topElev },
        length: rearChunk
      });

      uprights.push({
        id: `UP_REAR_${uprightIdCounter++}`,
        x: x2,
        y: exactDepth,
        zDeck: topElev,
        type: s === numRearSegments - 1 ? 'LEFT' : 'DOUBLE',
        rotation: 0
      });
    }
  }

  return {
    rostrums,
    feet,
    calculatedFeetCount: feet.length,
    fullRostrumsCount: rostrums.filter(r => r.width > 1.8 && !r.isRiserFascia && !r.isStepBox).length,
    halfRostrumsCount: rostrums.filter(r => r.width <= 1.8 && !r.isRiserFascia && !r.isStepBox).length,
    ledgerCounts,
    ledgers,
    braces,
    uprights,
    handrails,
    swivelConnectors,
    totalArea: exactWidth * exactDepth,
    dimensions: { width: exactWidth, depth: exactDepth },
    terrain,
    status: errors.some(e => e.includes('CRITICAL')) ? 'ERROR_NO_VALID_BUILD' : 'SOLVED',
    errors
  };
};

const calculateSingleDeck = (
  deck: import('../types').DeckConfig,
  rawRampConfigs: import('../types').RampConfig[] = [],
  handrailConfigs: import('../types').HandrailConfig[] = []
): import('../types').DeckCalculationResult => {
  if (deck.type === 'raking') {
    return calculateRakingDeck(deck, rawRampConfigs, handrailConfigs);
  }

  const targetWidth = Math.max(1.2, Number(deck.width) || 1.2);
  const targetDepth = Math.max(1.2, Number(deck.depth) || 1.2);
  const rawTerrain = deck.terrain;
  const numW = Math.min(targetWidth, 100);
  const numD = Math.min(targetDepth, 100);
  
  const terrain: TerrainConfig = {
    deckHeight: Number(rawTerrain.deckHeight) || 0,
    groundOffsets: {
      origin: Number(rawTerrain?.groundOffsets?.origin) || 0,
      widthEnd: Number(rawTerrain?.groundOffsets?.widthEnd) || 0,
      depthEnd: Number(rawTerrain?.groundOffsets?.depthEnd) || 0,
      diagonal: Number(rawTerrain?.groundOffsets?.diagonal) || 0,
    }
  };

  const deckHeight = Number(terrain.deckHeight);

  const rampConfigs: RampConfig[] = rawRampConfigs.map(r => ({
    ...r,
    offset: Math.round((Number(r.offset) || 0) / 1.2) * 1.2,
    width: Number(r.width) || 0,
    length: Number(r.length) || 0,
  }));
  
  // Calculate rows based on target depth (2.4m bays, then 1.2m, then remainder)
  const rowHeights: number[] = [];
  let remainingDepth = numD;
  
  // Add full 2.4m bays
  while (remainingDepth >= 2.4 - 0.05) {
    rowHeights.push(2.4);
    remainingDepth -= 2.4;
  }
  
  // Add 1.2m bay if fits or if it's the "half row" remainder
  if (remainingDepth >= 1.2 - 0.05) {
    rowHeights.push(1.2);
    remainingDepth -= 1.2;
  } else if (remainingDepth > 0.1) {
    rowHeights.push(remainingDepth);
    remainingDepth = 0;
  }

  const rows = rowHeights.length;
  const cols = Math.max(1, Math.round(numW / 1.2));
  const exactWidth = cols * 1.2;
  const exactDepth = rowHeights.reduce((sum, h) => sum + h, 0);

  const rostrums: Rostrum[] = [];
  const feetMap = new Map<string, Foot>();

  // 1. MAIN DECK GRID
  let currentY = 0;
  for (let r = 0; r < rows; r++) {
    const rowHeight = rowHeights[r];
    const yStart = currentY;
    const yEnd = currentY + rowHeight;

    // Optimization: If row height is 1.2m (half depth), try to fit rotated full decks (2.4m wide)
    // Standard row (2.4m depth) uses 1.2m wide bays.
    if (Math.abs(rowHeight - 1.2) < 0.1) {
       // Optimized Row Logic: Build from right to left
       let currentX = exactWidth;
       let remainingWidth = exactWidth;
       
       while (remainingWidth >= 0.1) {
          let bayWidth = 1.2;
          // If we have space for a rotated full deck (2.4m wide), use it
          // But only if it's a 1.2m deep row.
          if (remainingWidth >= 2.4 - 0.05) {
             bayWidth = 2.4;
          } else {
             bayWidth = 1.2; // Fallback to half deck or whatever fits
             if (remainingWidth < 1.2 - 0.05) bayWidth = remainingWidth;
          }

          const xEnd = currentX;
          const xStart = currentX - bayWidth;

          rostrums.push({
            id: `MAIN_R${r}_X${currentX.toFixed(1)}`,
            gridRow: r,
            gridCol: Math.round(currentX / 1.2),
            center: { x: (xStart + xEnd) / 2, y: (yStart + yEnd) / 2 },
            topLeft: { x: xEnd, y: yEnd },
            bottomRight: { x: xStart, y: yStart },
            width: bayWidth,
            depth: rowHeight,
            rotationY: 0,
            startElevation: deckHeight,
            endElevation: deckHeight
          });

          // Feet (Corners)
          const xPos = [xStart, xEnd];
          
          // FIX: Add middle foot for 2.4m wide bays in the half row
          if (bayWidth > 1.8) {
             xPos.push(xStart + 1.2);
          }
          
          const yPos = [yStart, yEnd];
          xPos.forEach(px => {
            yPos.forEach(py => {
              const key = `${px.toFixed(3)},${py.toFixed(3)}`;
              if (!feetMap.has(key)) {
                feetMap.set(key, { 
                  id: key, 
                  position: { x: px, y: py }, 
                  groundHeight: 0, 
                  targetElevation: deckHeight 
                });
              }
            });
          });

          currentX -= bayWidth;
          remainingWidth -= bayWidth;
       }

    } else {
       // Standard Row Logic (2.4m deep)
       for (let c = 0; c < cols; c++) {
          const xStart = c * 1.2;
          const xEnd = xStart + 1.2;
          
          rostrums.push({
            id: `MAIN_R${r}C${c}`,
            gridRow: r,
            gridCol: c,
            center: { x: (xStart + xEnd) / 2, y: (yStart + yEnd) / 2 },
            topLeft: { x: xEnd, y: yEnd },
            bottomRight: { x: xStart, y: yStart },
            width: 1.2,
            depth: rowHeight,
            rotationY: 0,
            startElevation: deckHeight,
            endElevation: deckHeight
          });

          // Feet positions for this bay (corners only)
          const xPos = [xStart, xEnd];
          const yPos = [yStart, yEnd];
          
          // FIX: Add middle foot for 2.4m deep rows
          if (rowHeight > 1.8) {
             yPos.push(yStart + 1.2);
          }
          
          xPos.forEach(px => {
            yPos.forEach(py => {
              const key = `${px.toFixed(3)},${py.toFixed(3)}`;
              if (!feetMap.has(key)) {
                feetMap.set(key, { 
                  id: key, 
                  position: { x: px, y: py }, 
                  groundHeight: 0, 
                  targetElevation: deckHeight 
                });
              }
            });
          });
       }
    }
    currentY += rowHeight;
  }

  // 2. SEGMENTED RAMPS
  const RAMP_ANGLE_DEG = 30;
  const dropPerMeter = Math.tan((RAMP_ANGLE_DEG * Math.PI) / 180);
  const horizontalRun = 1.2;

  const rampDataForBracing: any[] = [];

  rampConfigs.forEach(rc => {
    const corners = {
      topLeft: { x: 0, y: exactDepth },
      topRight: { x: exactWidth, y: exactDepth },
      bottomLeft: { x: 0, y: 0 },
      bottomRight: { x: exactWidth, y: 0 }
    };
    
    const c = corners[rc.corner];
    
    let startX = 0;
    let startY = 0;
    
    const offsetVal = Number(rc.offset) || 0;
    const widthVal = Number(rc.width) || 0;
    const lengthVal = Number(rc.length) || 0;

    if (rc.side === 'bottom') {
      startX = rc.corner === 'bottomLeft' || rc.corner === 'topLeft' ? c.x + offsetVal : c.x - offsetVal - widthVal;
      startY = 0;
    } else if (rc.side === 'top') {
      startX = rc.corner === 'bottomLeft' || rc.corner === 'topLeft' ? c.x + offsetVal : c.x - offsetVal - widthVal;
      startY = exactDepth;
    } else if (rc.side === 'left') {
      startX = 0;
      startY = rc.corner === 'bottomLeft' || rc.corner === 'bottomRight' ? c.y + offsetVal : c.y - offsetVal - widthVal;
    } else if (rc.side === 'right') {
      startX = exactWidth;
      startY = rc.corner === 'bottomLeft' || rc.corner === 'bottomRight' ? c.y + offsetVal : c.y - offsetVal - widthVal;
    }
    
    const rampCols = Math.max(1, Math.round(widthVal / 1.2));
    const exactRampWidth = rampCols * 1.2;
    
    const rampRowHeights: number[] = [];
    let remLen = lengthVal;
    while (remLen >= 2.4 - 0.05) {
      rampRowHeights.push(2.4);
      remLen -= 2.4;
    }
    if (remLen >= 1.2 - 0.05) {
      rampRowHeights.push(1.2);
      remLen -= 1.2;
    } else if (remLen > 0.1) {
      rampRowHeights.push(remLen);
    }
    const exactRampLength = rampRowHeights.reduce((s, h) => s + h, 0);

    const currentElev = deckHeight;
    let farCenterX = 0;
    let farCenterY = 0;
    
    if (rc.side === 'bottom') {
      farCenterX = startX + exactRampWidth / 2;
      farCenterY = -exactRampLength;
    } else if (rc.side === 'top') {
      farCenterX = startX + exactRampWidth / 2;
      farCenterY = exactDepth + exactRampLength;
    } else if (rc.side === 'left') {
      farCenterX = -exactRampLength;
      farCenterY = startY + exactRampWidth / 2;
    } else if (rc.side === 'right') {
      farCenterX = exactWidth + exactRampLength;
      farCenterY = startY + exactRampWidth / 2;
    }
    
    const farEndElev = getGroundYAt(farCenterX, farCenterY, terrain, exactWidth, exactDepth);
    const drop = deckHeight - farEndElev;
    
    // Calculate segments for landing pads
    const landingPads = rc.landingPads || [];
    const sortedPads = [...landingPads].sort((a, b) => (Number(a.offset) || 0) - (Number(b.offset) || 0));
    
    let segments: { type: 'sloped' | 'flat', length: number, startOffset: number, endOffset: number }[] = [];
    let currentOffset = 0;
    
    for (const pad of sortedPads) {
      const padOffset = Number(pad.offset) || 0;
      const padLength = Number(pad.length) || 0;
      if (padOffset > currentOffset) {
        segments.push({ type: 'sloped', length: padOffset - currentOffset, startOffset: currentOffset, endOffset: padOffset });
      }
      segments.push({ type: 'flat', length: padLength, startOffset: padOffset, endOffset: padOffset + padLength });
      currentOffset = padOffset + padLength;
    }
    if (currentOffset < exactRampLength) {
      segments.push({ type: 'sloped', length: exactRampLength - currentOffset, startOffset: currentOffset, endOffset: exactRampLength });
    }

    const totalSlopedLength = segments.filter(s => s.type === 'sloped').reduce((sum, s) => sum + s.length, 0);
    const dropPerSlopedMeter = totalSlopedLength > 0 ? drop / totalSlopedLength : 0;

    const getElevAtOffset = (offset: number) => {
      let elev = currentElev;
      for (const seg of segments) {
        if (offset <= seg.startOffset) break;
        if (seg.type === 'sloped') {
          const slopedDist = Math.min(offset, seg.endOffset) - seg.startOffset;
          elev -= slopedDist * dropPerSlopedMeter;
        }
        if (offset <= seg.endOffset) break;
      }
      return elev;
    };

    const slopeAngle = totalSlopedLength > 0 ? Math.atan2(drop, totalSlopedLength) * 180 / Math.PI : 0;

    rampDataForBracing.push({
      rc, startX, startY, exactRampWidth, exactRampLength, currentElev, farEndElev, drop, slopeAngle, rampRowHeights, getElevAtOffset
    });

    let currentRampY = 0;
    for (let rr = 0; rr < rampRowHeights.length; rr++) {
      const rHeight = rampRowHeights[rr];
      let currentRampX = exactRampWidth;
      let remainingWidth = exactRampWidth;
      let cc = 0;
      
      while (remainingWidth >= 0.1) {
        let cWidth = 1.2;
        if (Math.abs(rHeight - 1.2) < 0.1) {
          if (remainingWidth >= 2.4 - 0.05) {
            cWidth = 2.4;
          } else {
            cWidth = 1.2;
            if (remainingWidth < 1.2 - 0.05) cWidth = remainingWidth;
          }
        } else {
          cWidth = 1.2;
          if (remainingWidth < 1.2 - 0.05) cWidth = remainingWidth;
        }

        const xEnd = currentRampX;
        const xStart = currentRampX - cWidth;
        
        let rTopLeft = {x: 0, y: 0};
        let rBottomRight = {x: 0, y: 0};
        
        if (rc.side === 'bottom') {
          rTopLeft = { x: startX + xEnd, y: startY - currentRampY };
          rBottomRight = { x: startX + xStart, y: startY - currentRampY - rHeight };
        } else if (rc.side === 'top') {
          rTopLeft = { x: startX + xEnd, y: startY + currentRampY + rHeight };
          rBottomRight = { x: startX + xStart, y: startY + currentRampY };
        } else if (rc.side === 'left') {
          rTopLeft = { x: startX - currentRampY, y: startY + xEnd };
          rBottomRight = { x: startX - currentRampY - rHeight, y: startY + xStart };
        } else if (rc.side === 'right') {
          rTopLeft = { x: startX + currentRampY + rHeight, y: startY + xEnd };
          rBottomRight = { x: startX + currentRampY, y: startY + xStart };
        }

        const getPtElev = (px: number, py: number) => {
          let offset = 0;
          if (rc.side === 'bottom') offset = startY - py;
          if (rc.side === 'top') offset = py - startY;
          if (rc.side === 'left') offset = startX - px;
          if (rc.side === 'right') offset = px - startX;
          return getElevAtOffset(offset);
        };

        const startElev = getPtElev(
          rc.side === 'left' || rc.side === 'right' ? (rc.side === 'left' ? startX - currentRampY : startX + currentRampY) : startX + (xStart + xEnd) / 2,
          rc.side === 'bottom' || rc.side === 'top' ? (rc.side === 'bottom' ? startY - currentRampY : startY + currentRampY) : startY + (xStart + xEnd) / 2
        );
        const endElev = getPtElev(
          rc.side === 'left' || rc.side === 'right' ? (rc.side === 'left' ? startX - currentRampY - rHeight : startX + currentRampY + rHeight) : startX + (xStart + xEnd) / 2,
          rc.side === 'bottom' || rc.side === 'top' ? (rc.side === 'bottom' ? startY - currentRampY - rHeight : startY + currentRampY + rHeight) : startY + (xStart + xEnd) / 2
        );

        // Determine if this rostrum is flat (landing pad) or sloped
        const isFlat = Math.abs(startElev - endElev) < 0.01;

        rostrums.push({
          id: `RAMP_${rc.id}_S${rr}_${cc}`,
          gridRow: rr, gridCol: cc,
          topLeft: rTopLeft, bottomRight: rBottomRight,
          center: { x: (rTopLeft.x + rBottomRight.x) / 2, y: (rTopLeft.y + rBottomRight.y) / 2 },
          width: Math.abs(rBottomRight.x - rTopLeft.x),
          depth: Math.abs(rBottomRight.y - rTopLeft.y),
          rotationY: 0,
          isRamp: !isFlat, slope: isFlat ? 0 : slopeAngle, side: rc.side,
          startElevation: startElev, endElevation: endElev,
          rampMaxRows: rampRowHeights.length
        });

        const pts = [
          { x: rTopLeft.x, y: rTopLeft.y },
          { x: rTopLeft.x, y: rBottomRight.y },
          { x: rBottomRight.x, y: rTopLeft.y },
          { x: rBottomRight.x, y: rBottomRight.y }
        ];

        if (Math.abs(rTopLeft.x - rBottomRight.x) > 1.8) {
          const midX = (rTopLeft.x + rBottomRight.x) / 2;
          pts.push({ x: midX, y: rTopLeft.y });
          pts.push({ x: midX, y: rBottomRight.y });
        }
        if (Math.abs(rTopLeft.y - rBottomRight.y) > 1.8) {
          const midY = (rTopLeft.y + rBottomRight.y) / 2;
          pts.push({ x: rTopLeft.x, y: midY });
          pts.push({ x: rBottomRight.x, y: midY });
        }

        pts.forEach(corner => {
          const k = `${corner.x.toFixed(3)},${corner.y.toFixed(3)}`;
          if (!feetMap.has(k)) {
            feetMap.set(k, { id: k, position: corner, groundHeight: 0, targetElevation: getPtElev(corner.x, corner.y) });
          }
        });
        
        currentRampX -= cWidth;
        remainingWidth -= cWidth;
        cc++;
      }
      currentRampY += rHeight;
    }
  });

  const feet = Array.from(feetMap.values());
  const errors: string[] = [];

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
        id: `RAMP_PLATE_${rd.rc.id}_${currentPos}`,
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
       if (edge.axis === 'x' && Math.abs(f.position.x - edge.val) < 0.05 && f.position.y >= edge.rd.startY - 0.05 && f.position.y <= edge.rd.startY + edge.rd.exactRampWidth + 0.05) {
           isRampLeadingEdge = true;
       }
       if (edge.axis === 'y' && Math.abs(f.position.y - edge.val) < 0.05 && f.position.x >= edge.rd.startX - 0.05 && f.position.x <= edge.rd.startX + edge.rd.exactRampWidth + 0.05) {
           isRampLeadingEdge = true;
       }
    }

    if (isRampLeadingEdge) {
       return;
    }

    
    if (reqH < 0.15) {
      f.error = "UNDER_MIN_HEIGHT";
      errors.push(`Height too low at ${f.id}: ${reqH.toFixed(3)}m`);
    } else {
      const assembly = solveLegAssembly(reqH, deckHeight);
      if (assembly) {
        f.assembly = assembly;
      } else {
        f.error = "NO_VALID_BUILD";
        errors.push(`No structural solution for ${reqH.toFixed(3)}m at ${f.id}`);
      }
    }
  });

  // --- LEDGER GENERATION LOGIC ---
  const ledgerCounts = { blueBlue: 0, blueBlack: 0, blackBlack: 0 };
  const ledgers: Ledger[] = [];
  const processedConnections = new Set<string>();

  // Bracing blocks tie 4 ledger blocks (a 2x2 of 1.2m bays = 2.4m x 2.4m) together.
  // Each bracing block consists of EXACTLY 4 red vertical diagonal braces on its 4 outer faces:
  // South face, North face, West face, East face.
  const widthBays = Math.round(exactWidth / 1.2);
  const depthBays = Math.round(exactDepth / 1.2);

  const getBlockBays = (totalBays: number) => {
    if (totalBays <= 2) {
      return [{ start: 0, end: totalBays }];
    }
    const list: { start: number; end: number }[] = [];
    let cur = 0;
    while (cur < totalBays) {
      const start = cur;
      const end = Math.min(totalBays, start + 2);
      if (end > start) {
        list.push({ start, end });
      }
      // 1 open bay between blocks
      cur = end + 1;
    }
    // Ensure the far edge has a securing block if there are remaining unbraced bays
    const last = list[list.length - 1];
    if (last && last.end < totalBays) {
      const endStart = Math.max(0, totalBays - 2);
      if (!list.some(item => item.start === endStart)) {
        list.push({ start: endStart, end: totalBays });
      }
    }
    return list;
  };

  const xBlocks = getBlockBays(widthBays);
  const yBlocks = getBlockBays(depthBays);

  interface BracingBlockDef {
    colStart: number;
    colEnd: number;
    rowStart: number;
    rowEnd: number;
  }

  const bracingBlocks: BracingBlockDef[] = [];
  xBlocks.forEach(xb => {
    yBlocks.forEach(yb => {
      // Blocks are positioned around the perimeter of the deck
      const isPerimeter =
        xb.start === 0 || xb.end === widthBays ||
        yb.start === 0 || yb.end === depthBays;
      if (isPerimeter) {
        bracingBlocks.push({
          colStart: xb.start,
          colEnd: xb.end,
          rowStart: yb.start,
          rowEnd: yb.end
        });
      }
    });
  });

  // Helper to determine if a 1.2x1.2 cell is a ledger block.
  // Each 2x2 bracing block contains 4 ledger blocks.
  const isCellBraced = (cellX: number, cellY: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / 1.2);

    if (col < 0 || col >= widthBays || row < 0 || row >= depthBays) return false;

    return bracingBlocks.some(b =>
      col >= b.colStart && col < b.colEnd &&
      row >= b.rowStart && row < b.rowEnd
    );
  };

  // Helper to determine if a row is a half row
  const isHalfRowAt = (cellY: number): boolean => {
    let currentY = 0;
    for (const h of rowHeights) {
      if (cellY >= currentY - 0.05 && cellY < currentY + h - 0.05) {
        return Math.abs(h - 1.2) < 0.1;
      }
      currentY += h;
    }
    return false;
  };

  feet.forEach(f => {
    if (!f.assembly) return;

    const { x, y } = f.position;
    const z = f.assembly.totalHeight; 
    
    // Calculate number of ledger levels based on height
    // Rule: If height >= 2m, add levels at every 1m interval.
    // Always include the deck level ledger.
    const levels = 1 + (z >= 2.0 ? Math.floor(z - 0.01) : 0);

    // Check Horizontal Connection (Right: x + 1.2)
    const neighborNextXKey = `${(x + 1.2).toFixed(3)},${y.toFixed(3)}`;
    
    if (feetMap.has(neighborNextXKey)) {
      const neighbor = feetMap.get(neighborNextXKey)!;
      if (neighbor.assembly) {
        const connKey = `H_${x.toFixed(3)}_${y.toFixed(3)}`;
        if (!processedConnections.has(connKey)) {
          processedConnections.add(connKey);
          
          const cellAboveBraced = isCellBraced(x, y);
          const cellBelowBraced = isCellBraced(x, y - 1.2);
          
          if (true) {
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
            else if (colorType === 'blueBlue') ledgerCounts.blueBlue += elevations.length;

            elevations.forEach((ledgerElev, i) => {
               const midX = x + 0.6;
               const midY = y;
               
               ledgers.push({
                  id: `LDG_H_${connKey}_${i}`,
                  position: { x: midX, y: midY, z: ledgerElev },
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
    const neighborNextYKey = `${x.toFixed(3)},${(y + 1.2).toFixed(3)}`;
    
    if (feetMap.has(neighborNextYKey)) {
      const neighbor = feetMap.get(neighborNextYKey)!;
      if (neighbor.assembly) {
        const connKey = `V_${x.toFixed(3)}_${y.toFixed(3)}`;
        if (!processedConnections.has(connKey)) {
          processedConnections.add(connKey);
          
          const cellRightBraced = isCellBraced(x, y);
          const cellLeftBraced = isCellBraced(x - 1.2, y);
          
          if (true) {
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
            else if (colorType === 'blueBlue') ledgerCounts.blueBlue += elevations.length;
            
            elevations.forEach((ledgerElev, i) => {
               const midX = x;
               const midY = y + 0.6;
               
               ledgers.push({
                  id: `LDG_V_${connKey}_${i}`,
                  position: { x: midX, y: midY, z: ledgerElev },
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

  // --- BRACING GENERATION LOGIC ---
  const braces: Brace[] = [];

  const addedBracesKeys = new Set<string>();
  const addBraceSafe = (
    id: string,
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number },
    brcColor = "#dc2626"
  ) => {
    // Avoid degenerate / zero-length braces
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    if (dx * dx + dy * dy + dz * dz < 0.25) return;

    // Create canonical key regardless of order to prevent duplicate lines
    const k1 = `${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}`;
    const k2 = `${p2.x.toFixed(2)},${p2.y.toFixed(2)},${p2.z.toFixed(2)}`;
    const key = k1 < k2 ? `${k1}_${k2}` : `${k2}_${k1}`;
    if (addedBracesKeys.has(key)) return;
    addedBracesKeys.add(key);

    braces.push({
      id,
      startPos: p1,
      endPos: p2,
      color: brcColor
    });
  };

  if (deckHeight >= 0.75) {
    const getElevNodes = (x: number, y: number) => {
      const key = `${x.toFixed(3)},${y.toFixed(3)}`;
      const f = feetMap.get(key) || feet.find(ft => Math.abs(ft.position.x - x) < 0.05 && Math.abs(ft.position.y - y) < 0.05);
      if (!f) return { topElev: deckHeight - 0.15, bottomElev: 0.2 };
      return { topElev: f.targetElevation - 0.15, bottomElev: f.groundHeight + 0.15 };
    };

    // Helper to add layered parallel braces if height > 3.0m
    const addParallelBraces = (
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
        let currentZLow = zBaseBot;
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
        }
      }
    };

    // Four braces form a block, tying 4 ledger blocks together:
    // (1) South face diagonal brace
    // (2) North face diagonal brace
    // (3) West face diagonal brace
    // (4) East face diagonal brace
    bracingBlocks.forEach((blk, blkIdx) => {
      const x0 = blk.colStart * 1.2;
      const x1 = blk.colEnd * 1.2;
      const y0 = blk.rowStart * 1.2;
      const y1 = blk.rowEnd * 1.2;

      const parity = (blk.colStart + blk.rowStart) % 2 === 0;

      const n00 = getElevNodes(x0, y0);
      const n10 = getElevNodes(x1, y0);
      const n01 = getElevNodes(x0, y1);
      const n11 = getElevNodes(x1, y1);

      // (1) South face vertical diagonal brace
      addParallelBraces(
        braces,
        `BRC_BLK_${blkIdx}_S`, 
        x0, y0, n00.bottomElev, n00.topElev,
        x1, y0, n10.bottomElev, n10.topElev,
        parity,
        deckHeight > 3.0
      );

      // (2) North face vertical diagonal brace
      addParallelBraces(
        braces,
        `BRC_BLK_${blkIdx}_N`, 
        x0, y1, n01.bottomElev, n01.topElev,
        x1, y1, n11.bottomElev, n11.topElev,
        !parity,
        deckHeight > 3.0
      );

      // (3) West face vertical diagonal brace
      addParallelBraces(
        braces,
        `BRC_BLK_${blkIdx}_W`, 
        x0, y0, n00.bottomElev, n00.topElev,
        x0, y1, n01.bottomElev, n01.topElev,
        parity,
        deckHeight > 3.0
      );

      // (4) East face vertical diagonal brace
      addParallelBraces(
        braces,
        `BRC_BLK_${blkIdx}_E`, 
        x1, y0, n10.bottomElev, n10.topElev,
        x1, y1, n11.bottomElev, n11.topElev,
        !parity,
        deckHeight > 3.0
      );
    });
  }

  // --- RAMP BRACING LOGIC ---
  // "Bracing on the ramp needs to continue from the deck up to where the feet are not lower than 1m heigt."
  rampDataForBracing.forEach((rampData, rampIdx) => {
    const { rc, startX, startY, exactRampWidth, exactRampLength, currentElev, rampRowHeights, getElevAtOffset } = rampData;

    const getPtElev = (px: number, py: number) => {
      let offset = 0;
      if (rc.side === 'bottom') offset = startY - py;
      if (rc.side === 'top') offset = py - startY;
      if (rc.side === 'left') offset = startX - px;
      if (rc.side === 'right') offset = px - startX;
      return getElevAtOffset(offset);
    };

    const getGroundElev = (px: number, py: number) => {
      const key = `${px.toFixed(3)},${py.toFixed(3)}`;
      const f = feetMap.get(key);
      return f ? f.groundHeight : getGroundYAt(px, py, terrain, exactWidth, exactDepth);
    };

    // Calculate longitudinal row stops along ramp slope
    const rowStops: number[] = [0];
    let acc = 0;
    rampRowHeights.forEach(rH => {
      acc += rH;
      rowStops.push(acc);
    });

    // Calculate transverse standard positions across ramp width
    const colPositions: number[] = [];
    let curW = 0;
    while (curW < exactRampWidth - 0.05) {
      colPositions.push(curW);
      curW += 1.2;
    }
    if (!colPositions.some(p => Math.abs(p - exactRampWidth) < 0.05)) {
      colPositions.push(exactRampWidth);
    }

    const getRampWorldPt = (w: number, off: number) => {
      if (rc.side === 'bottom') return { x: startX + w, y: startY - off };
      if (rc.side === 'top') return { x: startX + w, y: startY + off };
      if (rc.side === 'left') return { x: startX - off, y: startY + w };
      return { x: startX + off, y: startY + w }; // right
    };

    // Helper to get foot height for a standard
    const getStdHeight = (w: number, off: number) => {
      const pt = getRampWorldPt(w, off);
      return getPtElev(pt.x, pt.y) - getGroundElev(pt.x, pt.y);
    };

    // Node helper for ramp standard
    const getRampNode = (w: number, off: number, isTop: boolean) => {
      const pt = getRampWorldPt(w, off);
      const topZ = getPtElev(pt.x, pt.y) - 0.15;
      const botZ = getGroundElev(pt.x, pt.y) + 0.15;
      return { x: pt.x, y: pt.y, z: isTop ? topZ : botZ };
    };

    // Iterate through bays along the ramp, starting from the deck connection (rr = 0)
    // and continue row by row as long as feet are not lower than 1.0m (0.95m tolerance)
    for (let rr = 0; rr < rowStops.length - 1; rr++) {
      const offA = rowStops[rr];
      const offB = rowStops[rr + 1];

      // Check feet heights at row A (nearer deck) and row B (further down ramp)
      const heightsA = colPositions.map(w => getStdHeight(w, offA));
      const heightsB = colPositions.map(w => getStdHeight(w, offB));

      const minHeightA = Math.min(...heightsA);
      const minHeightB = Math.min(...heightsB);

      // Rule: "Bracing on the ramp needs to continue from the deck up to where the feet are not lower than 1m heigt."
      // If either end of the bay drops below 0.95m (1m threshold), bracing stops here!
      if (minHeightA < 0.95 || minHeightB < 0.95) {
        break;
      }

      // (a) Longitudinal Depth Braces along ramp length:
      // "The braces should start at the bottom of the one meter to the top of the 1.5m, the next brace from the bottom of the 1.5m to the top of the 2m. And so forth in the depth, and looking from the side all same direction."
      // offB is lower elevation, offA is higher elevation toward deck.
      // So bottom at offB -> top at offA, for left and right edges (and any intermediate column)
      colPositions.forEach((w, cIdx) => {
        const isOuter = cIdx === 0 || cIdx === colPositions.length - 1;
        if (isOuter || colPositions.length > 3) {
          const pBot = getRampNode(w, offB, false);
          const pTop = getRampNode(w, offA, true);
          addBraceSafe(`RAMP_BRC_SIDE_${rampIdx}_B${rr}_C${cIdx}`, pBot, pTop);
        }
      });

      // (b) Transverse Width Bracing across ramp width:
      for (let c = 0; c < colPositions.length - 1; c++) {
        const w1 = colPositions[c];
        const w2 = colPositions[c + 1];
        const parity = (rr + c) % 2;

        const p1 = getRampNode(w1, offB, parity === 0);
        const p2 = getRampNode(w2, offB, parity === 1);
        addBraceSafe(`RAMP_BRC_WIDTH_${rampIdx}_B${rr}_W${c}`, p1, p2);

        // Also add transverse brace at row 0 (deck joint) for the first bay
        if (rr === 0) {
          const p1_0 = getRampNode(w1, offA, parity === 1);
          const p2_0 = getRampNode(w2, offA, parity === 0);
          addBraceSafe(`RAMP_BRC_WIDTH_START_${rampIdx}_W${c}`, p1_0, p2_0);
        }
      }
    }
  });

  // --- HANDRAIL & UPRIGHT GENERATION LOGIC ---
  const uprights: Upright[] = [];
  const handrails: Handrail[] = [];

  let uprightIdCounter = 0;
  let handrailIdCounter = 0;

  const getDeckElev = (x: number, y: number) => {
    const key = `${x.toFixed(3)},${y.toFixed(3)}`;
    const f = feetMap.get(key);
    if (f) return f.targetElevation;
    return deckHeight;
  };

  const addStandardHandrail = (startX: number, startY: number, dx: number, dy: number, length: number) => {
    if (length <= 0) return;
    const endX = startX + dx * length;
    const endY = startY + dy * length;
    const numSegments = Math.ceil(length / 2.4);
    const chunkLen = length / numSegments;
    let currentX = startX;
    let currentY = startY;
    const rotation = Math.atan2(dy, dx);

    uprights.push({
      id: `UP_${uprightIdCounter++}`,
      x: startX, y: startY, zDeck: getDeckElev(startX, startY),
      type: 'RIGHT',
      rotation: rotation
    });

    for (let s = 0; s < numSegments; s++) {
      const nextX = currentX + dx * chunkLen;
      const nextY = currentY + dy * chunkLen;
      const z1 = getDeckElev(currentX, currentY);
      const z2 = getDeckElev(nextX, nextY);

      handrails.push({
        id: `HR_${handrailIdCounter++}`,
        startPos: { x: currentX, y: currentY, z: z1 },
        endPos: { x: nextX, y: nextY, z: z2 },
        length: chunkLen
      });

      if (s < numSegments - 1) {
        uprights.push({
          id: `UP_${uprightIdCounter++}`,
          x: nextX, y: nextY, zDeck: z2,
          type: 'DOUBLE',
          rotation: rotation
        });
      }

      currentX = nextX;
      currentY = nextY;
    }

    uprights.push({
      id: `UP_${uprightIdCounter++}`,
      x: endX, y: endY, zDeck: getDeckElev(endX, endY),
      type: 'LEFT',
      rotation: rotation
    });
  };

  // Helper to subtract busy ramp intervals from a perimeter edge
  const getOpenSegments = (totalLength: number, busyIntervals: [number, number][]) => {
    if (busyIntervals.length === 0) return [[0, totalLength]] as [number, number][];
    const sorted = [...busyIntervals].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    sorted.forEach(([s, e]) => {
      if (merged.length === 0) {
        merged.push([s, e]);
      } else {
        const prev = merged[merged.length - 1];
        if (s <= prev[1] + 0.05) {
          prev[1] = Math.max(prev[1], e);
        } else {
          merged.push([s, e]);
        }
      }
    });
    const segs: [number, number][] = [];
    let cur = 0;
    merged.forEach(([s, e]) => {
      if (s - cur > 0.05) {
        segs.push([cur, s]);
      }
      cur = Math.max(cur, e);
    });
    if (totalLength - cur > 0.05) {
      segs.push([cur, totalLength]);
    }
    return segs;
  };

  // Collect ramp attachment intervals along each of the 4 deck edges
  const topRampIntervals: [number, number][] = [];
  const bottomRampIntervals: [number, number][] = [];
  const leftRampIntervals: [number, number][] = [];
  const rightRampIntervals: [number, number][] = [];

  rampDataForBracing.forEach(rd => {
    if (rd.rc.side === 'top') {
      topRampIntervals.push([rd.startX, rd.startX + rd.exactRampWidth]);
    } else if (rd.rc.side === 'bottom') {
      bottomRampIntervals.push([rd.startX, rd.startX + rd.exactRampWidth]);
    } else if (rd.rc.side === 'left') {
      leftRampIntervals.push([rd.startY, rd.startY + rd.exactRampWidth]);
    } else if (rd.rc.side === 'right') {
      rightRampIntervals.push([rd.startY, rd.startY + rd.exactRampWidth]);
    }
  });

  if (deck.handrailType !== 'none' && handrailConfigs.length === 0) {
    // Generate default perimeter handrails, leaving openings where ramps attach to the deck
    getOpenSegments(exactWidth, topRampIntervals).forEach(([s1, s2]) => {
      addStandardHandrail(s1, exactDepth, 1, 0, s2 - s1);
    });
    getOpenSegments(exactWidth, bottomRampIntervals).forEach(([s1, s2]) => {
      addStandardHandrail(s2, 0, -1, 0, s2 - s1);
    });
    getOpenSegments(exactDepth, leftRampIntervals).forEach(([s1, s2]) => {
      addStandardHandrail(0, s1, 0, 1, s2 - s1);
    });
    getOpenSegments(exactDepth, rightRampIntervals).forEach(([s1, s2]) => {
      addStandardHandrail(exactWidth, s2, 0, -1, s2 - s1);
    });
  }

  // --- RAMP HANDRAILS WITH SAFETY D-LOOP TERMINATION ---
  rampDataForBracing.forEach((rampData) => {
    const { rc, startX, startY, exactRampWidth, exactRampLength, rampRowHeights, getElevAtOffset } = rampData;
    if (rc.handrailType === 'none') return;

    // Determine sides to build (default: both sides)
    const sidesToBuild: { sideKey: '1' | '2'; isLeft: boolean }[] = [];
    if (!rc.handrailType || rc.handrailType === 'both') {
      sidesToBuild.push({ sideKey: '1', isLeft: true }, { sideKey: '2', isLeft: false });
    } else if (rc.handrailType === 'left') {
      sidesToBuild.push({ sideKey: '1', isLeft: true });
    } else if (rc.handrailType === 'right') {
      sidesToBuild.push({ sideKey: '2', isLeft: false });
    }

    // Geometry vectors and side position functions
    let fwdDir = { x: 0, y: -1 };
    let side1Pt = (off: number) => ({ x: startX, y: -off });
    let side2Pt = (off: number) => ({ x: startX + exactRampWidth, y: -off });
    let rot1 = Math.PI / 2;
    let rot2 = -Math.PI / 2;

    if (rc.side === 'bottom') {
      fwdDir = { x: 0, y: -1 };
      side1Pt = (off: number) => ({ x: startX, y: -off });
      side2Pt = (off: number) => ({ x: startX + exactRampWidth, y: -off });
      rot1 = Math.PI / 2;
      rot2 = -Math.PI / 2;
    } else if (rc.side === 'top') {
      fwdDir = { x: 0, y: 1 };
      side1Pt = (off: number) => ({ x: startX + exactRampWidth, y: exactDepth + off });
      side2Pt = (off: number) => ({ x: startX, y: exactDepth + off });
      rot1 = -Math.PI / 2;
      rot2 = Math.PI / 2;
    } else if (rc.side === 'left') {
      fwdDir = { x: -1, y: 0 };
      side1Pt = (off: number) => ({ x: -off, y: startY + exactRampWidth });
      side2Pt = (off: number) => ({ x: -off, y: startY });
      rot1 = 0;
      rot2 = Math.PI;
    } else if (rc.side === 'right') {
      fwdDir = { x: 1, y: 0 };
      side1Pt = (off: number) => ({ x: exactWidth + off, y: startY });
      side2Pt = (off: number) => ({ x: exactWidth + off, y: startY + exactRampWidth });
      rot1 = Math.PI;
      rot2 = 0;
    }

    // Stops along ramp length (at each row joint)
    const stops: number[] = [0];
    let acc = 0;
    rampRowHeights.forEach(rH => {
      acc += rH;
      stops.push(acc);
    });

    sidesToBuild.forEach(({ sideKey, isLeft }) => {
      const getPt = isLeft ? side1Pt : side2Pt;
      const rot = isLeft ? rot1 : rot2;

      // 1. Upright posts at every stop along ramp edge
      stops.forEach((off, idx) => {
        const pt = getPt(off);
        const zElev = getElevAtOffset(off);
        uprights.push({
          id: `UP_RAMP_${rc.id}_S${sideKey}_${idx}`,
          x: pt.x,
          y: pt.y,
          zDeck: zElev,
          type: idx === 0 ? 'DOUBLE' : (idx === stops.length - 1 ? 'LEFT' : 'DOUBLE'),
          rotation: rot
        });
      });

      // 2. Sloped/flat handrail bays along ramp (top rail at +1.0m, mid rail at +0.5m)
      for (let i = 0; i < stops.length - 1; i++) {
        const off1 = stops[i];
        const off2 = stops[i + 1];
        const p1 = getPt(off1);
        const p2 = getPt(off2);
        const z1 = getElevAtOffset(off1);
        const z2 = getElevAtOffset(off2);
        const len = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (z2 - z1) ** 2);

        handrails.push({
          id: `HR_RAMP_${rc.id}_S${sideKey}_BAY${i}`,
          startPos: { x: p1.x, y: p1.y, z: z1 },
          endPos: { x: p2.x, y: p2.y, z: z2 },
          length: len
        });
      }

      // 3. Proper bottom termination: continuous closed D-loop safety return
      // Top rail (+1.0m) extends forward 600mm, drops down 500mm to mid rail (+0.5m), and connects back
      const pEnd = getPt(exactRampLength);
      const zEnd = getElevAtOffset(exactRampLength);
      const fExt = 0.6; // 600mm forward extension (standard accessible ramp handrail extension)
      const pExt = { x: pEnd.x + fwdDir.x * fExt, y: pEnd.y + fwdDir.y * fExt };

      // (a) Top rail extension stub
      handrails.push({
        id: `HR_RAMP_EXT_TOP_${rc.id}_S${sideKey}`,
        startPos: { x: pEnd.x, y: pEnd.y, z: zEnd + 1.0 },
        endPos: { x: pExt.x, y: pExt.y, z: zEnd + 1.0 },
        length: fExt,
        isExplicit: true
      });

      // (b) Vertical return drop pipe connecting top rail down to mid rail
      handrails.push({
        id: `HR_RAMP_V_DROP_${rc.id}_S${sideKey}`,
        startPos: { x: pExt.x, y: pExt.y, z: zEnd + 0.5 },
        endPos: { x: pExt.x, y: pExt.y, z: zEnd + 1.0 },
        length: 0.5,
        isExplicit: true,
        isTermination: true
      });

      // (c) Mid rail return stub
      handrails.push({
        id: `HR_RAMP_EXT_MID_${rc.id}_S${sideKey}`,
        startPos: { x: pExt.x, y: pExt.y, z: zEnd + 0.5 },
        endPos: { x: pEnd.x, y: pEnd.y, z: zEnd + 0.5 },
        length: fExt,
        isExplicit: true
      });
    });
  });

  handrailConfigs.forEach(hc => {
    const offset = Number(hc.offset) || 0;
    const length = Number(hc.length) || 0;
    if (length <= 0) return;

    let startX = 0, startY = 0, dx = 0, dy = 0;

    if (hc.side === 'top') {
      startY = exactDepth;
      if (hc.corner === 'topLeft') {
        startX = offset;
        dx = 1;
      } else if (hc.corner === 'topRight') {
        startX = exactWidth - offset;
        dx = -1;
      }
    } else if (hc.side === 'bottom') {
      startY = 0;
      if (hc.corner === 'bottomLeft') {
        startX = offset;
        dx = 1;
      } else if (hc.corner === 'bottomRight') {
        startX = exactWidth - offset;
        dx = -1;
      }
    } else if (hc.side === 'left') {
      startX = 0;
      if (hc.corner === 'bottomLeft') {
        startY = offset;
        dy = 1;
      } else if (hc.corner === 'topLeft') {
        startY = exactDepth - offset;
        dy = -1;
      }
    } else if (hc.side === 'right') {
      startX = exactWidth;
      if (hc.corner === 'bottomRight') {
        startY = offset;
        dy = 1;
      } else if (hc.corner === 'topRight') {
        startY = exactDepth - offset;
        dy = -1;
      }
    }

    addStandardHandrail(startX, startY, dx, dy, length);
  });

  return {
    rostrums,
    feet,
    calculatedFeetCount: feet.length,
    fullRostrumsCount: rostrums.filter(r => {
      if (r.isRamp) return false;
      const w = Math.abs(r.bottomRight.x - r.topLeft.x);
      const d = Math.abs(r.bottomRight.y - r.topLeft.y);
      return (w * d) > 2.0; 
    }).length,
    halfRostrumsCount: rostrums.filter(r => {
      if (r.isRamp) return false;
      const w = Math.abs(r.bottomRight.x - r.topLeft.x);
      const d = Math.abs(r.bottomRight.y - r.topLeft.y);
      return (w * d) <= 2.0; 
    }).length,
    ledgerCounts,
    ledgers,
    braces,
    uprights,
    handrails,
    totalArea: rostrums.reduce((acc, r) => {
      const w = Math.abs(r.bottomRight.x - r.topLeft.x);
      const d = Math.abs(r.bottomRight.y - r.topLeft.y);
      return acc + (w * d);
    }, 0),
    dimensions: { width: exactWidth, depth: exactDepth },
    terrain,
    status: (errors.length === 0) ? 'SOLVED' : 'ERROR_NO_VALID_BUILD',
    errors
  };
};

export const calculateDecks = (
  decks: import('../types').DeckConfig[],
  rampConfigs: import('../types').RampConfig[] = [],
  handrailConfigs: import('../types').HandrailConfig[] = []
): import('../types').DeckCalculationResult => {
  const result: import('../types').DeckCalculationResult = {
    rostrums: [],
    feet: [],
    calculatedFeetCount: 0,
    fullRostrumsCount: 0,
    halfRostrumsCount: 0,
    ledgerCounts: { blueBlue: 0, blueBlack: 0, blackBlack: 0 },
    ledgers: [],
    braces: [],
    uprights: [],
    handrails: [],
    swivelConnectors: [],
    rampPlates: [],
    totalArea: 0,
    dimensions: { width: 0, depth: 0 },
    terrain: decks[0]?.terrain || { deckHeight: 0, groundOffsets: { origin: 0, widthEnd: 0, depthEnd: 0, diagonal: 0 } },
    status: 'SOLVED',
    errors: []
  };

  const resolvedDecks = new Map<string, { originX: number, originZ: number, orientation: number }>();

  const resolveDeck = (deckId: string): { originX: number, originZ: number, orientation: number } => {
    if (resolvedDecks.has(deckId)) return resolvedDecks.get(deckId)!;
    
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return { originX: 0, originZ: 0, orientation: 0 };

    if (!deck.parentId || !decks.find(d => d.id === deck.parentId)) {
      const res = {
        originX: Number(deck.originX) || 0,
        originZ: Number(deck.originZ) || 0,
        orientation: Number(deck.orientation) || 0
      };
      resolvedDecks.set(deckId, res);
      return res;
    }

    const parentRes = resolveDeck(deck.parentId);
    const parentDeck = decks.find(d => d.id === deck.parentId)!;
    
    let localX = 0;
    let localZ = 0;
    
    const pWidth = Number(parentDeck.width) || 0;
    const pDepth = Number(parentDeck.depth) || 0;
    const cWidth = Number(deck.width) || 0;
    const cDepth = Number(deck.depth) || 0;
    const offset = Number(deck.attachOffset) || 0;

    switch (deck.attachEdge) {
      case 'front':
        localX = offset;
        localZ = pDepth;
        break;
      case 'back':
        localX = offset;
        localZ = -cDepth;
        break;
      case 'right':
        localX = pWidth;
        localZ = offset;
        break;
      case 'left':
        localX = -cWidth;
        localZ = offset;
        break;
      default:
        localX = offset;
        localZ = pDepth;
    }

    const rad = (parentRes.orientation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const absX = localX * cos - localZ * sin + parentRes.originX;
    const absZ = localX * sin + localZ * cos + parentRes.originZ;

    const res = {
      originX: absX,
      originZ: absZ,
      orientation: parentRes.orientation
    };
    resolvedDecks.set(deckId, res);
    return res;
  };

  decks.forEach((deck) => {
    const deckRamps = rampConfigs.filter(r => r.deckId === deck.id);
    const deckHandrails = handrailConfigs.filter(h => h.deckId === deck.id);
    const singleResult = calculateSingleDeck(deck, deckRamps, deckHandrails);
    
    const resolved = resolveDeck(deck.id);
    const originX = resolved.originX;
    const originZ = resolved.originZ;
    const orientation = resolved.orientation;
    
    const rad = (orientation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const transformPoint = (x: number, y: number) => {
      const tx = x * cos - y * sin + originX;
      const ty = x * sin + y * cos + originZ;
      return { x: tx, y: ty };
    };

    const transform3D = (p: {x: number, y: number, z: number}) => {
      const tx = p.x * cos - p.y * sin + originX;
      const ty = p.x * sin + p.y * cos + originZ;
      return { x: tx, y: ty, z: p.z };
    };

    singleResult.rostrums.forEach(r => {
      const w = Math.abs(r.bottomRight.x - r.topLeft.x);
      const d = Math.abs(r.bottomRight.y - r.topLeft.y);
      const cx = (r.topLeft.x + r.bottomRight.x) / 2;
      const cy = (r.topLeft.y + r.bottomRight.y) / 2;
      const tc = transformPoint(cx, cy);
      
      result.rostrums.push({
        ...r,
        id: `${deck.id}_${r.id}`,
        center: tc,
        width: w,
        depth: d,
        rotationY: rad
      });
    });

    singleResult.feet.forEach(f => {
      const tp = transformPoint(f.position.x, f.position.y);
      result.feet.push({
        ...f,
        id: `${deck.id}_${f.id}`,
        position: tp
      });
    });

    singleResult.ledgers.forEach(l => {
      result.ledgers.push({
        ...l,
        id: `${deck.id}_${l.id}`,
        position: transform3D(l.position),
        rotation: { ...l.rotation, z: l.rotation.z + rad }
      });
    });

    singleResult.braces.forEach(b => {
      result.braces.push({
        ...b,
        id: `${deck.id}_${b.id}`,
        startPos: transform3D(b.startPos),
        endPos: transform3D(b.endPos)
      });
    });

    singleResult.uprights.forEach(u => {
      const tp = transformPoint(u.x, u.y);
      result.uprights.push({
        ...u,
        id: `${deck.id}_${u.id}`,
        x: tp.x,
        y: tp.y,
        rotation: u.rotation + rad
      });
    });

    singleResult.handrails.forEach(h => {
      result.handrails.push({
        ...h,
        id: `${deck.id}_${h.id}`,
        startPos: transform3D(h.startPos),
        endPos: transform3D(h.endPos)
      });
    });

    if (singleResult.swivelConnectors) {
      if (!result.swivelConnectors) result.swivelConnectors = [];
      singleResult.swivelConnectors.forEach(sc => {
        result.swivelConnectors!.push({
          ...sc,
          id: `${deck.id}_${sc.id}`,
          position: transform3D(sc.position)
        });
      });
    }

    result.calculatedFeetCount += singleResult.calculatedFeetCount;
    result.fullRostrumsCount += singleResult.fullRostrumsCount;
    result.halfRostrumsCount += singleResult.halfRostrumsCount;
    result.ledgerCounts.blueBlue += singleResult.ledgerCounts.blueBlue;
    result.ledgerCounts.blueBlack += singleResult.ledgerCounts.blueBlack;
    result.ledgerCounts.blackBlack += singleResult.ledgerCounts.blackBlack;
    result.totalArea += singleResult.totalArea;
    if (singleResult.status !== 'SOLVED') result.status = singleResult.status;
    result.errors.push(...singleResult.errors);
  });

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  result.feet.forEach(f => {
    if (f.position.x < minX) minX = f.position.x;
    if (f.position.x > maxX) maxX = f.position.x;
    if (f.position.y < minY) minY = f.position.y;
    if (f.position.y > maxY) maxY = f.position.y;
  });
  if (minX !== Infinity) {
    result.dimensions = { width: maxX - minX, depth: maxY - minY };
  }

  return result;
};
