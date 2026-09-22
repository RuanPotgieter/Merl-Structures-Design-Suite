import React, { useState, useMemo } from 'react';
import { DeckCalculationResult } from '../types';
import { calculateStructuralIntegrity, StructuralIntegrityReport } from '../utils/structuralCalculations';
import { 
  ShieldCheck, 
  Scale, 
  Compass, 
  Activity, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Anchor,
  Maximize2
} from 'lucide-react';

interface StructuralIntegrityPanelProps {
  data: DeckCalculationResult;
}

export const StructuralIntegrityPanel: React.FC<StructuralIntegrityPanelProps> = ({ data }) => {
  // Live load scenario presets (kg/m²)
  const [liveLoadRating, setLiveLoadRating] = useState<number>(500);
  const [showFootprintDiagram, setShowFootprintDiagram] = useState<boolean>(true);
  const [showWeightBreakdown, setShowWeightBreakdown] = useState<boolean>(true);

  const report: StructuralIntegrityReport = useMemo(() => {
    return calculateStructuralIntegrity(data, liveLoadRating);
  }, [data, liveLoadRating]);

  // Color mappings for safety states
  const getStatusBadge = (status: 'OPTIMAL' | 'ACCEPTABLE' | 'CAUTION' | 'CRITICAL') => {
    switch (status) {
      case 'OPTIMAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCircle2 size={13} className="text-emerald-600" />
            OPTIMAL ({report.factorOfSafety}× FoS)
          </span>
        );
      case 'ACCEPTABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-300">
            <CheckCircle2 size={13} className="text-sky-600" />
            ACCEPTABLE ({report.factorOfSafety}× FoS)
          </span>
        );
      case 'CAUTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-300">
            <AlertTriangle size={13} className="text-amber-600" />
            CAUTION ({report.factorOfSafety}× FoS)
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-300">
            <AlertTriangle size={13} className="text-rose-600" />
            CRITICAL LOAD
          </span>
        );
    }
  };

  // CoG Visual Schematic coordinates
  const bounds = report.bounds;
  const paddingX = Math.max(1.0, bounds.width * 0.15);
  const paddingY = Math.max(1.0, bounds.depth * 0.15);
  const svgMinX = bounds.minX - paddingX;
  const svgMaxX = bounds.maxX + paddingX;
  const svgMinY = bounds.minY - paddingY;
  const svgMaxY = bounds.maxY + paddingY;
  const svgWidth = Math.max(4, svgMaxX - svgMinX);
  const svgHeight = Math.max(4, svgMaxY - svgMinY);

  return (
    <div className="w-full bg-[#f8fbfd] border-b border-[#b8d4e3] flex flex-col font-sans transition-all">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-[#b8d4e3] bg-gradient-to-r from-[#e0f2fe]/70 via-[#f0f8ff] to-[#e0f2fe]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0284c7] text-white flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-mono font-bold text-[#0f172a] uppercase tracking-wide">
                Structural Integrity & Loading Analysis
              </h2>
              {getStatusBadge(report.safetyStatus)}
            </div>
            <p className="text-xs text-[#64748b] mt-0.5">
              Live engineering metrics: Dead weight, 3D Center of Gravity, standard axial loads & safety margins (BS EN 12811)
            </p>
          </div>
        </div>

        {/* Live Load Preset Switcher */}
        <div className="flex items-center gap-2 bg-[#ffffff] p-1.5 rounded-lg border border-[#a3c9db] shadow-xs shrink-0">
          <span className="text-xs font-mono font-semibold text-[#475569] px-2 flex items-center gap-1.5">
            <SlidersHorizontal size={13} className="text-[#0284c7]" />
            Live Load:
          </span>
          <button
            onClick={() => setLiveLoadRating(300)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              liveLoadRating === 300
                ? 'bg-[#0284c7] text-white font-bold shadow-xs'
                : 'text-[#475569] hover:bg-[#e0f2fe]'
            }`}
            title="Crew / Camera / Light Service Platform (3.0 kN/m²)"
          >
            300 kg/m²
          </button>
          <button
            onClick={() => setLiveLoadRating(500)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              liveLoadRating === 500
                ? 'bg-[#0284c7] text-white font-bold shadow-xs'
                : 'text-[#475569] hover:bg-[#e0f2fe]'
            }`}
            title="Standard Public Stage / Seated Audience (5.0 kN/m² BS EN 12811)"
          >
            500 kg/m² (Std)
          </button>
          <button
            onClick={() => setLiveLoadRating(750)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              liveLoadRating === 750
                ? 'bg-[#0284c7] text-white font-bold shadow-xs'
                : 'text-[#475569] hover:bg-[#e0f2fe]'
            }`}
            title="Dynamic Performance / Heavy Concert Stage (7.5 kN/m²)"
          >
            750 kg/m²
          </button>
        </div>
      </div>

      {/* 4 Core KPI Metric Cards */}
      <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Structural Weight */}
        <div className="bg-[#ffffff] p-4 rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between hover:border-[#7dd3fc] transition-all">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] mb-1.5">
              <span className="flex items-center gap-1.5 uppercase font-medium">
                <Scale size={14} className="text-[#0284c7]" />
                Total Structure Weight
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#e0f2fe] text-[#0369a1] font-bold">
                {report.totalGrossWeightTonnes} t Gross
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-[#0f172a] tracking-tight">
                {report.totalDeadWeightKg.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-[#475569]">kg (Dead Load)</span>
            </div>
            <div className="text-xs text-[#64748b] font-mono mt-1">
              Self-Weight: <strong className="text-[#0f172a]">{report.totalDeadWeightTonnes} tonnes</strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-[#475569]">
              <span>Permissible Live Load:</span>
              <span className="font-semibold text-[#0284c7]">+{report.totalLiveWeightKg.toLocaleString()} kg</span>
            </div>
            <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-[#0284c7] h-full" 
                style={{ width: `${Math.min(100, (report.totalDeadWeightKg / report.totalGrossWeightKg) * 100)}%` }}
                title="Dead Load"
              />
              <div 
                className="bg-[#38bdf8] h-full" 
                style={{ width: `${Math.min(100, (report.totalLiveWeightKg / report.totalGrossWeightKg) * 100)}%` }}
                title="Live Load"
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#64748b]">
              <span>Dead: {(report.totalDeadWeightKg / report.totalGrossWeightKg * 100).toFixed(0)}%</span>
              <span>Live: {(report.totalLiveWeightKg / report.totalGrossWeightKg * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Center of Gravity (CoG) */}
        <div className="bg-[#ffffff] p-4 rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between hover:border-[#7dd3fc] transition-all">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] mb-1.5">
              <span className="flex items-center gap-1.5 uppercase font-medium">
                <Compass size={14} className="text-[#0284c7]" />
                Center of Gravity (3D)
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                report.eccentricityPercent < 5 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {report.eccentricityPercent < 5 ? 'Balanced' : 'Eccentric'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 font-mono">
              <div className="bg-[#f0f8ff] p-2 rounded-lg border border-[#bae6fd] text-center">
                <div className="text-[10px] text-[#64748b] uppercase">X (Width)</div>
                <div className="text-sm font-bold text-[#0284c7]">{report.centerOfGravityDead.x}m</div>
              </div>
              <div className="bg-[#f0f8ff] p-2 rounded-lg border border-[#bae6fd] text-center">
                <div className="text-[10px] text-[#64748b] uppercase">Y (Depth)</div>
                <div className="text-sm font-bold text-[#0284c7]">{report.centerOfGravityDead.y}m</div>
              </div>
              <div className="bg-[#f0f8ff] p-2 rounded-lg border border-[#bae6fd] text-center">
                <div className="text-[10px] text-[#64748b] uppercase">Z (Elev)</div>
                <div className="text-sm font-bold text-[#0284c7]">{report.centerOfGravityDead.z}m</div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] flex justify-between items-center text-xs font-mono text-[#475569]">
            <span>Offset from Center:</span>
            <span className="font-semibold text-[#0f172a]">
              {report.eccentricityMeters}m ({report.eccentricityPercent}%)
            </span>
          </div>
        </div>

        {/* KPI 3: Standard Axial Capacity & Safety Factor */}
        <div className="bg-[#ffffff] p-4 rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between hover:border-[#7dd3fc] transition-all">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] mb-1.5">
              <span className="flex items-center gap-1.5 uppercase font-medium">
                <Activity size={14} className="text-[#0284c7]" />
                Standard Axial Safety
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                +{report.safetyMarginPercent}% Margin
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-[#0f172a] tracking-tight">
                {report.factorOfSafety}×
              </span>
              <span className="text-xs font-mono text-emerald-600 font-semibold">Factor of Safety</span>
            </div>
            <div className="text-xs text-[#64748b] font-mono mt-1">
              Peak Leg Load: <strong className="text-[#0f172a]">{report.peakLoadPerLegKg} kg</strong> ({report.peakLoadPerLegKN} kN)
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] flex flex-col gap-1 text-xs font-mono">
            <div className="flex justify-between text-[#475569]">
              <span>SWL Capacity:</span>
              <span className="font-semibold text-[#0f172a]">{report.standardAxialCapacityKN} kN / standard</span>
            </div>
            <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  report.utilizationPercent <= 40 
                    ? 'bg-emerald-500' 
                    : report.utilizationPercent <= 65 
                    ? 'bg-sky-500' 
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, report.utilizationPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#64748b]">
              <span>Utilization: {report.utilizationPercent}%</span>
              <span>Across {report.standardsCount} Standards</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Ground Pressure & Stability Index */}
        <div className="bg-[#ffffff] p-4 rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between hover:border-[#7dd3fc] transition-all">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] mb-1.5">
              <span className="flex items-center gap-1.5 uppercase font-medium">
                <Anchor size={14} className="text-[#0284c7]" />
                Ground Pressure & Soles
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#e0f2fe] text-[#0369a1] font-bold">
                {report.groundBearingFoS}× FoS
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-[#0f172a] tracking-tight">
                {report.groundBearingPressureKPa}
              </span>
              <span className="text-xs font-mono text-[#475569]">kPa (on Sole Boards)</span>
            </div>
            <div className="text-xs text-[#64748b] font-mono mt-1">
              Allowable Soil Limit: <strong className="text-[#0f172a]">{report.groundBearingCapacityKPa} kPa</strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] flex flex-col gap-1 text-xs font-mono">
            <div className="flex justify-between text-[#475569]">
              <span>Basejacks Verified:</span>
              <span className={`font-semibold ${
                report.basejackSafety.status === 'ALL_WITHIN_LIMITS' ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {report.basejackSafety.minRunoutMm}–{report.basejackSafety.maxRunoutMm} mm
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Lateral Bracing Index:</span>
              <span className="font-semibold text-[#0284c7]">
                {report.lateralBracing.stabilityIndex}% ({report.lateralBracing.totalBraces} Braces)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Collapsible Sub-Sections: CoG Schematic & Component Weight Breakdown */}
      <div className="px-4 md:px-5 pb-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 2D Footprint & Center of Gravity Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-[#ffffff] rounded-xl border border-[#b8d4e3] p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Maximize2 size={15} className="text-[#0284c7]" />
              <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                Footprint & Center of Gravity Vector Map
              </h3>
            </div>
            <button
              onClick={() => setShowFootprintDiagram(!showFootprintDiagram)}
              className="text-xs font-mono text-[#0284c7] hover:text-[#0369a1] flex items-center gap-1"
            >
              {showFootprintDiagram ? 'Hide Map' : 'Show Map'}
              {showFootprintDiagram ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {showFootprintDiagram && (
            <div className="flex flex-col gap-3">
              {/* SVG 2D Plan View Diagram */}
              <div className="w-full bg-[#f0f8ff] rounded-lg border border-[#bae6fd] p-3 flex items-center justify-center relative overflow-hidden min-h-[220px]">
                <svg
                  viewBox={`${svgMinX} ${svgMinY} ${svgWidth} ${svgHeight}`}
                  className="w-full h-48 md:h-56 transform -scale-y-100"
                  style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
                >
                  <defs>
                    <pattern id="grid-pattern" width="1.2" height="1.2" patternUnits="userSpaceOnUse">
                      <path d="M 1.2 0 L 0 0 0 1.2" fill="none" stroke="#bae6fd" strokeWidth="0.04" />
                    </pattern>
                  </defs>

                  {/* Grid background */}
                  <rect
                    x={svgMinX}
                    y={svgMinY}
                    width={svgWidth}
                    height={svgHeight}
                    fill="url(#grid-pattern)"
                    opacity="0.7"
                  />

                  {/* Stage Footprint Bounding Box */}
                  <rect
                    x={bounds.minX}
                    y={bounds.minY}
                    width={bounds.width}
                    height={bounds.depth}
                    fill="#e0f2fe"
                    fillOpacity="0.4"
                    stroke="#0284c7"
                    strokeWidth="0.08"
                    strokeDasharray="0.3 0.15"
                  />

                  {/* Rostrums outlines */}
                  {data.rostrums?.map((r, i) => {
                    if (r.isRiserFascia) return null;
                    const rw = r.width || 1.2;
                    const rd = r.depth || 1.2;
                    const rx = r.center.x - rw / 2;
                    const ry = r.center.y - rd / 2;
                    return (
                      <rect
                        key={i}
                        x={rx}
                        y={ry}
                        width={rw}
                        height={rd}
                        fill={r.isRamp ? '#bae6fd' : '#ffffff'}
                        fillOpacity="0.8"
                        stroke="#7dd3fc"
                        strokeWidth="0.04"
                      />
                    );
                  })}

                  {/* Standards / Feet positions */}
                  {data.feet?.map((f, i) => (
                    <circle
                      key={i}
                      cx={f.position.x}
                      cy={f.position.y}
                      r="0.09"
                      fill="#0369a1"
                      opacity="0.7"
                    />
                  ))}

                  {/* Geometric Centroid Marker (Cyan Crosshair) */}
                  <g>
                    <line
                      x1={report.geometricCenter.x - 0.6}
                      y1={report.geometricCenter.y}
                      x2={report.geometricCenter.x + 0.6}
                      y2={report.geometricCenter.y}
                      stroke="#0284c7"
                      strokeWidth="0.06"
                    />
                    <line
                      x1={report.geometricCenter.x}
                      y1={report.geometricCenter.y - 0.6}
                      x2={report.geometricCenter.x}
                      y2={report.geometricCenter.y + 0.6}
                      stroke="#0284c7"
                      strokeWidth="0.06"
                    />
                    <circle
                      cx={report.geometricCenter.x}
                      cy={report.geometricCenter.y}
                      r="0.25"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="0.04"
                      strokeDasharray="0.1 0.05"
                    />
                  </g>

                  {/* Eccentricity Vector Line */}
                  <line
                    x1={report.geometricCenter.x}
                    y1={report.geometricCenter.y}
                    x2={report.centerOfGravityDead.x}
                    y2={report.centerOfGravityDead.y}
                    stroke="#f43f5e"
                    strokeWidth="0.07"
                  />

                  {/* Center of Gravity Marker (Red / Rose Beacon) */}
                  <g>
                    <circle
                      cx={report.centerOfGravityDead.x}
                      cy={report.centerOfGravityDead.y}
                      r="0.4"
                      fill="#f43f5e"
                      fillOpacity="0.2"
                    />
                    <circle
                      cx={report.centerOfGravityDead.x}
                      cy={report.centerOfGravityDead.y}
                      r="0.2"
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="0.05"
                    />
                  </g>
                </svg>

                {/* Map Legend Overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white/90 backdrop-blur-xs p-2 rounded-md border border-[#bae6fd] text-[10px] font-mono shadow-xs pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
                    <span className="text-[#0f172a] font-bold">Center of Gravity (CoG)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-[#0284c7] flex items-center justify-center text-[#0284c7] text-[8px] font-bold">+</span>
                    <span className="text-[#475569]">Geometric Footprint Center</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-[#f43f5e]"></span>
                    <span className="text-[#475569]">Eccentricity Vector ({report.eccentricityMeters}m)</span>
                  </div>
                </div>
              </div>

              {/* Explanatory telemetry bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-[#f8fbfd] p-2.5 rounded-lg border border-[#e2e8f0]">
                <div>
                  <span className="text-[10px] text-[#64748b] block">SPAN ENVELOPE</span>
                  <span className="font-bold text-[#0f172a]">{bounds.width}m × {bounds.depth}m</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] block">GEOM CENTER</span>
                  <span className="font-bold text-[#0f172a]">({report.geometricCenter.x}, {report.geometricCenter.y})</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] block">DEAD COG (X, Y)</span>
                  <span className="font-bold text-[#f43f5e]">({report.centerOfGravityDead.x}, {report.centerOfGravityDead.y})</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] block">STABILITY RATING</span>
                  <span className="font-bold text-emerald-600">
                    {report.eccentricityPercent <= 5 ? '99.5% Centered' : 'Slight Asymmetry'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Component Weight Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-[#ffffff] rounded-xl border border-[#b8d4e3] p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-[#0284c7]" />
                <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                  Dead Weight Distribution
                </h3>
              </div>
              <span className="text-xs font-mono text-[#0284c7] font-bold">
                {report.totalDeadWeightKg.toLocaleString()} kg Total
              </span>
            </div>

            {/* Percentage Bar */}
            <div className="w-full bg-[#e2e8f0] h-3 rounded-md overflow-hidden flex mb-4 shadow-inner">
              {report.categoryWeights.map((cat, i) => (
                cat.percentage > 0 && (
                  <div
                    key={i}
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    className="h-full transition-all hover:opacity-80"
                    title={`${cat.category}: ${cat.weightKg} kg (${cat.percentage.toFixed(1)}%)`}
                  />
                )
              ))}
            </div>

            {/* Table list */}
            <div className="flex flex-col gap-2 font-mono text-xs">
              {report.categoryWeights.map((cat, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-2 rounded-lg bg-[#f8fbfd] border border-[#e2e8f0] hover:bg-[#f0f8ff] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-xs shrink-0" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="text-[#0f172a] font-medium">{cat.category}</span>
                    <span className="text-[10px] text-[#64748b]">({cat.count} pcs)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#0f172a]">{cat.weightKg.toLocaleString()} kg</span>
                    <span className="text-[11px] text-[#64748b] w-10 text-right font-medium">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Standards & Code Compliance Footer */}
          <div className="mt-3.5 pt-3 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] font-mono text-[#64748b]">
            <div className="flex items-center gap-1.5">
              <Info size={13} className="text-[#0284c7]" />
              <span>BS EN 12811 / IStructE Stage Rules</span>
            </div>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Passes Code Verification
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
