import React from 'react';
import { DeckCalculationResult } from '../types';

interface StatsPanelProps {
  data: DeckCalculationResult;
  isValid: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ data, isValid }) => {
  return (
    <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-3 md:gap-4">
      
      {/* Primary KPI - HUD Style */}
      <div className={`relative overflow-hidden p-4 md:p-6 rounded-xl border transition-all duration-500 group shadow-sm ${isValid ? 'bg-white border-[#bfdbfe]' : 'bg-[#fef2f2] border-[#fecaca]'}`}>
        
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #2563eb 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-[10px] font-bold text-[#2563eb] uppercase tracking-[0.2em] mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]"></span>
            Quantities
          </h3>
          
          <div className="flex flex-col gap-3 md:gap-4">
            
            {/* Standard Rostrums */}
            <div className="flex justify-between items-end border-b border-[#e5e7eb] pb-2 md:pb-3">
               <div className="flex flex-col">
                 <span className="text-[10px] text-[#6b7280] font-semibold mb-1 uppercase tracking-wider">Full Deck Panels (1.2m x 2.4m)</span>
                 <span className="text-2xl md:text-4xl font-black text-[#111827] font-mono tracking-tighter leading-none">
                    {data.fullRostrumsCount}
                 </span>
               </div>
               <div className="text-[10px] text-[#9ca3af] font-bold mb-1 uppercase">Units</div>
            </div>

            {/* Half Rostrums */}
            <div className="flex justify-between items-end">
               <div className="flex flex-col">
                 <span className="text-[10px] text-[#6b7280] font-semibold mb-1 uppercase tracking-wider">Half Deck Panels (1.2m x 1.2m)</span>
                 <span className={`text-2xl md:text-4xl font-black font-mono tracking-tighter leading-none ${data.halfRostrumsCount > 0 ? 'text-[#111827]' : 'text-[#d1d5db]'}`}>
                    {data.halfRostrumsCount}
                 </span>
               </div>
               <div className="text-[10px] text-[#9ca3af] font-bold mb-1 uppercase">Units</div>
            </div>

          </div>

          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[#e5e7eb] flex justify-between items-center">
            <span className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider">Confidence</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isValid ? 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]' : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'}`}>
              {isValid ? 'VALID' : 'ERROR'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Components List - More compact grid for mobile */}
      <div className="flex flex-col gap-2">
         <h4 className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest px-1">Base Components</h4>
         <div className="grid grid-cols-2 gap-2 md:gap-3">
            <StatCard label="Basejacks" value={data.calculatedFeetCount} unit="" />
            <StatCard label="Woodblocks 300mm x 300mm" value={data.calculatedFeetCount} unit="" highlight />
         </div>
      </div>

      {/* Dimensions Grid */}
      <div className="flex flex-col gap-2">
         <h4 className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest px-1">Deck Size</h4>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
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
  <div className={`p-2 md:p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 shadow-sm ${highlight ? 'bg-[#eff6ff] border-[#bfdbfe]' : 'bg-white border-[#e5e7eb]'}`}>
    <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1 truncate font-semibold">{label}</div>
    <div className="text-sm md:text-lg font-bold text-[#111827] font-mono leading-none">
      {value}<span className="text-xs text-[#9ca3af] ml-1">{unit}</span>
    </div>
  </div>
);
