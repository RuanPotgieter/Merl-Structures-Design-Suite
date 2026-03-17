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

const NumberInput: React.FC<{ value: number | ''; onChange: (v: number | '') => void, label: string, tooltip?: string }> = ({ value, onChange, label, tooltip }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-[#4b5563] flex justify-between items-center">
      {label}
      {tooltip && <span className="text-[10px] font-normal text-[#9ca3af] italic" title={tooltip}>?</span>}
    </label>
    <input
      type="number"
      className="bg-[#f9fafb] border border-[#d1d5db] text-[#111827] text-sm px-3 py-2 w-full outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all rounded-md shadow-sm"
      value={value}
      step="0.1"
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === '' ? '' : parseFloat(val));
      }}
    />
    {tooltip && <p className="text-[10px] text-[#6b7280] leading-tight">{tooltip}</p>}
  </div>
);

const SelectInput: React.FC<{ value: string; onChange: (v: string) => void, label: string, options: {value: string, label: string}[], tooltip?: string }> = ({ value, onChange, label, options, tooltip }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-[#4b5563] flex justify-between items-center">
      {label}
      {tooltip && <span className="text-[10px] font-normal text-[#9ca3af] italic" title={tooltip}>?</span>}
    </label>
    <select
      className="bg-[#f9fafb] border border-[#d1d5db] text-[#111827] text-sm px-3 py-2 w-full outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all rounded-md shadow-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {tooltip && <p className="text-[10px] text-[#6b7280] leading-tight">{tooltip}</p>}
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
    <div className="flex flex-col h-full bg-white text-[#1f2937]">
      <div className="p-6 pb-0 shrink-0 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <h2 className="text-xl font-bold text-[#111827] tracking-tight mb-1">Project Specifications</h2>
        <p className="text-[#6b7280] text-xs leading-relaxed mb-4">
          Configure decks, access ramps, and handrails.
        </p>
        
        <div className="flex gap-1 overflow-x-auto hide-scrollbar -mb-[1px]">
          <button onClick={() => setActiveTab('decks')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-md border-b-2 transition-colors whitespace-nowrap ${activeTab === 'decks' ? 'border-[#2563eb] text-[#2563eb] bg-white' : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]'}`}>Decks</button>
          <button onClick={() => setActiveTab('rakings')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-md border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rakings' ? 'border-[#2563eb] text-[#2563eb] bg-white' : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]'}`}>Rakings</button>
          <button onClick={() => setActiveTab('ramps')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-md border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ramps' ? 'border-[#2563eb] text-[#2563eb] bg-white' : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]'}`}>Ramps</button>
          <button onClick={() => setActiveTab('handrails')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-md border-b-2 transition-colors whitespace-nowrap ${activeTab === 'handrails' ? 'border-[#2563eb] text-[#2563eb] bg-white' : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]'}`}>Handrails</button>
          <button onClick={() => setActiveTab('landings')} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-md border-b-2 transition-colors whitespace-nowrap ${activeTab === 'landings' ? 'border-[#2563eb] text-[#2563eb] bg-white' : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]'}`}>Landings</button>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-y-auto p-6 bg-white">
        {activeTab === 'decks' && decks.filter(d => d.type !== 'raking').map((deck, i) => (
          <div key={deck.id} className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Deck {i + 1} <span className="text-[#9ca3af] text-xs ml-1 font-normal">({deck.id})</span></h3>
              {decks.length > 1 && (
                <button onClick={() => removeDeck(deck.id)} className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider transition-colors">Remove</button>
              )}
            </div>
            
            <div className="p-5 flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-bold text-[#4b5563] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Dimensions & Position</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectInput 
                    label="Deck Type" 
                    value={deck.type || 'standard'} 
                    onChange={v => updateDeck(deck.id, { type: v as any })}
                    options={[{value: 'standard', label: 'Standard'}, {value: 'raking', label: 'Raking'}]}
                  />
                  <NumberInput label="Depth (m)" value={deck.depth} onChange={v => updateDeck(deck.id, { depth: v })} tooltip="Main direction length" />
                  <NumberInput label="Width (m)" value={deck.width} onChange={v => updateDeck(deck.id, { width: v })} tooltip="Cross direction length" />
                  <NumberInput label="Origin X (m)" value={deck.originX} onChange={v => updateDeck(deck.id, { originX: v })} tooltip="X-axis position" />
                  <NumberInput label="Origin Z (m)" value={deck.originZ} onChange={v => updateDeck(deck.id, { originZ: v })} tooltip="Z-axis position" />
                  <NumberInput label="Orientation (°)" value={deck.orientation} onChange={v => updateDeck(deck.id, { orientation: v })} tooltip="Rotation in degrees" />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#4b5563] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Elevations & Terrain</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput label="Datum Height (m)" value={deck.terrain.deckHeight} onChange={v => updateTerrain(deck.id, { deckHeight: v })} tooltip="Height from datum to deck surface" />
                  <NumberInput label="Origin Ground Offset (m)" value={deck.terrain.groundOffsets.origin} onChange={v => updateGroundOffsets(deck.id, { origin: v })} tooltip="Ground level at origin" />
                  <NumberInput label="Width End Ground Offset (m)" value={deck.terrain.groundOffsets.widthEnd} onChange={v => updateGroundOffsets(deck.id, { widthEnd: v })} />
                  <NumberInput label="Depth End Ground Offset (m)" value={deck.terrain.groundOffsets.depthEnd} onChange={v => updateGroundOffsets(deck.id, { depthEnd: v })} />
                  <NumberInput label="Diagonal Ground Offset (m)" value={deck.terrain.groundOffsets.diagonal} onChange={v => updateGroundOffsets(deck.id, { diagonal: v })} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'rakings' && decks.filter(d => d.type === 'raking').map((deck, i) => (
          <div key={deck.id} className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Raking Deck {i + 1} <span className="text-[#9ca3af] text-xs ml-1 font-normal">({deck.id})</span></h3>
              {decks.length > 1 && (
                <button onClick={() => removeDeck(deck.id)} className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider transition-colors">Remove</button>
              )}
            </div>
            
            <div className="p-5 flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-bold text-[#4b5563] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Dimensions & Position</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectInput 
                    label="Deck Type" 
                    value={deck.type || 'standard'} 
                    onChange={v => updateDeck(deck.id, { type: v as any })}
                    options={[{value: 'standard', label: 'Standard'}, {value: 'raking', label: 'Raking'}]}
                  />
                  <NumberInput label="Tiers" value={deck.tiers || 3} onChange={v => updateDeck(deck.id, { tiers: v as number })} tooltip="Number of stepped tiers" />
                  <NumberInput label="Width (m)" value={deck.width} onChange={v => updateDeck(deck.id, { width: v })} tooltip="Total width of all tiers" />
                  <NumberInput label="Origin X (m)" value={deck.originX} onChange={v => updateDeck(deck.id, { originX: v })} />
                  <NumberInput label="Origin Z (m)" value={deck.originZ} onChange={v => updateDeck(deck.id, { originZ: v })} />
                  <NumberInput label="Orientation (°)" value={deck.orientation} onChange={v => updateDeck(deck.id, { orientation: v })} />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#4b5563] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Elevations & Terrain</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput label="Datum Height (m)" value={deck.terrain.deckHeight} onChange={v => updateTerrain(deck.id, { deckHeight: v })} />
                  <NumberInput label="Origin Ground Offset (m)" value={deck.terrain.groundOffsets.origin} onChange={v => updateGroundOffsets(deck.id, { origin: v })} />
                  <NumberInput label="Width End Ground Offset (m)" value={deck.terrain.groundOffsets.widthEnd} onChange={v => updateGroundOffsets(deck.id, { widthEnd: v })} />
                  <NumberInput label="Depth End Ground Offset (m)" value={deck.terrain.groundOffsets.depthEnd} onChange={v => updateGroundOffsets(deck.id, { depthEnd: v })} />
                  <NumberInput label="Diagonal Ground Offset (m)" value={deck.terrain.groundOffsets.diagonal} onChange={v => updateGroundOffsets(deck.id, { diagonal: v })} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'ramps' && decks.map((deck, i) => (
          <div key={deck.id} className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Ramps for Deck {i + 1} <span className="text-[#9ca3af] text-xs ml-1 font-normal">({deck.id})</span></h3>
              <button onClick={() => addRamp(deck.id)} className="text-[#2563eb] hover:text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider transition-colors">+ Add Ramp</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {ramps.filter(r => r.deckId === deck.id).map((ramp, j) => (
                <div key={ramp.id} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-md p-4 relative">
                  <button onClick={() => removeRamp(ramp.id)} className="absolute top-2 right-3 text-[#9ca3af] hover:text-red-500 font-bold text-sm transition-colors">✕</button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <SelectInput 
                      label="Attach to Side" 
                      value={ramp.side} 
                      onChange={v => updateRamp(ramp.id, { side: v as any })}
                      options={[{value: 'top', label: 'Top'}, {value: 'bottom', label: 'Bottom'}, {value: 'left', label: 'Left'}, {value: 'right', label: 'Right'}]}
                    />
                    <SelectInput 
                      label="Measure From Corner" 
                      value={ramp.corner} 
                      onChange={v => updateRamp(ramp.id, { corner: v as any })}
                      options={[{value: 'topLeft', label: 'Top Left'}, {value: 'topRight', label: 'Top Right'}, {value: 'bottomLeft', label: 'Bottom Left'}, {value: 'bottomRight', label: 'Bottom Right'}]}
                    />
                    <NumberInput label="Offset Inward (m)" value={ramp.offset} onChange={v => updateRamp(ramp.id, { offset: v })} tooltip="Distance from the selected corner" />
                    <NumberInput label="Width (m)" value={ramp.width} onChange={v => updateRamp(ramp.id, { width: v })} />
                    <NumberInput label="Length (m)" value={ramp.length} onChange={v => updateRamp(ramp.id, { length: v })} tooltip="Ramp run length" />
                  </div>
                </div>
              ))}
              {ramps.filter(r => r.deckId === deck.id).length === 0 && (
                <p className="text-[#9ca3af] text-xs italic text-center py-4">No ramps attached to this deck.</p>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'handrails' && decks.map((deck, i) => (
          <div key={deck.id} className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Handrails for Deck {i + 1} <span className="text-[#9ca3af] text-xs ml-1 font-normal">({deck.id})</span></h3>
              <button onClick={() => addHandrail(deck.id)} className="text-[#2563eb] hover:text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider transition-colors">+ Add Handrail</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {handrails.filter(h => h.deckId === deck.id).map((handrail, j) => (
                <div key={handrail.id} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-md p-4 relative">
                  <button onClick={() => removeHandrail(handrail.id)} className="absolute top-2 right-3 text-[#9ca3af] hover:text-red-500 font-bold text-sm transition-colors">✕</button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <SelectInput 
                      label="Attach to Side" 
                      value={handrail.side} 
                      onChange={v => updateHandrail(handrail.id, { side: v as any })}
                      options={[{value: 'top', label: 'Top'}, {value: 'bottom', label: 'Bottom'}, {value: 'left', label: 'Left'}, {value: 'right', label: 'Right'}]}
                    />
                    <SelectInput 
                      label="Measure From Corner" 
                      value={handrail.corner} 
                      onChange={v => updateHandrail(handrail.id, { corner: v as any })}
                      options={[{value: 'topLeft', label: 'Top Left'}, {value: 'topRight', label: 'Top Right'}, {value: 'bottomLeft', label: 'Bottom Left'}, {value: 'bottomRight', label: 'Bottom Right'}]}
                    />
                    <NumberInput label="Offset Inward (m)" value={handrail.offset} onChange={v => updateHandrail(handrail.id, { offset: v })} />
                    <NumberInput label="Length (m)" value={handrail.length} onChange={v => updateHandrail(handrail.id, { length: v })} />
                    <SelectInput 
                      label="Railing Type" 
                      value={handrail.type || 'standard'} 
                      onChange={v => updateHandrail(handrail.id, { type: v as any })}
                      options={[{value: 'standard', label: 'Standard'}, {value: 'heavy-duty', label: 'Heavy Duty'}, {value: 'decorative', label: 'Decorative'}]}
                    />
                  </div>
                </div>
              ))}
              {handrails.filter(h => h.deckId === deck.id).length === 0 && (
                <p className="text-[#9ca3af] text-xs italic text-center py-4">No handrails attached to this deck.</p>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'landings' && ramps.map((ramp, i) => (
          <div key={ramp.id} className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Landings for Ramp {i + 1} <span className="text-[#9ca3af] text-xs ml-1 font-normal">({ramp.id})</span></h3>
              <button onClick={() => addLandingPad(ramp.id)} className="text-[#2563eb] hover:text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider transition-colors">+ Add Landing Pad</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {(ramp.landingPads || []).map(pad => (
                <div key={pad.id} className="flex gap-4 items-end bg-[#f9fafb] border border-[#e5e7eb] p-4 rounded-md relative">
                  <button onClick={() => removeLandingPad(ramp.id, pad.id)} className="absolute top-2 right-3 text-[#9ca3af] hover:text-red-500 font-bold text-sm transition-colors">✕</button>
                  <div className="flex-1"><NumberInput label="Start Offset (m)" value={pad.offset} onChange={v => updateLandingPad(ramp.id, pad.id, { offset: Number(v) })} tooltip="Distance from ramp start" /></div>
                  <div className="flex-1"><NumberInput label="Length (m)" value={pad.length} onChange={v => updateLandingPad(ramp.id, pad.id, { length: Number(v) })} tooltip="Length of the landing" /></div>
                </div>
              ))}
              {(!ramp.landingPads || ramp.landingPads.length === 0) && (
                <p className="text-[#9ca3af] text-xs italic text-center py-4">No landing pads added.</p>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'decks' && (
          <div className="mt-2">
            <button 
              onClick={addDeck}
              className="w-full py-4 border-2 border-dashed border-[#d1d5db] text-[#6b7280] hover:text-[#2563eb] hover:border-[#2563eb] hover:bg-[#eff6ff] rounded-lg font-bold uppercase tracking-wider transition-all text-xs shadow-sm"
            >
              + Add Another Deck
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto p-6 border-t border-[#e5e7eb] bg-[#f9fafb] shrink-0">
        <button 
          onClick={onComplete}
          className="w-full py-3 bg-[#2563eb] text-white font-bold uppercase tracking-wider text-xs rounded-md shadow-sm hover:bg-[#1d4ed8] hover:shadow transition-all"
        >
          View 3D Model
        </button>
      </div>
    </div>
  );
};

