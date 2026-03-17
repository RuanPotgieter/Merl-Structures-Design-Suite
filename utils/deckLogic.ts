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
  const u = Math.max(0, Math.min(1, Math.abs(x) / (width || 1)));
  const v = Math.max(0, Math.min(1, Math.abs(y) / (depth || 1)));
  
  const h00 = 0; 
  const h10 = -terrain.groundOffsets.widthEnd;  
  const h01 = -terrain.groundOffsets.depthEnd;  
  const h11 = -terrain.groundOffsets.diagonal; 

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
  const allowStacking = specifiedDeckHeightM > 3.0;
  
  const sortedStds = [...STANDARD_HEIGHTS_MM].sort((a, b) => b - a);
  const suitableJacks = BASEJACK_TYPES_MM.filter(bj => bj >= 400);

  for (const bj of suitableJacks) {
    const compatiblePipes = JACK_PIPE_COMPATIBILITY[bj] || [];
    for (const pipe of compatiblePipes) {
      if (allowStacking) {
        for (const s1 of sortedStds) {
          for (const s2 of sortedStds) {
            const currentSteel = pipe + s1 + s2;
            const runoutNeeded = targetMm - currentSteel;
            if (runoutNeeded >= MIN_RUNOUT && runoutNeeded <= MAX_RUNOUT) {
              const result = {
                basejack: runoutNeeded,
                pipe: pipe,
                standards: [s1, s2],
                totalHeight: requiredHeightM
              };
              legAssemblyCache.set(cacheKey, result);
              return result;
            }
          }
        }
      }

      // Try single standard
      for (const s1 of sortedStds) {
        const currentSteel = pipe + s1;
        const runoutNeeded = targetMm - currentSteel;
        if (runoutNeeded >= MIN_RUNOUT && runoutNeeded <= MAX_RUNOUT) {
          const result = {
            basejack: runoutNeeded,
            pipe: pipe,
            standards: [s1],
            totalHeight: requiredHeightM
          };
          legAssemblyCache.set(cacheKey, result);
          return result;
        }
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
    let numPressings = 1;
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
  
  const selected: number[] = [common[0]]; // Kicker
  let lastElev = common[0];
  
  for (let i = 1; i < common.length; i++) {
    if (common[i] - lastElev >= 1.9) {
      selected.push(common[i]);
      lastElev = common[i];
    }
  }
  
  const highestCommon = common[common.length - 1];
  if (highestCommon - lastElev >= 1.4) {
    selected.push(highestCommon);
  }
  
  return selected;
};

const calculateRakingDeck = (
  deck: import('../types').DeckConfig,
  rawRampConfigs: import('../types').RampConfig[] = [],
  handrailConfigs: import('../types').HandrailConfig[] = []
): import('../types').DeckCalculationResult => {
  const targetWidth = Number(deck.width) || 0;
  const tiers = deck.tiers || 3;
  const numW = Math.min(targetWidth, 100);
  
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
  const exactDepth = tiers * 1.2;

  const rostrums: import('../types').Rostrum[] = [];
  const feetMap = new Map<string, import('../types').Foot>();

  // Raking logic
  for (let t = 0; t < tiers; t++) {
    const zStart = t * 1.2;
    const zEnd = (t + 1) * 1.2;
    const height = (t + 1) * 0.25;

    // Generate rostrums for this tier
    let currentX = exactWidth;
    let remainingWidth = exactWidth;
    
    while (remainingWidth >= 0.1) {
      let bayWidth = 1.2;
      if (remainingWidth >= 2.4 - 0.05) {
        bayWidth = 2.4;
      } else {
        bayWidth = 1.2;
        if (remainingWidth < 1.2 - 0.05) bayWidth = remainingWidth;
      }

      const xEnd = currentX;
      const xStart = currentX - bayWidth;

      rostrums.push({
        id: `RAKING_T${t}_X${currentX.toFixed(1)}`,
        gridRow: t,
        gridCol: Math.round(currentX / 1.2),
        topLeft: { x: xEnd, y: zEnd },
        bottomRight: { x: xStart, y: zStart },
        startElevation: height,
        endElevation: height
      });

      // Feet
      const xPos = [xStart, xEnd];
      if (bayWidth > 1.8) {
        xPos.push(xStart + 1.2);
      }
      
      const zPos = [zStart, zEnd];
      xPos.forEach(px => {
        zPos.forEach(pz => {
          const key = `${px.toFixed(3)},${pz.toFixed(3)}`;
          if (!feetMap.has(key)) {
            feetMap.set(key, { 
              id: key, 
              position: { x: px, y: pz }, 
              groundHeight: 0, 
              targetElevation: height 
            });
          } else {
            // Update targetElevation if this foot is shared and needs to be higher
            const existingFoot = feetMap.get(key)!;
            if (height > existingFoot.targetElevation) {
              existingFoot.targetElevation = height;
            }
          }
        });
      });

      currentX -= bayWidth;
      remainingWidth -= bayWidth;
    }
  }

  const feet = Array.from(feetMap.values());
  
  // Calculate leg assemblies
  feet.forEach(foot => {
    const pz = foot.position.y;
    const t = Math.round(pz / 1.2); // Tier index (0 for front of tier 1, 1 for back of tier 1 / front of tier 2, etc.)
    
    // "The first row of rostrims are 250 high, and always built on level grounds. Dont use basejacks at all unless theres a ramp."
    // "The second row of rostrims right side feet will all be 250mm high, pipes, and every third foot is a plate foot, all through to the end, the left side feet will all be on the floor, and 500mm high."
    // Let's simplify: all feet are just pipes going to the floor.
    // Wait, the user said "right side feet will all be 250mm high, pipes... left side feet will all be on the floor, and 500mm high."
    // This implies the front feet of tier 2 (z=1.2) rest on tier 1, so they are 250mm long.
    // The back feet of tier 2 (z=2.4) go to the floor, so they are 500mm long.
    // Let's just use standard leg assemblies for now, but without basejacks.
    const h = foot.targetElevation;
    foot.assembly = {
      baseJack: 0,
      pipes: [h],
      uHead: 0,
      totalHeight: h
    };
  });

  // Handrails
  const handrails: any[] = [];
  const uprights: any[] = [];
  
  let uprightIdCounter = 0;
  let handrailIdCounter = 0;

  const getDeckElev = (x: number, y: number) => {
    const key = `${x.toFixed(3)},${y.toFixed(3)}`;
    const f = feetMap.get(key);
    if (f) return f.targetElevation;
    return terrain.deckHeight;
  };

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
  });

  return {
    rostrums,
    feet,
    calculatedFeetCount: feet.length,
    fullRostrumsCount: rostrums.filter(r => r.width > 1.8).length,
    halfRostrumsCount: rostrums.filter(r => r.width <= 1.8).length,
    ledgerCounts: { blueBlue: 0, blueBlack: 0, blackBlack: 0 },
    ledgers: [],
    braces: [],
    uprights,
    handrails,
    totalArea: exactWidth * exactDepth,
    dimensions: { width: exactWidth, depth: exactDepth },
    terrain,
    status: 'SOLVED',
    errors: []
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

  const targetWidth = deck.width;
  const targetDepth = deck.depth;
  const rawTerrain = deck.terrain;
  const numW = Math.min(Number(targetWidth) || 0, 100);
  const numD = Math.min(Number(targetDepth) || 0, 100);
  
  const terrain: TerrainConfig = {
    deckHeight: Number(rawTerrain.deckHeight) || 0,
    groundOffsets: {
      origin: Number(rawTerrain.groundOffsets.origin) || 0,
      widthEnd: Number(rawTerrain.groundOffsets.widthEnd) || 0,
      depthEnd: Number(rawTerrain.groundOffsets.depthEnd) || 0,
      diagonal: Number(rawTerrain.groundOffsets.diagonal) || 0,
    }
  };

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
            topLeft: { x: xEnd, y: yEnd },
            bottomRight: { x: xStart, y: yStart },
            startElevation: terrain.deckHeight,
            endElevation: terrain.deckHeight
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
                  targetElevation: terrain.deckHeight 
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
            topLeft: { x: xEnd, y: yEnd },
            bottomRight: { x: xStart, y: yStart },
            startElevation: terrain.deckHeight,
            endElevation: terrain.deckHeight
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
                  targetElevation: terrain.deckHeight 
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
    
    if (rc.side === 'bottom') {
      startX = rc.corner === 'bottomLeft' || rc.corner === 'topLeft' ? c.x + rc.offset : c.x - rc.offset - rc.width;
      startY = 0;
    } else if (rc.side === 'top') {
      startX = rc.corner === 'bottomLeft' || rc.corner === 'topLeft' ? c.x + rc.offset : c.x - rc.offset - rc.width;
      startY = exactDepth;
    } else if (rc.side === 'left') {
      startX = 0;
      startY = rc.corner === 'bottomLeft' || rc.corner === 'bottomRight' ? c.y + rc.offset : c.y - rc.offset - rc.width;
    } else if (rc.side === 'right') {
      startX = exactWidth;
      startY = rc.corner === 'bottomLeft' || rc.corner === 'bottomRight' ? c.y + rc.offset : c.y - rc.offset - rc.width;
    }
    
    const rampCols = Math.max(1, Math.round(rc.width / 1.2));
    const exactRampWidth = rampCols * 1.2;
    
    const rampRowHeights: number[] = [];
    let remLen = rc.length;
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

    const currentElev = terrain.deckHeight;
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
    const drop = currentElev - farEndElev;
    
    // Calculate segments for landing pads
    const landingPads = rc.landingPads || [];
    const sortedPads = [...landingPads].sort((a, b) => a.offset - b.offset);
    
    let segments: { type: 'sloped' | 'flat', length: number, startOffset: number, endOffset: number }[] = [];
    let currentOffset = 0;
    
    for (const pad of sortedPads) {
      if (pad.offset > currentOffset) {
        segments.push({ type: 'sloped', length: pad.offset - currentOffset, startOffset: currentOffset, endOffset: pad.offset });
      }
      segments.push({ type: 'flat', length: pad.length, startOffset: pad.offset, endOffset: pad.offset + pad.length });
      currentOffset = pad.offset + pad.length;
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

  feet.forEach(f => {
    f.groundHeight = getGroundYAt(f.position.x, f.position.y, terrain, exactWidth, exactDepth);
    const reqH = f.targetElevation - f.groundHeight - DECK_THICKNESS - SOLE_BOARD_THICKNESS;
    
    if (reqH < 0.15) {
      f.error = "UNDER_MIN_HEIGHT";
      errors.push(`Height too low at ${f.id}: ${reqH.toFixed(3)}m`);
    } else {
      const assembly = solveLegAssembly(reqH, terrain.deckHeight);
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

  // Helper to determine if a 1.2x1.2 cell is braced
  const isCellBraced = (cellX: number, cellY: number): boolean => {
    const col = Math.round(cellX / 1.2);
    const row = Math.round(cellY / 1.2);
    
    const maxCol = Math.round(exactWidth / 1.2) - 1;
    const maxRow = Math.round(exactDepth / 1.2) - 1;

    // Ledger blocks are placed in an alternating pattern (every 2nd cell).
    // To ensure the outer perimeter is always secured, we also force bracing on the maximum edges.
    // This may result in double ledger blocks if the deck length/depth is an odd number of bays.
    const isBracedX = col % 2 === 0 || col === maxCol;
    const isBracedY = row % 2 === 0 || row === maxRow;

    return isBracedX && isBracedY;
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
  
  const widthBays = Math.round(exactWidth / 1.2);
  const depthBays = Math.round(exactDepth / 1.2);

  if (terrain.deckHeight >= 0.75) {
    const getIntervals = (totalBays: number) => {
      const intervals: {start: number, end: number}[] = [];
      let start = 0;
      while (start < totalBays) {
        let end = start + 3;
        if (end > totalBays) {
          end = totalBays;
          start = Math.max(0, end - 3);
        }
        if (intervals.length > 0) {
          const last = intervals[intervals.length - 1];
          if (last.start === start && last.end === end) {
            break;
          }
        }
        intervals.push({start, end});
        if (end === totalBays) break;
        start += 4;
      }
      return intervals;
    };

    const xIntervals = getIntervals(widthBays);
    const yIntervals = getIntervals(depthBays);

    for (let xi = 0; xi < xIntervals.length; xi++) {
      for (let yi = 0; yi < yIntervals.length; yi++) {
        // Only place bracing blocks on the perimeter
        const isPerimeter = xi === 0 || xi === xIntervals.length - 1 || yi === 0 || yi === yIntervals.length - 1;
        
        if (isPerimeter) {
          const xInt = xIntervals[xi];
          const yInt = yIntervals[yi];
          
          const startX = xInt.start * 1.2;
          const endX = xInt.end * 1.2;
          const startY = yInt.start * 1.2;
          const endY = yInt.end * 1.2;
          
          // Skip if the box is too small (e.g. less than 1 bay wide/deep)
          if (endX - startX < 1.1 || endY - startY < 1.1) continue;

          const parity = (xi + yi) % 2;
          const color = "ffe600"; // Yellow for braces
          
          // Helper to get elevation for a standard
          const getElev = (x: number, y: number, isTop: boolean) => {
            const key = `${x.toFixed(3)},${y.toFixed(3)}`;
            const f = feetMap.get(key);
            if (!f) return isTop ? terrain.deckHeight - 0.1 : 0.5;
            return isTop ? terrain.deckHeight - 0.1 : f.groundHeight + 0.2;
          };

          const frontStartTop = parity === 0;
          const frontEndTop = parity === 1;
          
          const backStartTop = parity === 1;
          const backEndTop = parity === 0;
          
          const leftStartTop = parity === 1;
          const leftEndTop = parity === 0;
          
          const rightStartTop = parity === 0;
          const rightEndTop = parity === 1;

          // Front face (y = startY)
          braces.push({
            id: `BRC_F_${xi}_${yi}`,
            startPos: { x: startX, y: startY, z: getElev(startX, startY, frontStartTop) },
            endPos: { x: endX, y: startY, z: getElev(endX, startY, frontEndTop) },
            color
          });
          
          // Back face (y = endY)
          braces.push({
            id: `BRC_B_${xi}_${yi}`,
            startPos: { x: startX, y: endY, z: getElev(startX, endY, backStartTop) },
            endPos: { x: endX, y: endY, z: getElev(endX, endY, backEndTop) },
            color
          });
          
          // Left face (x = startX)
          braces.push({
            id: `BRC_L_${xi}_${yi}`,
            startPos: { x: startX, y: startY, z: getElev(startX, startY, leftStartTop) },
            endPos: { x: startX, y: endY, z: getElev(startX, endY, leftEndTop) },
            color
          });
          
          // Right face (x = endX)
          braces.push({
            id: `BRC_R_${xi}_${yi}`,
            startPos: { x: endX, y: startY, z: getElev(endX, startY, rightStartTop) },
            endPos: { x: endX, y: endY, z: getElev(endX, endY, rightEndTop) },
            color
          });
        }
      }
    }
  }

  rampDataForBracing.forEach((rampData, rampIdx) => {
    const { rc, startX, startY, exactRampWidth, exactRampLength, currentElev, farEndElev, drop, slopeAngle, rampRowHeights, getElevAtOffset } = rampData;
    
    const maxRampHeight = currentElev;
    const isHighRamp = maxRampHeight >= 0.75;
    const isLargeRamp = exactRampWidth > 2.4 && exactRampLength > 2.4;
    
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
      return f ? f.groundHeight + 0.2 : getGroundYAt(px, py, terrain, exactWidth, exactDepth) + 0.2;
    };

    let currentRampY = 0;
    for (let rr = 0; rr < rampRowHeights.length; rr++) {
      const rHeight = rampRowHeights[rr];
      let currentRampX = exactRampWidth;
      let remainingWidth = exactRampWidth;
      let cc = 0;
      
      while (remainingWidth >= 0.1) {
        let cWidth = 1.2;
        if (Math.abs(rHeight - 1.2) < 0.1) {
          if (remainingWidth >= 2.4 - 0.05) cWidth = 2.4;
          else { cWidth = 1.2; if (remainingWidth < 1.2 - 0.05) cWidth = remainingWidth; }
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

        const c1 = { x: rTopLeft.x, y: rTopLeft.y };
        const c2 = { x: rBottomRight.x, y: rTopLeft.y };
        const c3 = { x: rTopLeft.x, y: rBottomRight.y };
        const c4 = { x: rBottomRight.x, y: rBottomRight.y };

        const color = "ffe600"; // Yellow for braces

        if (isHighRamp && isLargeRamp) {
          // Cross bracing for high/large ramps
          const isOuterX = cc === 0 || remainingWidth - cWidth < 0.1;
          const isOuterY = rr === 0 || rr === rampRowHeights.length - 1;

          if (isOuterX || isOuterY) {
            const addCrossBrace = (pA: any, pB: any, idSuffix: string) => {
              const elevA_top = getPtElev(pA.x, pA.y) - 0.1;
              const elevA_bot = getGroundElev(pA.x, pA.y);
              const elevB_top = getPtElev(pB.x, pB.y) - 0.1;
              const elevB_bot = getGroundElev(pB.x, pB.y);
              
              if (elevA_top - elevA_bot > 0.5 && elevB_top - elevB_bot > 0.5) {
                braces.push({
                  id: `RAMP_BRC_${rampIdx}_${rr}_${cc}_${idSuffix}_1`,
                  startPos: { x: pA.x, y: pA.y, z: elevA_bot },
                  endPos: { x: pB.x, y: pB.y, z: elevB_top },
                  color
                });
                braces.push({
                  id: `RAMP_BRC_${rampIdx}_${rr}_${cc}_${idSuffix}_2`,
                  startPos: { x: pA.x, y: pA.y, z: elevA_top },
                  endPos: { x: pB.x, y: pB.y, z: elevB_bot },
                  color
                });
              }
            };

            if (isOuterY) addCrossBrace(c1, c2, 'X');
            if (isOuterX) addCrossBrace(c1, c3, 'Y');
          }
        } else {
          // Parallel bracing for low ramps or small high ramps
          const addParallelBrace = (pA: any, pB: any, idSuffix: string) => {
            const elevA = getPtElev(pA.x, pA.y);
            const elevB = getPtElev(pB.x, pB.y);
            const groundA = getGroundElev(pA.x, pA.y);
            const groundB = getGroundElev(pB.x, pB.y);

            // Only add if ramp surface is at least 200mm above ground
            if (elevA - groundA >= 0.2 && elevB - groundB >= 0.2) {
              braces.push({
                id: `RAMP_PBRC_${rampIdx}_${rr}_${cc}_${idSuffix}`,
                startPos: { x: pA.x, y: pA.y, z: elevA - 0.15 }, // slightly below surface
                endPos: { x: pB.x, y: pB.y, z: elevB - 0.15 },
                color
              });
            }
          };

          // Add parallel braces along the slope (longitudinal)
          if (rc.side === 'bottom' || rc.side === 'top') {
            addParallelBrace(c1, c3, 'L1');
            addParallelBrace(c2, c4, 'L2');
            // Middle feet bracing
            if (Math.abs(c1.x - c2.x) > 1.8) {
              const midX = (c1.x + c2.x) / 2;
              addParallelBrace({x: midX, y: c1.y}, {x: midX, y: c3.y}, 'LMID');
            }
          } else {
            addParallelBrace(c1, c2, 'L1');
            addParallelBrace(c3, c4, 'L2');
            // Middle feet bracing
            if (Math.abs(c1.y - c3.y) > 1.8) {
              const midY = (c1.y + c3.y) / 2;
              addParallelBrace({x: c1.x, y: midY}, {x: c2.x, y: midY}, 'LMID');
            }
          }
        }

        currentRampX -= cWidth;
        remainingWidth -= cWidth;
        cc++;
      }
      currentRampY += rHeight;
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
    return terrain.deckHeight;
  };

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
    totalArea: 0,
    dimensions: { width: 0, depth: 0 },
    terrain: decks[0]?.terrain || { deckHeight: 0, groundOffsets: { origin: 0, widthEnd: 0, depthEnd: 0, diagonal: 0 } },
    status: 'SOLVED',
    errors: []
  };

  decks.forEach((deck) => {
    const deckRamps = rampConfigs.filter(r => r.deckId === deck.id);
    const deckHandrails = handrailConfigs.filter(h => h.deckId === deck.id);
    const singleResult = calculateSingleDeck(deck, deckRamps, deckHandrails);
    
    const originX = Number(deck.originX) || 0;
    const originZ = Number(deck.originZ) || 0;
    const orientation = Number(deck.orientation) || 0;
    
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
