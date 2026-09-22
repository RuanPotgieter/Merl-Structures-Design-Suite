import { DeckCalculationResult } from '../types';
import { DECK_THICKNESS } from '../constants';

export interface ComponentWeightBreakdown {
  category: string;
  count: number;
  weightKg: number;
  percentage: number;
  color: string;
}

export interface StructuralIntegrityReport {
  totalDeadWeightKg: number;
  totalDeadWeightTonnes: number;
  totalLiveWeightKg: number;
  totalGrossWeightKg: number;
  totalGrossWeightTonnes: number;
  liveLoadRatingKgM2: number;
  
  categoryWeights: ComponentWeightBreakdown[];

  centerOfGravityDead: { x: number; y: number; z: number };
  centerOfGravityGross: { x: number; y: number; z: number };
  geometricCenter: { x: number; y: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; depth: number };
  eccentricityMeters: number;
  eccentricityPercent: number;

  standardsCount: number;
  averageDeadLoadPerLegKg: number;
  averageGrossLoadPerLegKg: number;
  peakLoadPerLegKg: number;
  peakLoadPerLegKN: number;
  standardAxialCapacityKN: number;
  factorOfSafety: number;
  safetyMarginPercent: number;
  utilizationPercent: number;
  safetyStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'CAUTION' | 'CRITICAL';

  groundBearingPressureKPa: number;
  groundBearingCapacityKPa: number;
  groundBearingFoS: number;
  groundBearingStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'CAUTION' | 'CRITICAL';

  basejackSafety: {
    totalChecked: number;
    validCount: number;
    warningCount: number;
    minRunoutMm: number;
    maxRunoutMm: number;
    status: 'ALL_WITHIN_LIMITS' | 'WARNING_OUT_OF_RANGE';
  };

  lateralBracing: {
    totalBraces: number;
    swivelCount: number;
    stabilityIndex: number; // Percentage
    status: 'STABLE' | 'MODERATE' | 'UNDERBRACED';
  };
}

// Standard scaffold weights (kg)
export const UNIT_WEIGHTS = {
  // Rostrums & decking
  FULL_ROSTRUM_24_12: 38.5,     // 2.4m x 1.2m steel frame + phenolic plywood
  HALF_ROSTRUM_12_12: 21.8,     // 1.2m x 1.2m
  RAMP_ROSTRUM_UNIT: 24.5,      // Inclined deck unit per 1.2m bay
  RAMP_PLATE_UNIT: 14.0,        // Transition plate / sole plate

  // Standards (vertical steel tubes 48.3mm x 3.2mm)
  STANDARD_3000: 14.8,
  STANDARD_2500: 12.4,
  STANDARD_2000: 10.0,
  STANDARD_1750: 8.8,
  STANDARD_1500: 7.6,
  STANDARD_1250: 6.4,
  STANDARD_1000: 5.2,
  STANDARD_750: 4.0,
  STANDARD_500: 2.9,
  STANDARD_PER_METER_FALLBACK: 4.95,

  // Base components
  BASEJACK: 4.6,                // 600/800mm threaded screw jack with collar & plate
  SOLE_BOARD_HARDWOOD: 3.2,     // 300x300mm or 450x225mm spreader woodblock
  SUPPORT_PIPE_PER_METER: 4.8,  // Support pipe (kg/m)

  // Ledgers (horizontal tubes with wedge ends)
  LEDGER_2400_BLUE_BLUE: 9.2,   // 2.4m bay ledger
  LEDGER_1200_BLUE_BLACK: 4.8,  // 1.2m bay ledger
  LEDGER_1200_BLACK_BLACK: 4.8, // 1.2m bay ledger

  // Braces & Couplers
  DIAGONAL_BRACE: 8.6,          // Steel diagonal bracing tube
  SWIVEL_COUPLER: 1.4,          // Light Pink swivel coupler

  // Handrails & Uprights
  UPRIGHT_POST: 5.4,            // Upright socket post
  HANDRAIL_PER_METER: 5.0,      // Guardrail & midrail assembly
  HANDRAIL_D_LOOP: 3.6          // D-Loop safety return
};

/**
 * Calculates full structural integrity analytics:
 * - Dead Weight & Component Category Breakdown
 * - Live Load & Combined Gross Weight
 * - 3D Center of Gravity & Footprint Eccentricity
 * - Leg Loading, Peak Stresses, Standard Axial Capacity & Safety Factor
 * - Ground Bearing Pressure on Sole Boards
 * - Basejack Extension Audit
 * - Lateral Bracing Stability Index
 */
export function calculateStructuralIntegrity(
  data: DeckCalculationResult,
  liveLoadRatingKgM2: number = 500 // Default: 500 kg/m² (5.0 kN/m² BS EN 12811 Stage Load)
): StructuralIntegrityReport {
  let totalDeadWeightKg = 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightedZ = 0;

  // 1. Rostrums & Decks
  let rostrumWeight = 0;
  let rostrumCount = 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let totalDeckArea = 0;
  let liveWeightedX = 0;
  let liveWeightedY = 0;
  let liveWeightedZ = 0;

  if (data.rostrums && data.rostrums.length > 0) {
    data.rostrums.forEach(r => {
      if (r.isRiserFascia) return;

      const w = r.width || 1.2;
      const d = r.depth || 1.2;
      const area = w * d;
      totalDeckArea += area;

      const rX = r.center.x;
      const rY = r.center.y;
      const elev = r.startElevation ?? 2.0;
      const rZ = elev - DECK_THICKNESS / 2;

      // Update footprint bounds
      const halfW = w / 2;
      const halfD = d / 2;
      minX = Math.min(minX, rX - halfW);
      maxX = Math.max(maxX, rX + halfW);
      minY = Math.min(minY, rY - halfD);
      maxY = Math.max(maxY, rY + halfD);

      // Weight determination
      let wUnit = UNIT_WEIGHTS.FULL_ROSTRUM_24_12;
      if (r.isRamp) {
        wUnit = UNIT_WEIGHTS.RAMP_ROSTRUM_UNIT;
      } else if (area <= 1.8) {
        wUnit = UNIT_WEIGHTS.HALF_ROSTRUM_12_12;
      }

      rostrumWeight += wUnit;
      rostrumCount++;

      weightedX += wUnit * rX;
      weightedY += wUnit * rY;
      weightedZ += wUnit * rZ;

      // Live load centroid
      liveWeightedX += area * rX;
      liveWeightedY += area * rY;
      liveWeightedZ += area * elev;
    });
  }

  // 2. Standards & Leg Assemblies
  let standardsWeight = 0;
  let standardsCount = 0;
  let basejackWeight = 0;
  let basejackCount = 0;
  let soleboardWeight = 0;

  let minRunoutMm = Infinity;
  let maxRunoutMm = -Infinity;
  let outOfBoundsRunoutCount = 0;

  if (data.feet && data.feet.length > 0) {
    data.feet.forEach(f => {
      const fX = f.position.x;
      const fY = f.position.y;
      minX = Math.min(minX, fX);
      maxX = Math.max(maxX, fX);
      minY = Math.min(minY, fY);
      maxY = Math.max(maxY, fY);

      if (f.assembly) {
        standardsCount++;
        const { basejack, pipe, standards } = f.assembly;

        // Basejack runout inspection
        if (basejack > 0) {
          basejackCount++;
          basejackWeight += UNIT_WEIGHTS.BASEJACK;
          soleboardWeight += UNIT_WEIGHTS.SOLE_BOARD_HARDWOOD;

          minRunoutMm = Math.min(minRunoutMm, basejack);
          maxRunoutMm = Math.max(maxRunoutMm, basejack);
          if (basejack < 100 || basejack > 450) {
            outOfBoundsRunoutCount++;
          }

          // Centroid for basejack
          const bjZ = f.groundHeight + (basejack / 1000) / 2;
          weightedX += UNIT_WEIGHTS.BASEJACK * fX;
          weightedY += UNIT_WEIGHTS.BASEJACK * fY;
          weightedZ += UNIT_WEIGHTS.BASEJACK * bjZ;

          // Soleboard
          weightedX += UNIT_WEIGHTS.SOLE_BOARD_HARDWOOD * fX;
          weightedY += UNIT_WEIGHTS.SOLE_BOARD_HARDWOOD * fY;
          weightedZ += UNIT_WEIGHTS.SOLE_BOARD_HARDWOOD * f.groundHeight;
        }

        // Support Pipe
        if (pipe > 0) {
          const pipeM = pipe / 1000;
          const pipeKg = pipeM * UNIT_WEIGHTS.SUPPORT_PIPE_PER_METER;
          standardsWeight += pipeKg;

          const pZ = f.groundHeight + (basejack / 1000) + pipeM / 2;
          weightedX += pipeKg * fX;
          weightedY += pipeKg * fY;
          weightedZ += pipeKg * pZ;
        }

        // Standards
        let currentZ = f.groundHeight + (basejack / 1000) + (pipe / 1000);
        standards.forEach(sMm => {
          if (sMm <= 0) return;
          let sKg = UNIT_WEIGHTS.STANDARD_PER_METER_FALLBACK * (sMm / 1000);
          switch (sMm) {
            case 3000: sKg = UNIT_WEIGHTS.STANDARD_3000; break;
            case 2500: sKg = UNIT_WEIGHTS.STANDARD_2500; break;
            case 2000: sKg = UNIT_WEIGHTS.STANDARD_2000; break;
            case 1750: sKg = UNIT_WEIGHTS.STANDARD_1750; break;
            case 1500: sKg = UNIT_WEIGHTS.STANDARD_1500; break;
            case 1250: sKg = UNIT_WEIGHTS.STANDARD_1250; break;
            case 1000: sKg = UNIT_WEIGHTS.STANDARD_1000; break;
            case 750: sKg = UNIT_WEIGHTS.STANDARD_750; break;
            case 500: sKg = UNIT_WEIGHTS.STANDARD_500; break;
          }

          standardsWeight += sKg;
          const sZ = currentZ + (sMm / 2000);
          weightedX += sKg * fX;
          weightedY += sKg * fY;
          weightedZ += sKg * sZ;

          currentZ += (sMm / 1000);
        });
      }
    });
  }

  // 3. Ledgers
  let ledgerWeight = 0;
  let ledgerCount = 0;
  if (data.ledgers && data.ledgers.length > 0) {
    data.ledgers.forEach(l => {
      let lKg = UNIT_WEIGHTS.LEDGER_1200_BLUE_BLACK;
      if (l.type === 'blueBlue' || l.length > 2.0) {
        lKg = UNIT_WEIGHTS.LEDGER_2400_BLUE_BLUE;
      } else if (l.type === 'blackBlack') {
        lKg = UNIT_WEIGHTS.LEDGER_1200_BLACK_BLACK;
      }
      ledgerWeight += lKg;
      ledgerCount++;

      weightedX += lKg * l.position.x;
      weightedY += lKg * l.position.y;
      weightedZ += lKg * l.position.z;
    });
  } else if (data.ledgerCounts) {
    const bb = (data.ledgerCounts.blueBlue || 0) * UNIT_WEIGHTS.LEDGER_2400_BLUE_BLUE;
    const bblk = (data.ledgerCounts.blueBlack || 0) * UNIT_WEIGHTS.LEDGER_1200_BLUE_BLACK;
    const blkblk = (data.ledgerCounts.blackBlack || 0) * UNIT_WEIGHTS.LEDGER_1200_BLACK_BLACK;
    ledgerWeight = bb + bblk + blkblk;
    ledgerCount = (data.ledgerCounts.blueBlue || 0) + (data.ledgerCounts.blueBlack || 0) + (data.ledgerCounts.blackBlack || 0);
  }

  // 4. Braces & Swivels
  let bracingWeight = 0;
  let bracingCount = 0;
  if (data.braces && data.braces.length > 0) {
    data.braces.forEach(b => {
      bracingWeight += UNIT_WEIGHTS.DIAGONAL_BRACE;
      bracingCount++;

      const midX = (b.startPos.x + b.endPos.x) / 2;
      const midY = (b.startPos.y + b.endPos.y) / 2;
      const midZ = (b.startPos.z + b.endPos.z) / 2;

      weightedX += UNIT_WEIGHTS.DIAGONAL_BRACE * midX;
      weightedY += UNIT_WEIGHTS.DIAGONAL_BRACE * midY;
      weightedZ += UNIT_WEIGHTS.DIAGONAL_BRACE * midZ;
    });
  }

  let swivelWeight = 0;
  let swivelCount = 0;
  if (data.swivelConnectors && data.swivelConnectors.length > 0) {
    data.swivelConnectors.forEach(sc => {
      swivelWeight += UNIT_WEIGHTS.SWIVEL_COUPLER;
      swivelCount++;

      weightedX += UNIT_WEIGHTS.SWIVEL_COUPLER * sc.position.x;
      weightedY += UNIT_WEIGHTS.SWIVEL_COUPLER * sc.position.y;
      weightedZ += UNIT_WEIGHTS.SWIVEL_COUPLER * sc.position.z;
    });
  }

  // 5. Uprights & Handrails
  let guardrailWeight = 0;
  let uprightCount = 0;
  if (data.uprights && data.uprights.length > 0) {
    data.uprights.forEach(u => {
      guardrailWeight += UNIT_WEIGHTS.UPRIGHT_POST;
      uprightCount++;

      weightedX += UNIT_WEIGHTS.UPRIGHT_POST * u.x;
      weightedY += UNIT_WEIGHTS.UPRIGHT_POST * u.y;
      weightedZ += UNIT_WEIGHTS.UPRIGHT_POST * (u.zDeck + 0.5);
    });
  }

  let handrailCount = 0;
  if (data.handrails && data.handrails.length > 0) {
    data.handrails.forEach(hr => {
      handrailCount++;
      const hrKg = hr.isTermination ? UNIT_WEIGHTS.HANDRAIL_D_LOOP : (hr.length || 1.2) * UNIT_WEIGHTS.HANDRAIL_PER_METER;
      guardrailWeight += hrKg;

      const midX = (hr.startPos.x + hr.endPos.x) / 2;
      const midY = (hr.startPos.y + hr.endPos.y) / 2;
      const midZ = (hr.startPos.z + hr.endPos.z) / 2;

      weightedX += hrKg * midX;
      weightedY += hrKg * midY;
      weightedZ += hrKg * midZ;
    });
  }

  // Aggregate Dead Load
  totalDeadWeightKg = rostrumWeight + standardsWeight + basejackWeight + soleboardWeight + ledgerWeight + bracingWeight + swivelWeight + guardrailWeight;
  const totalDeadWeightTonnes = totalDeadWeightKg / 1000;

  // Center of Gravity (Dead Load)
  const cogDead = {
    x: totalDeadWeightKg > 0 ? weightedX / totalDeadWeightKg : 0,
    y: totalDeadWeightKg > 0 ? weightedY / totalDeadWeightKg : 0,
    z: totalDeadWeightKg > 0 ? weightedZ / totalDeadWeightKg : 1.0
  };

  // Geometric center of footprint
  if (!isFinite(minX)) minX = 0;
  if (!isFinite(maxX)) maxX = data.dimensions?.width || 10;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxY)) maxY = data.dimensions?.depth || 10;

  const width = Math.max(1, maxX - minX);
  const depth = Math.max(1, maxY - minY);
  const geomCenter = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };

  // Live Load Calculations
  const hasRostrums = (data.rostrums && data.rostrums.length > 0) || (data.totalArea && data.totalArea > 0);
  const effectiveArea = totalDeckArea > 0 ? totalDeckArea : (hasRostrums ? (data.totalArea || width * depth) : 0);
  const totalLiveWeightKg = effectiveArea * liveLoadRatingKgM2;
  const totalGrossWeightKg = totalDeadWeightKg + totalLiveWeightKg;
  const totalGrossWeightTonnes = totalGrossWeightKg / 1000;

  // Live Load Centroid
  const cogLive = {
    x: totalDeckArea > 0 ? liveWeightedX / totalDeckArea : geomCenter.x,
    y: totalDeckArea > 0 ? liveWeightedY / totalDeckArea : geomCenter.y,
    z: totalDeckArea > 0 ? liveWeightedZ / totalDeckArea : (cogDead.z + 0.5)
  };

  // Combined Gross CoG
  const cogGross = {
    x: totalGrossWeightKg > 0 ? (cogDead.x * totalDeadWeightKg + cogLive.x * totalLiveWeightKg) / totalGrossWeightKg : geomCenter.x,
    y: totalGrossWeightKg > 0 ? (cogDead.y * totalDeadWeightKg + cogLive.y * totalLiveWeightKg) / totalGrossWeightKg : geomCenter.y,
    z: totalGrossWeightKg > 0 ? (cogDead.z * totalDeadWeightKg + cogLive.z * totalLiveWeightKg) / totalGrossWeightKg : cogDead.z
  };

  // Eccentricity (Distance from CoG to Footprint Geometric Center)
  const deltaX = cogGross.x - geomCenter.x;
  const deltaY = cogGross.y - geomCenter.y;
  const eccentricityMeters = Math.hypot(deltaX, deltaY);
  const maxFootprintRadius = Math.hypot(width, depth) / 2;
  const eccentricityPercent = Math.min(100, (eccentricityMeters / maxFootprintRadius) * 100);

  // Structural Load Per Leg & Safety Margins
  const numStandards = Math.max(1, standardsCount || data.calculatedFeetCount || 1);
  const averageDeadLoadPerLegKg = totalDeadWeightKg / numStandards;
  const averageGrossLoadPerLegKg = totalGrossWeightKg / numStandards;

  // Peak leg load accounting for tributary area and CoG moment eccentricity
  const eccentricityFactor = 1 + (4 * Math.abs(deltaX) / width) + (4 * Math.abs(deltaY) / depth);
  // Tributary area variation factor (center standards carry higher tributary load than corners)
  const tributaryPeakFactor = 1.35;
  const peakLoadPerLegKg = averageGrossLoadPerLegKg * tributaryPeakFactor * Math.min(1.6, eccentricityFactor);
  const peakLoadPerLegKN = (peakLoadPerLegKg * 9.80665) / 1000; // kN

  // Safe Working Load (SWL) for typical scaffold standard with ledgers at 1.0m intervals
  const standardAxialCapacityKN = 38.5; // 38.5 kN (~3,925 kg axial capacity)
  const standardAxialCapacityKg = (standardAxialCapacityKN * 1000) / 9.80665;

  const utilizationPercent = Math.min(200, (peakLoadPerLegKg / standardAxialCapacityKg) * 100);
  const factorOfSafety = peakLoadPerLegKg > 0 ? standardAxialCapacityKg / peakLoadPerLegKg : 10;
  const safetyMarginPercent = Math.max(-100, (factorOfSafety - 1) * 100);

  let safetyStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'CAUTION' | 'CRITICAL' = 'OPTIMAL';
  if (factorOfSafety >= 2.5) {
    safetyStatus = 'OPTIMAL';
  } else if (factorOfSafety >= 1.7) {
    safetyStatus = 'ACCEPTABLE';
  } else if (factorOfSafety >= 1.2) {
    safetyStatus = 'CAUTION';
  } else {
    safetyStatus = 'CRITICAL';
  }

  // Ground Bearing Pressure
  // Standard woodblock / soleboard area: 300mm x 300mm = 0.09 m²
  const soleBoardAreaM2 = 0.09;
  const groundBearingPressureKPa = peakLoadPerLegKN / soleBoardAreaM2;
  const groundBearingCapacityKPa = 150.0; // Typical allowable soil bearing: 150 kPa for compacted ground/asphalt
  const groundBearingFoS = groundBearingPressureKPa > 0 ? groundBearingCapacityKPa / groundBearingPressureKPa : 10;

  let groundBearingStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'CAUTION' | 'CRITICAL' = 'OPTIMAL';
  if (groundBearingFoS >= 2.0) groundBearingStatus = 'OPTIMAL';
  else if (groundBearingFoS >= 1.5) groundBearingStatus = 'ACCEPTABLE';
  else if (groundBearingFoS >= 1.0) groundBearingStatus = 'CAUTION';
  else groundBearingStatus = 'CRITICAL';

  // Basejack Runout Safety Status
  if (!isFinite(minRunoutMm)) minRunoutMm = 200;
  if (!isFinite(maxRunoutMm)) maxRunoutMm = 200;

  // Lateral Stability Index
  // Ratio of diagonal braces to standards
  const minRequiredBraces = Math.max(2, Math.ceil(numStandards / 4));
  const stabilityIndex = Math.min(100, Math.round((bracingCount / minRequiredBraces) * 100));
  let bracingStatus: 'STABLE' | 'MODERATE' | 'UNDERBRACED' = 'STABLE';
  if (stabilityIndex >= 85) bracingStatus = 'STABLE';
  else if (stabilityIndex >= 50) bracingStatus = 'MODERATE';
  else bracingStatus = 'UNDERBRACED';

  // Component breakdown
  const categoryWeights: ComponentWeightBreakdown[] = [
    {
      category: 'Deck Rostrums',
      count: rostrumCount,
      weightKg: Math.round(rostrumWeight),
      percentage: totalDeadWeightKg > 0 ? (rostrumWeight / totalDeadWeightKg) * 100 : 0,
      color: '#0284c7' // Electric blue
    },
    {
      category: 'Vertical Standards',
      count: standardsCount,
      weightKg: Math.round(standardsWeight),
      percentage: totalDeadWeightKg > 0 ? (standardsWeight / totalDeadWeightKg) * 100 : 0,
      color: '#0ea5e9' // Sky cyan
    },
    {
      category: 'Basejacks & Soles',
      count: basejackCount,
      weightKg: Math.round(basejackWeight + soleboardWeight),
      percentage: totalDeadWeightKg > 0 ? ((basejackWeight + soleboardWeight) / totalDeadWeightKg) * 100 : 0,
      color: '#38bdf8' // Powder blue
    },
    {
      category: 'Horizontal Ledgers',
      count: ledgerCount,
      weightKg: Math.round(ledgerWeight),
      percentage: totalDeadWeightKg > 0 ? (ledgerWeight / totalDeadWeightKg) * 100 : 0,
      color: '#10b981' // Green
    },
    {
      category: 'Diagonal Braces',
      count: bracingCount + swivelCount,
      weightKg: Math.round(bracingWeight + swivelWeight),
      percentage: totalDeadWeightKg > 0 ? ((bracingWeight + swivelWeight) / totalDeadWeightKg) * 100 : 0,
      color: '#f43f5e' // Rose red
    },
    {
      category: 'Guardrails & Uprights',
      count: uprightCount + handrailCount,
      weightKg: Math.round(guardrailWeight),
      percentage: totalDeadWeightKg > 0 ? (guardrailWeight / totalDeadWeightKg) * 100 : 0,
      color: '#eab308' // Safety yellow
    }
  ];

  return {
    totalDeadWeightKg: Math.round(totalDeadWeightKg),
    totalDeadWeightTonnes: Number(totalDeadWeightTonnes.toFixed(2)),
    totalLiveWeightKg: Math.round(totalLiveWeightKg),
    totalGrossWeightKg: Math.round(totalGrossWeightKg),
    totalGrossWeightTonnes: Number(totalGrossWeightTonnes.toFixed(2)),
    liveLoadRatingKgM2,

    categoryWeights,

    centerOfGravityDead: {
      x: Number(cogDead.x.toFixed(2)),
      y: Number(cogDead.y.toFixed(2)),
      z: Number(cogDead.z.toFixed(2))
    },
    centerOfGravityGross: {
      x: Number(cogGross.x.toFixed(2)),
      y: Number(cogGross.y.toFixed(2)),
      z: Number(cogGross.z.toFixed(2))
    },
    geometricCenter: {
      x: Number(geomCenter.x.toFixed(2)),
      y: Number(geomCenter.y.toFixed(2))
    },
    bounds: {
      minX: Number(minX.toFixed(2)),
      maxX: Number(maxX.toFixed(2)),
      minY: Number(minY.toFixed(2)),
      maxY: Number(maxY.toFixed(2)),
      width: Number(width.toFixed(2)),
      depth: Number(depth.toFixed(2))
    },
    eccentricityMeters: Number(eccentricityMeters.toFixed(2)),
    eccentricityPercent: Number(eccentricityPercent.toFixed(1)),

    standardsCount: numStandards,
    averageDeadLoadPerLegKg: Math.round(averageDeadLoadPerLegKg),
    averageGrossLoadPerLegKg: Math.round(averageGrossLoadPerLegKg),
    peakLoadPerLegKg: Math.round(peakLoadPerLegKg),
    peakLoadPerLegKN: Number(peakLoadPerLegKN.toFixed(2)),
    standardAxialCapacityKN,
    factorOfSafety: Number(factorOfSafety.toFixed(2)),
    safetyMarginPercent: Number(safetyMarginPercent.toFixed(0)),
    utilizationPercent: Number(utilizationPercent.toFixed(1)),
    safetyStatus,

    groundBearingPressureKPa: Number(groundBearingPressureKPa.toFixed(1)),
    groundBearingCapacityKPa,
    groundBearingFoS: Number(groundBearingFoS.toFixed(2)),
    groundBearingStatus,

    basejackSafety: {
      totalChecked: basejackCount,
      validCount: basejackCount - outOfBoundsRunoutCount,
      warningCount: outOfBoundsRunoutCount,
      minRunoutMm: Math.round(minRunoutMm),
      maxRunoutMm: Math.round(maxRunoutMm),
      status: outOfBoundsRunoutCount === 0 ? 'ALL_WITHIN_LIMITS' : 'WARNING_OUT_OF_RANGE'
    },

    lateralBracing: {
      totalBraces: bracingCount,
      swivelCount,
      stabilityIndex,
      status: bracingStatus
    }
  };
}
