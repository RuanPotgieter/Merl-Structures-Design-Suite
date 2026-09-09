import React from 'react';
import { DeckCalculationResult } from '../types';

interface StatsPanelProps {
  data: DeckCalculationResult;
  isValid: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ data, isValid }) => {
  return (
    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-3.5">
      {/* Primary KPI - Structural Solved Card */}
      <div className={`p-4 md:p-5 rounded-xl border transition-all duration-300 shadow-md ${
        isValid 
          ? 'bg-[#13161f] border-[#242938]' 
          : 'bg-[#1c1417] border-[#ef4444]/30'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isValid ? 'bg-amber-400' : 'bg-red-400'}`}></span>
              <h3 className="text-[11px] font-mono font-bold text-[#cbd5e1] uppercase tracking-wider">
                Panel Inventory Summary
              </h3>
            </div>
            <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${
              isValid 
                ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' 
                : 'bg-red-500/15 text-red-400 border-red-500/30'
            }`}>
              {isValid ? 'STRUCTURALLY SOLVED' : 'ERROR DETECTED'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Standard Rostrums */}
            <div className="flex justify-between items-end bg-[#161a25] p-3 rounded-lg border border-[#272d3c]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8e9cb2] font-mono font-medium uppercase tracking-wide">
                  Full Deck Panels (1.2m × 2.4m)
                </span>
                <span className="text-2xl md:text-3xl font-bold text-[#f8fafc] font-mono tracking-tight leading-none mt-1">
                  {data.fullRostrumsCount}
                </span>
              </div>
              <div className="text-[10px] text-[#64748b] font-mono font-semibold uppercase">Units</div>
            </div>

            {/* Half Rostrums */}
            <div className="flex justify-between items-end bg-[#161a25] p-3 rounded-lg border border-[#272d3c]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8e9cb2] font-mono font-medium uppercase tracking-wide">
                  Half Deck Panels (1.2m × 1.2m)
                </span>
                <span className={`text-2xl md:text-3xl font-bold font-mono tracking-tight leading-none mt-1 ${
                  data.halfRostrumsCount > 0 ? 'text-amber-400' : 'text-[#64748b]'
                }`}>
                  {data.halfRostrumsCount}
                </span>
              </div>
              <div className="text-[10px] text-[#64748b] font-mono font-semibold uppercase">Units</div>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[#232734] flex justify-between items-center text-xs font-mono">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider">Solver Metric</span>
            <span className="text-[10px] text-[#94a3b8] font-medium">Standard Kwikstage Bays</span>
          </div>
        </div>
      </div>

      {/* Hardware Components List */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[10px] font-mono font-semibold text-[#8e9cb2] uppercase tracking-wider px-1 flex items-center gap-1.5">
          <span className="text-amber-400">§</span>
          <span>Base Infrastructure</span>
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Basejacks" value={data.calculatedFeetCount} unit="Units" />
          <StatCard label="Woodblocks 300×300" value={data.calculatedFeetCount} unit="Units" highlight />
        </div>
      </div>

      {/* Dimensions Grid */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[10px] font-mono font-semibold text-[#8e9cb2] uppercase tracking-wider px-1 flex items-center gap-1.5">
          <span className="text-amber-400">§</span>
          <span>Envelope Dimensions</span>
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard label="Standards" value={data.calculatedFeetCount} unit="" />
          <StatCard label="Surface Area" value={data.totalArea.toFixed(1)} unit="m²" />
          <StatCard label="Span Width" value={data.dimensions.width.toFixed(1)} unit="m" />
          <StatCard label="Run Length" value={data.dimensions.depth.toFixed(1)} unit="m" />
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; unit: string; highlight?: boolean }> = ({
  label,
  value,
  unit,
  highlight,
}) => (
  <div
    className={`p-3 rounded-lg border flex flex-col justify-between transition-all duration-200 shadow-sm ${
      highlight
        ? 'bg-[#181c27] border-amber-400/40 text-amber-300'
        : 'bg-[#13161f] border-[#242938] hover:border-[#353d52]'
    }`}
  >
    <div className="text-[9px] text-[#8e9cb2] uppercase tracking-wider mb-1 truncate font-mono font-medium">
      {label}
    </div>
    <div className="text-sm md:text-base font-bold text-[#f8fafc] font-mono leading-none flex items-baseline gap-1">
      {value}
      <span className="text-[10px] text-[#64748b] font-normal">{unit}</span>
    </div>
  </div>
);
