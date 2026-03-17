import React from 'react';
import { DeckCalculationResult } from '../types';

interface StatsPanelProps {
  data: DeckCalculationResult;
  isValid: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ data, isValid }) => {
  return (
    <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3 md:gap-4">
      
      {/* Primary KPI - HUD Style */}
      <div className={`relative overflow-hidden p-4 md:p-6 rounded-2xl border transition-all duration-500 group ${isValid ? 'bg-cyan-900/10 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'bg-red-950/30 border-red-900/50'}`}>
        
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #22d3ee 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-[9px] md:text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"></span>
            Quantities
          </h3>
          
          <div className="flex flex-col gap-3 md:gap-4">
            
            {/* Standard Rostrums */}
            <div className="flex justify-between items-end border-b border-cyan-500/20 pb-2 md:pb-3">
               <div className="flex flex-col">
                 <span className="text-[9px] md:text-[10px] text-cyan-300/60 font-mono mb-1 uppercase tracking-wider">Full Deck Panels (1.2m x 2.4m)</span>
                 <span className="text-2xl md:text-4xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] leading-none">
                    {data.fullRostrumsCount}
                 </span>
               </div>
               <div className="text-[8px] md:text-[10px] text-cyan-500/50 font-bold mb-1 uppercase">Units</div>
            </div>

            {/* Half Rostrums */}
            <div className="flex justify-between items-end">
               <div className="flex flex-col">
                 <span className="text-[9px] md:text-[10px] text-cyan-300/60 font-mono mb-1 uppercase tracking-wider">Half Deck Panels (1.2m x 1.2m)</span>
                 <span className={`text-2xl md:text-4xl font-black font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] leading-none ${data.halfRostrumsCount > 0 ? 'text-white' : 'text-neutral-700'}`}>
                    {data.halfRostrumsCount}
                 </span>
               </div>
               <div className="text-[8px] md:text-[10px] text-cyan-500/50 font-bold mb-1 uppercase">Units</div>
            </div>

          </div>

          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-cyan-500/20 flex justify-between items-center">
            <span className="text-[8px] md:text-[10px] text-cyan-300/50 font-mono uppercase tracking-tighter">Confidence</span>
            <span className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded ${isValid ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/30' : 'bg-red-950 text-red-400 border border-red-900'}`}>
              {isValid ? 'VALID' : 'ERROR'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Components List - More compact grid for mobile */}
      <div className="flex flex-col gap-2">
         <h4 className="text-[9px] md:text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Base Components</h4>
         <div className="grid grid-cols-2 gap-2 md:gap-3">
            <StatCard label="Basejacks" value={data.calculatedFeetCount} unit="" />
            <StatCard label="Woodblocks 300mm x 300mm" value={data.calculatedFeetCount} unit="" highlight />
         </div>
      </div>

      {/* Dimensions Grid */}
      <div className="flex flex-col gap-2">
         <h4 className="text-[9px] md:text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Deck Size</h4>
         <div className="grid grid-cols-2 xs:grid-cols-4 lg:grid-cols-2 gap-2 md:gap-3">
            <StatCard label="Vertical Poles" value={data.calculatedFeetCount} unit="" />
            <StatCard label="Area" value={data.totalArea.toFixed(1)} unit="m²" />
            <StatCard label="Width" value={data.dimensions.width.toFixed(1)} unit="m" />
            <StatCard label="Length" value={data.dimensions.depth.toFixed(1)} unit="m" />
         </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string | number, unit: string, highlight?: boolean }> = ({ label, value, unit, highlight }) => (
  <div className={`p-2 md:p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 ${highlight ? 'bg-cyan-900/20 border-cyan-500/40' : 'bg-neutral-900/50 border-cyan-500/20'}`}>
    <div className="text-[8px] md:text-[10px] text-cyan-300/60 uppercase tracking-wide mb-1 truncate">{label}</div>
    <div className="text-sm md:text-lg font-bold text-neutral-200 font-mono leading-none">
      {value}<span className="text-[10px] md:text-xs text-cyan-500/70 ml-1">{unit}</span>
    </div>
  </div>
);
