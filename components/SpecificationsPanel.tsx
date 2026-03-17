import React, { useState } from 'react';
import { DeckConfig, RampConfig, HandrailConfig, TerrainConfig } from '../types';

interface SpecificationsPanelProps {
  decks: DeckConfig[];
  onDecksChange: (decks: DeckConfig[]) => void;
  ramps: RampConfig[];
  onRampsChange: (ramps: RampConfig[]) => void;
  handrails: HandrailConfig[];
  onHandrailsChange: (handrails: HandrailConfig[]) => void;
  onComplete: () => void;
}

const NumberInput: React.FC<{ value: number | ''; onChange: (v: number | '') => void, label: string }> = ({ value, onChange, label }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] text-cyan-500/60 font-black uppercase tracking-widest">{label}</label>
    <input
      type="number"
      className="bg-black/50 border border-cyan-500/20 text-cyan-400 font-mono text-[13px] px-3 py-2 w-full outline-none focus:border-cyan-500 focus:bg-cyan-950/40 transition-all rounded"
      value={value}
      step="0.1"
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === '' ? '' : parseFloat(val));
      }}
    />
  </div>
);

const SelectInput: React.FC<{ value: string; onChange: (v: string) => void, label: string, options: {value: string, label: string}[] }> = ({ value, onChange, label, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] text-cyan-500/60 font-black uppercase tracking-widest">{label}</label>
    <select
      className="bg-black/50 border border-cyan-500/20 text-cyan-400 font-mono text-[13px] px-3 py-2 w-full outline-none focus:border-cyan-500 focus:bg-cyan-950/40 transition-all rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const SpecificationsPanel: React.FC<SpecificationsPanelProps> = ({
  decks, onDecksChange, ramps, onRampsChange, handrails, onHandrailsChange, onComplete
}) => {
  const [activeTab, setActiveTab] = useState<'decks' | 'rakings' | 'ramps' | 'handrails' | 'landings'>('decks');

  const addDeck = () => {
    const newDeck: DeckConfig = {
      id: `deck-${decks.length + 1}`,
      width: 4.8,
      depth: 4.8,
      originX: 0,
      originZ: 0,
      orientation: 0,
      terrain: {
        deckHeight: 2.0,
        groundOffsets: { origin: 0, widthEnd: 0, depthEnd: 0, diagonal: 0 }
      }
    };
    onDecksChange([...decks, newDeck]);
  };

  const updateDeck = (id: string, updates: Partial<DeckConfig>) => {
    onDecksChange(decks.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const updateTerrain = (id: string, updates: Partial<TerrainConfig>) => {
    onDecksChange(decks.map(d => d.id === id ? { ...d, terrain: { ...d.terrain, ...updates } } : d));
  };

  const updateGroundOffsets = (id: string, updates: Partial<TerrainConfig['groundOffsets']>) => {
    onDecksChange(decks.map(d => d.id === id ? { ...d, terrain: { ...d.terrain, groundOffsets: { ...d.terrain.groundOffsets, ...updates } } } : d));
  };

  const removeDeck = (id: string) => {
    onDecksChange(decks.filter(d => d.id !== id));
    // Also remove associated ramps and handrails
    onRampsChange(ramps.filter(r => r.deckId !== id));
    onHandrailsChange(handrails.filter(h => h.deckId !== id));
  };

  const addRamp = (deckId: string) => {
    const newRamp: RampConfig = {
      id: `ramp-${Math.random().toString(36).substr(2, 9)}`,
      deckId,
      side: 'bottom',
      corner: 'bottomLeft',
      offset: 0,
      width: 1.2,
      length: 2.4,
      landingPads: []
    };
    onRampsChange([...ramps, newRamp]);
  };

  const updateRamp = (id: string, updates: Partial<RampConfig>) => {
    onRampsChange(ramps.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRamp = (id: string) => {
    onRampsChange(ramps.filter(r => r.id !== id));
  };

  const addLandingPad = (rampId: string) => {
    onRampsChange(ramps.map(r => {
      if (r.id === rampId) {
        const newPad = { id: `lp-${Math.random().toString(36).substr(2, 9)}`, offset: 0, length: 1.2 };
        return { ...r, landingPads: [...(r.landingPads || []), newPad] };
      }
      return r;
    }));
  };

  const updateLandingPad = (rampId: string, padId: string, updates: Partial<{offset: number, length: number}>) => {
    onRampsChange(ramps.map(r => {
      if (r.id === rampId) {
        return {
          ...r,
          landingPads: (r.landingPads || []).map(p => p.id === padId ? { ...p, ...updates } : p)
        };
      }
      return r;
    }));
  };

  const removeLandingPad = (rampId: string, padId: string) => {
    onRampsChange(ramps.map(r => {
      if (r.id === rampId) {
        return { ...r, landingPads: (r.landingPads || []).filter(p => p.id !== padId) };
      }
      return r;
    }));
  };

  const addHandrail = (deckId: string) => {
    const newHandrail: HandrailConfig = {
      id: `hr-${Math.random().toString(36).substr(2, 9)}`,
      deckId,
      side: 'top',
      corner: 'topLeft',
      offset: 0,
      length: 2.4,
      type: 'standard'
    };
    onHandrailsChange([...handrails, newHandrail]);
  };

  const updateHandrail = (id: string, updates: Partial<HandrailConfig>) => {
    onHandrailsChange(handrails.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const removeHandrail = (id: string) => {
    onHandrailsChange(handrails.filter(h => h.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 h-full">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-2">Specifications</h2>
          <div className="hud-line mb-3"></div>
          <p className="text-white/40 text-xs max-w-lg leading-relaxed font-mono italic">
            Configure your decks and access ramps. Add multiple decks with independent origins, orientations, and terrain elevations.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('decks')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded ${activeTab === 'decks' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white'}`}>Decks</button>
        <button onClick={() => setActiveTab('rakings')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded ${activeTab === 'rakings' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white'}`}>Rakings</button>
        <button onClick={() => setActiveTab('ramps')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded ${activeTab === 'ramps' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white'}`}>Ramps</button>
        <button onClick={() => setActiveTab('handrails')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded ${activeTab === 'handrails' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white'}`}>Handrails</button>
        <button onClick={() => setActiveTab('landings')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded ${activeTab === 'landings' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white'}`}>Landings</button>
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2">
        {activeTab === 'decks' && decks.filter(d => d.type !== 'raking').map((deck, i) => (
          <div key={deck.id} className="glass-panel rounded-lg border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base font-display font-black text-white uppercase tracking-widest">Deck {i + 1} <span className="text-white/30 text-xs ml-2">({deck.id})</span></h3>
              {decks.length > 1 && (
                <button onClick={() => removeDeck(deck.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-widest">Remove Deck</button>
              )}
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 border-b border-white/10 pb-1.5">Dimensions & Position</h4>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <SelectInput 
                    label="Deck Type" 
                    value={deck.type || 'standard'} 
                    onChange={v => updateDeck(deck.id, { type: v as any })}
                    options={[{value: 'standard', label: 'Standard'}, {value: 'raking', label: 'Raking'}]}
                  />
                  <NumberInput label="Depth (m)" value={deck.depth} onChange={v => updateDeck(deck.id, { depth: v })} />
                  <NumberInput label="Width (m)" value={deck.width} onChange={v => updateDeck(deck.id, { width: v })} />
                  <NumberInput label="Origin X (m)" value={deck.originX} onChange={v => updateDeck(deck.id, { originX: v })} />
                  <NumberInput label="Origin Z (m)" value={deck.originZ} onChange={v => updateDeck(deck.id, { originZ: v })} />
                  <NumberInput label="Orientation (deg)" value={deck.orientation} onChange={v => updateDeck(deck.id, { orientation: v })} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 border-b border-white/10 pb-1.5">Elevations & Terrain</h4>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <NumberInput label="Datum Height (m)" value={deck.terrain.deckHeight} onChange={v => updateTerrain(deck.id, { deckHeight: v })} />
                  <NumberInput label="Origin Ground Offset" value={deck.terrain.groundOffsets.origin} onChange={v => updateGroundOffsets(deck.id, { origin: v })} />
                  <NumberInput label="Width End Ground Offset" value={deck.terrain.groundOffsets.widthEnd} onChange={v => updateGroundOffsets(deck.id, { widthEnd: v })} />
                  <NumberInput label="Depth End Ground Offset" value={deck.terrain.groundOffsets.depthEnd} onChange={v => updateGroundOffsets(deck.id, { depthEnd: v })} />
                  <NumberInput label="Diagonal Ground Offset" value={deck.terrain.groundOffsets.diagonal} onChange={v => updateGroundOffsets(deck.id, { diagonal: v })} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'rakings' && decks.filter(d => d.type === 'raking').map((deck, i) => (
          <div key={deck.id} className="glass-panel rounded-lg border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base font-display font-black text-white uppercase tracking-widest">Raking Deck {i + 1} <span className="text-white/30 text-xs ml-2">({deck.id})</span></h3>
              {decks.length > 1 && (
                <button onClick={() => removeDeck(deck.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-widest">Remove Deck</button>
              )}
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 border-b border-white/10 pb-1.5">Dimensions & Position</h4>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <SelectInput 
                    label="Deck Type" 
                    value={deck.type || 'standard'} 
                    onChange={v => updateDeck(deck.id, { type: v as any })}
                    options={[{value: 'standard', label: 'Standard'}, {value: 'raking', label: 'Raking'}]}
                  />
                  <NumberInput label="Tiers" value={deck.tiers || 3} onChange={v => updateDeck(deck.id, { tiers: v as number })} />
                  <NumberInput label="Width (m)" value={deck.width} onChange={v => updateDeck(deck.id, { width: v })} />
                  <NumberInput label="Origin X (m)" value={deck.originX} onChange={v => updateDeck(deck.id, { originX: v })} />
                  <NumberInput label="Origin Z (m)" value={deck.originZ} onChange={v => updateDeck(deck.id, { originZ: v })} />
                  <NumberInput label="Orientation (deg)" value={deck.orientation} onChange={v => updateDeck(deck.id, { orientation: v })} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 border-b border-white/10 pb-1.5">Elevations & Terrain</h4>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <NumberInput label="Datum Height (m)" value={deck.terrain.deckHeight} onChange={v => updateTerrain(deck.id, { deckHeight: v })} />
                  <NumberInput label="Origin Ground Offset" value={deck.terrain.groundOffsets.origin} onChange={v => updateGroundOffsets(deck.id, { origin: v })} />
                  <NumberInput label="Width End Ground Offset" value={deck.terrain.groundOffsets.widthEnd} onChange={v => updateGroundOffsets(deck.id, { widthEnd: v })} />
                  <NumberInput label="Depth End Ground Offset" value={deck.terrain.groundOffsets.depthEnd} onChange={v => updateGroundOffsets(deck.id, { depthEnd: v })} />
                  <NumberInput label="Diagonal Ground Offset" value={deck.terrain.groundOffsets.diagonal} onChange={v => updateGroundOffsets(deck.id, { diagonal: v })} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'ramps' && decks.map((deck, i) => (
          <div key={deck.id} className="glass-panel rounded-lg border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base font-display font-black text-white uppercase tracking-widest">Ramps for Deck {i + 1} <span className="text-white/30 text-xs ml-2">({deck.id})</span></h3>
              <button onClick={() => addRamp(deck.id)} className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold uppercase tracking-widest">+ Add Ramp</button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {ramps.filter(r => r.deckId === deck.id).map((ramp, j) => (
                <div key={ramp.id} className="bg-black/40 border border-cyan-900/40 rounded-md p-3 relative">
                  <button onClick={() => removeRamp(ramp.id)} className="absolute top-1.5 right-2 text-red-500 hover:text-red-400 font-bold text-sm">✕</button>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <SelectInput 
                      label="Side" 
                      value={ramp.side} 
                      onChange={v => updateRamp(ramp.id, { side: v as any })}
                      options={[{value: 'top', label: 'Top'}, {value: 'bottom', label: 'Bottom'}, {value: 'left', label: 'Left'}, {value: 'right', label: 'Right'}]}
                    />
                    <SelectInput 
                      label="Measure From" 
                      value={ramp.corner} 
                      onChange={v => updateRamp(ramp.id, { corner: v as any })}
                      options={[{value: 'topLeft', label: 'Top Left'}, {value: 'topRight', label: 'Top Right'}, {value: 'bottomLeft', label: 'Bottom Left'}, {value: 'bottomRight', label: 'Bottom Right'}]}
                    />
                    <NumberInput label="Offset Inward (m)" value={ramp.offset} onChange={v => updateRamp(ramp.id, { offset: v })} />
                    <NumberInput label="Width (m)" value={ramp.width} onChange={v => updateRamp(ramp.id, { width: v })} />
                    <NumberInput label="Length (m)" value={ramp.length} onChange={v => updateRamp(ramp.id, { length: v })} />
                  </div>
                </div>
              ))}
              {ramps.filter(r => r.deckId === deck.id).length === 0 && (
                <p className="text-white/20 text-[10px] italic font-mono">No ramps added to this deck.</p>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'handrails' && decks.map((deck, i) => (
          <div key={deck.id} className="glass-panel rounded-lg border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base font-display font-black text-white uppercase tracking-widest">Handrails for Deck {i + 1} <span className="text-white/30 text-xs ml-2">({deck.id})</span></h3>
              <button onClick={() => addHandrail(deck.id)} className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold uppercase tracking-widest">+ Add Handrail</button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {handrails.filter(h => h.deckId === deck.id).map((handrail, j) => (
                <div key={handrail.id} className="bg-black/40 border border-cyan-900/40 rounded-md p-3 relative">
                  <button onClick={() => removeHandrail(handrail.id)} className="absolute top-1.5 right-2 text-red-500 hover:text-red-400 font-bold text-sm">✕</button>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <SelectInput 
                      label="Side" 
                      value={handrail.side} 
                      onChange={v => updateHandrail(handrail.id, { side: v as any })}
                      options={[{value: 'top', label: 'Top'}, {value: 'bottom', label: 'Bottom'}, {value: 'left', label: 'Left'}, {value: 'right', label: 'Right'}]}
                    />
                    <SelectInput 
                      label="Measure From" 
                      value={handrail.corner} 
                      onChange={v => updateHandrail(handrail.id, { corner: v as any })}
                      options={[{value: 'topLeft', label: 'Top Left'}, {value: 'topRight', label: 'Top Right'}, {value: 'bottomLeft', label: 'Bottom Left'}, {value: 'bottomRight', label: 'Bottom Right'}]}
                    />
                    <NumberInput label="Offset (m)" value={handrail.offset} onChange={v => updateHandrail(handrail.id, { offset: v })} />
                    <NumberInput label="Length (m)" value={handrail.length} onChange={v => updateHandrail(handrail.id, { length: v })} />
                    <SelectInput 
                      label="Type" 
                      value={handrail.type || 'standard'} 
                      onChange={v => updateHandrail(handrail.id, { type: v as any })}
                      options={[{value: 'standard', label: 'Standard'}, {value: 'heavy-duty', label: 'Heavy Duty'}, {value: 'decorative', label: 'Decorative'}]}
                    />
                  </div>
                </div>
              ))}
              {handrails.filter(h => h.deckId === deck.id).length === 0 && (
                <p className="text-white/20 text-[10px] italic font-mono">No handrails added to this deck.</p>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'landings' && ramps.map((ramp, i) => (
          <div key={ramp.id} className="glass-panel rounded-lg border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base font-display font-black text-white uppercase tracking-widest">Landings for Ramp {i + 1} <span className="text-white/30 text-xs ml-2">({ramp.id})</span></h3>
              <button onClick={() => addLandingPad(ramp.id)} className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold uppercase tracking-widest">+ Add Landing Pad</button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {(ramp.landingPads || []).map(pad => (
                <div key={pad.id} className="flex gap-2 items-end bg-black/20 p-2 rounded relative">
                  <button onClick={() => removeLandingPad(ramp.id, pad.id)} className="absolute top-1 right-1 text-red-500 hover:text-red-400 font-bold text-xs">✕</button>
                  <div className="flex-1"><NumberInput label="Start Offset (m)" value={pad.offset} onChange={v => updateLandingPad(ramp.id, pad.id, { offset: Number(v) })} /></div>
                  <div className="flex-1"><NumberInput label="Length (m)" value={pad.length} onChange={v => updateLandingPad(ramp.id, pad.id, { length: Number(v) })} /></div>
                </div>
              ))}
              {(!ramp.landingPads || ramp.landingPads.length === 0) && (
                <p className="text-white/20 text-[9px] italic font-mono">No landing pads added.</p>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'decks' && (
          <div className="flex justify-between items-center gap-4 mt-4">
            <button 
              onClick={addDeck}
              className="flex-1 py-4 border-2 border-dashed border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 rounded-lg font-black uppercase tracking-widest transition-all text-xs"
            >
              + Add Another Deck
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-white/10">
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-[#00d2ff] text-black font-black uppercase tracking-widest text-xs rounded-lg hover:bg-white transition-colors"
        >
          Generate 3D Model
        </button>
      </div>
    </div>
  );
};
