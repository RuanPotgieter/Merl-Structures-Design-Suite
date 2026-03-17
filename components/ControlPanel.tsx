import React from 'react';
import { TerrainConfig, RampConfig } from '../types';

interface PropertiesPanelProps {
  selection: { type: string; id: string; data: any } | null;
  targetWidth: number;
  targetDepth: number;
  onWidthChange: (val: number) => void;
  onDepthChange: (val: number) => void;
  terrain: TerrainConfig;
  onTerrainChange: (t: TerrainConfig) => void;
  ramps: RampConfig[];
  onRampsChange: (r: RampConfig[]) => void;
}

const PropRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between py-2 border-b border-cyan-900/20 hover:bg-cyan-950/20 transition-colors px-4">
    <span className="text-[10px] text-cyan-500/60 font-black uppercase tracking-widest">{label}</span>
    <div className="w-[120px]">{children}</div>
  </div>
);

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-4 py-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] bg-cyan-950/30 border-y border-cyan-900/30 mt-4">
    {label}
  </div>
);

const NumberInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <input
    type="number"
    className="bg-black/50 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] px-2 py-1 w-full outline-none focus:border-cyan-500 focus:bg-cyan-950/40 transition-all rounded"
    value={value}
    step="0.1"
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
  />
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selection, targetWidth, targetDepth, onWidthChange, onDepthChange,
  terrain, onTerrainChange, ramps, onRampsChange,
}) => {
  
  return (
    <div className="flex flex-col h-full bg-transparent select-none">
      <div className="flex-1 pb-10">
        {selection ? (
           <>
              <SectionHeader label="Identity" />
              <PropRow label="Object ID"><span className="text-[10px] font-mono text-white/80">{selection.id}</span></PropRow>
              <PropRow label="Status"><span className="text-[9px] font-bold text-green-400 uppercase animate-pulse">Synced</span></PropRow>

              {selection.type === 'ROSTRUM' && (
                 <>
                   <SectionHeader label="Geometry" />
                   <PropRow label="Elev (Z)"><span className="text-[11px] font-mono text-white">{selection.data.startElevation?.toFixed(3)}m</span></PropRow>
                   <PropRow label="Grid X"><span className="text-[11px] font-mono text-white">{selection.data.gridCol}</span></PropRow>
                   <PropRow label="Grid Y"><span className="text-[11px] font-mono text-white">{selection.data.gridRow}</span></PropRow>
                 </>
              )}

              {selection.type === 'STANDARD_STACK' && (
                 <>
                   <SectionHeader label="Structural" />
                   <PropRow label="Height"><span className="text-[11px] font-mono text-white">{selection.data.totalHeight?.toFixed(3)}m</span></PropRow>
                   <PropRow label="Components"><span className="text-[11px] font-mono text-white">{selection.data.standards?.length || 1} Parts</span></PropRow>
                   <PropRow label="Jack Ext."><span className="text-[11px] font-mono text-cyan-400">{(selection.data.jackExtension || 0).toFixed(3)}m</span></PropRow>
                 </>
              )}
           </>
        ) : (
            <>
              <SectionHeader label="Deck Dimensions" />
              <PropRow label="Deck Width (m)"><NumberInput value={targetWidth} onChange={onWidthChange} /></PropRow>
              <PropRow label="Deck Depth (m)"><NumberInput value={targetDepth} onChange={onDepthChange} /></PropRow>

              <SectionHeader label="Deck Height" />
              <PropRow label="Height from Ground (m)"><NumberInput value={terrain.deckHeight} onChange={v => onTerrainChange({...terrain, deckHeight: v})} /></PropRow>
              
              <SectionHeader label="Ground Slopes" />
              <PropRow label="Right Side Slope (m)"><NumberInput value={terrain.groundOffsets.widthEnd} onChange={v => onTerrainChange({...terrain, groundOffsets: { ...terrain.groundOffsets, widthEnd: v }})} /></PropRow>
              <PropRow label="Back Side Slope (m)"><NumberInput value={terrain.groundOffsets.depthEnd} onChange={v => onTerrainChange({...terrain, groundOffsets: { ...terrain.groundOffsets, depthEnd: v }})} /></PropRow>
              <PropRow label="Back Right Slope (m)"><NumberInput value={terrain.groundOffsets.diagonal} onChange={v => onTerrainChange({...terrain, groundOffsets: { ...terrain.groundOffsets, diagonal: v }})} /></PropRow>

              <SectionHeader label="Accessories" />
              <div className="p-4 space-y-2">
                <button 
                  onClick={() => onRampsChange([...ramps, { id: Math.random().toString(), side: 'bottom', offset: 0, width: 1.2 }])}
                  className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black uppercase text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all"
                >
                  + Add Ramp
                </button>
              </div>

              {ramps.map((ramp, i) => (
                 <div key={ramp.id} className="mx-4 mt-2 bg-black/40 border border-cyan-900/40 rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center bg-cyan-900/20 px-3 py-1.5 border-b border-cyan-900/40">
                       <span className="text-[9px] font-black uppercase text-white/60">RAMP_SYS.{i+1}</span>
                       <button onClick={() => onRampsChange(ramps.filter(r => r.id !== ramp.id))} className="text-red-500 hover:text-white transition-colors">✕</button>
                    </div>
                    <div className="py-1">
                      <PropRow label="Side">
                         <select className="bg-black border border-cyan-500/20 text-cyan-400 text-[10px] p-1 w-full outline-none rounded" value={ramp.side} onChange={e => onRampsChange(ramps.map(r => r.id === ramp.id ? { ...r, side: e.target.value as any } : r))}>
                            {['top','bottom','left','right'].map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                      </PropRow>
                      <PropRow label="Width"><NumberInput value={ramp.width} onChange={v => onRampsChange(ramps.map(r => r.id === ramp.id ? { ...r, width: v } : r))} /></PropRow>
                    </div>
                 </div>
              ))}
           </>
        )}
      </div>
    </div>
  );
};
