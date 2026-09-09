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

// CAD Number Input with right-aligned inline unit label and clean architectural focus border
const CadNumberInput: React.FC<{
  value: number | '';
  onChange: (v: number | '') => void;
  label: string;
  unit?: string;
  tooltip?: string;
  step?: number;
  placeholder?: string;
}> = React.memo(({ value, onChange, label, unit = 'm', tooltip, step = 0.1, placeholder = '0.00' }) => {
  const [localValue, setLocalValue] = useState<string>(value === '' ? '' : value.toString());
  const isFocusedRef = React.useRef(false);

  React.useEffect(() => {
    // Only synchronize incoming prop if user is not actively typing/focused
    if (!isFocusedRef.current) {
      const stringValue = value === '' ? '' : value.toString();
      if (value !== '' && parseFloat(localValue) !== value) {
        setLocalValue(stringValue);
      } else if (value === '' && localValue !== '') {
        setLocalValue('');
      }
    }
  }, [value]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      const val = localValue;
      if (val.trim() === '') {
        onChange('');
        return;
      }
      
      let numericVal: number;
      const lowerVal = val.toLowerCase().trim();
      if (lowerVal.endsWith('mm')) {
        numericVal = parseFloat(lowerVal.slice(0, -2)) / 1000;
      } else if (lowerVal.endsWith('m')) {
        numericVal = parseFloat(lowerVal.slice(0, -1));
      } else {
        numericVal = parseFloat(val);
      }

      if (!isNaN(numericVal) && value !== numericVal) {
        onChange(numericVal);
      }
    }, 180);
    return () => clearTimeout(handler);
  }, [localValue]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-mono font-medium text-[#94a3b8] flex items-center gap-1.5">
          {label}
        </label>
        {tooltip && (
          <span className="text-[10px] font-mono text-[#64748b] cursor-help" title={tooltip}>
            ⓘ
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="number"
          step={step}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className="bg-[#161922] border border-[#272d3b] text-[#f8fafc] font-mono text-xs rounded-md px-2.5 py-1.5 pr-8 w-full outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all shadow-inner placeholder-[#475569]"
          value={localValue}
          onFocus={() => { isFocusedRef.current = true; }}
          onBlur={() => { isFocusedRef.current = false; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLElement).blur();
            }
          }}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
        />
        {unit && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-[#64748b] select-none pointer-events-none uppercase">
            {unit}
          </span>
        )}
      </div>
      {tooltip && <p className="text-[10px] font-mono text-[#64748b] leading-tight mt-0.5">{tooltip}</p>}
    </div>
  );
});

// Compact numerical slider paired with inline CAD dimension input
const CadDimensionField: React.FC<{
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  tooltip?: string;
}> = React.memo(({ label, value, onChange, min, max, step = 0.1, unit = 'm', tooltip }) => {
  const [localValue, setLocalValue] = useState<number | ''>(value);
  const throttleTimerRef = React.useRef<any>(null);
  const lastDispatchedRef = React.useRef<number | ''>(value);

  React.useEffect(() => {
    setLocalValue(value);
    lastDispatchedRef.current = value;
  }, [value]);

  const dispatchUpdate = (val: number | '') => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }
    throttleTimerRef.current = setTimeout(() => {
      if (val !== lastDispatchedRef.current) {
        lastDispatchedRef.current = val;
        onChange(val);
      }
    }, 45);
  };

  const commitImmediate = (val: number | '') => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }
    if (val !== lastDispatchedRef.current) {
      lastDispatchedRef.current = val;
      onChange(val);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalValue(val);
    dispatchUpdate(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trim() === '') {
      setLocalValue('');
      dispatchUpdate('');
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setLocalValue(parsed);
      dispatchUpdate(parsed);
    }
  };

  const numericValue = localValue === '' ? min : Number(localValue);

  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#141721] border border-[#242937]">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-mono font-medium text-[#94a3b8] flex items-center gap-1.5">
          {label}
        </label>
        <span className="text-[10px] font-mono text-amber-400 font-bold">
          {localValue !== '' ? Number(localValue).toFixed(1) : '--'} {unit}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Compact Slider with Amber Accent */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numericValue}
          onChange={handleSliderChange}
          onPointerUp={() => commitImmediate(localValue)}
          onTouchEnd={() => commitImmediate(localValue)}
          className="flex-1 h-1.5 bg-[#232838] rounded-lg appearance-none cursor-pointer accent-amber-500 hover:opacity-95"
        />

        {/* Compact Right-aligned Input */}
        <div className="relative w-24 shrink-0">
          <input
            type="number"
            step={step}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={localValue === '' ? '' : localValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitImmediate(localValue);
                (e.target as HTMLElement).blur();
              }
            }}
            onBlur={() => commitImmediate(localValue)}
            className="bg-[#181c26] border border-[#272d3b] text-[#f8fafc] font-mono text-xs rounded px-2 py-1 pr-6 w-full text-right outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all shadow-inner"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-[#64748b] select-none pointer-events-none">
            {unit}
          </span>
        </div>
      </div>

      {tooltip && <p className="text-[9px] font-mono text-[#64748b] leading-tight">{tooltip}</p>}
    </div>
  );
});

// Visual Toggle Chips for selection modes
const CadToggleChips: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  tooltip?: string;
}> = React.memo(({ label, value, onChange, options, tooltip }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between items-center">
      <label className="text-[11px] font-mono font-medium text-[#94a3b8] flex items-center gap-1.5">
        {label}
      </label>
      {tooltip && (
        <span className="text-[10px] font-mono text-[#64748b] cursor-help" title={tooltip}>
          ⓘ
        </span>
      )}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
              isSelected
                ? 'bg-amber-400/15 border border-amber-400/60 text-amber-300 font-semibold shadow-sm'
                : 'bg-[#181c26] border border-[#272d3b] text-[#94a3b8] hover:border-[#384154] hover:text-[#f8fafc]'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  </div>
));

// CAD Select Input
const CadSelectInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
  tooltip?: string;
}> = React.memo(({ value, onChange, label, options, tooltip }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <label className="text-[11px] font-mono font-medium text-[#94a3b8] flex items-center gap-1.5">
        {label}
      </label>
      {tooltip && (
        <span className="text-[10px] font-mono text-[#64748b] cursor-help" title={tooltip}>
          ⓘ
        </span>
      )}
    </div>
    <select
      className="bg-[#161922] border border-[#272d3b] text-[#f8fafc] font-mono text-xs px-2.5 py-1.5 w-full outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all rounded-md shadow-inner"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#161922] text-[#f8fafc]">
          {o.label}
        </option>
      ))}
    </select>
    {tooltip && <p className="text-[10px] font-mono text-[#64748b] leading-tight mt-0.5">{tooltip}</p>}
  </div>
));

export const SpecificationsPanel: React.FC<SpecificationsPanelProps> = ({
  decks,
  onDecksChange,
  ramps,
  onRampsChange,
  handrails,
  onHandrailsChange,
  onComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'decks' | 'ramps' | 'handrails' | 'landings'>('decks');

  const addDeck = () => {
    const newDeck: DeckConfig = {
      id: `deck-${decks.length + 1}`,
      type: 'standard',
      handrailType: 'standard',
      width: 4.8,
      depth: 4.8,
      originX: 0,
      originZ: 0,
      orientation: 0,
      terrain: {
        deckHeight: 2.0,
        groundOffsets: { origin: 0, widthEnd: 0, depthEnd: 0, diagonal: 0 },
      },
    };
    onDecksChange([...decks, newDeck]);
  };

  const updateDeck = (id: string, updates: Partial<DeckConfig>) => {
    onDecksChange(decks.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const updateTerrain = (id: string, updates: Partial<TerrainConfig>) => {
    onDecksChange(
      decks.map((d) => (d.id === id ? { ...d, terrain: { ...d.terrain, ...updates } } : d))
    );
  };

  const updateGroundOffsets = (
    id: string,
    updates: Partial<TerrainConfig['groundOffsets']>
  ) => {
    onDecksChange(
      decks.map((d) =>
        d.id === id
          ? { ...d, terrain: { ...d.terrain, groundOffsets: { ...d.terrain.groundOffsets, ...updates } } }
          : d
      )
    );
  };

  const removeDeck = (id: string) => {
    onDecksChange(decks.filter((d) => d.id !== id));
    onRampsChange(ramps.filter((r) => r.deckId !== id));
    onHandrailsChange(handrails.filter((h) => h.deckId !== id));
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
      landingPads: [],
    };
    onRampsChange([...ramps, newRamp]);
  };

  const updateRamp = (id: string, updates: Partial<RampConfig>) => {
    onRampsChange(ramps.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRamp = (id: string) => {
    onRampsChange(ramps.filter((r) => r.id !== id));
  };

  const addLandingPad = (rampId: string) => {
    onRampsChange(
      ramps.map((r) => {
        if (r.id === rampId) {
          const newPad = {
            id: `lp-${Math.random().toString(36).substr(2, 9)}`,
            offset: 0,
            length: 1.2,
          };
          return { ...r, landingPads: [...(r.landingPads || []), newPad] };
        }
        return r;
      })
    );
  };

  const updateLandingPad = (
    rampId: string,
    padId: string,
    updates: Partial<{ offset: number; length: number }>
  ) => {
    onRampsChange(
      ramps.map((r) => {
        if (r.id === rampId) {
          return {
            ...r,
            landingPads: (r.landingPads || []).map((p) => (p.id === padId ? { ...p, ...updates } : p)),
          };
        }
        return r;
      })
    );
  };

  const removeLandingPad = (rampId: string, padId: string) => {
    onRampsChange(
      ramps.map((r) => {
        if (r.id === rampId) {
          return { ...r, landingPads: (r.landingPads || []).filter((p) => p.id !== padId) };
        }
        return r;
      })
    );
  };

  const addHandrail = (deckId: string) => {
    const newHandrail: HandrailConfig = {
      id: `hr-${Math.random().toString(36).substr(2, 9)}`,
      deckId,
      side: 'top',
      corner: 'topLeft',
      offset: 0,
      length: 2.4,
      type: 'standard',
    };
    onHandrailsChange([...handrails, newHandrail]);
  };

  const updateHandrail = (id: string, updates: Partial<HandrailConfig>) => {
    onHandrailsChange(handrails.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  const removeHandrail = (id: string) => {
    onHandrailsChange(handrails.filter((h) => h.id !== id));
  };

  return (
    <div className="flex flex-col bg-[#0f1217] text-[#f8fafc] h-full">
      {/* Top Header & CAD Sub-navigation */}
      <div className="p-4 md:p-5 pb-3 shrink-0 border-b border-[#232734] bg-[#111319]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <h2 className="text-xs md:text-sm font-mono font-bold text-[#f8fafc] tracking-wider uppercase">
              Scaffold Parameters & Layout
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#7e8b9f] bg-[#181c27] border border-[#272d3b] px-2 py-0.5 rounded">
            KWIKSTAGE STANDARDS
          </span>
        </div>
        <p className="text-[#8492a6] font-mono text-xs leading-relaxed mb-3">
          Configure bay dimensions, stepped raking tiers, perimeter guardrails, and terrain grades.
        </p>

        {/* CAD Navigation Tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar bg-[#161922] p-1 rounded-lg border border-[#272d3b]">
          <button
            onClick={() => setActiveTab('decks')}
            className={`px-3 py-1.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'decks'
                ? 'bg-[#222734] text-amber-400 border border-[#343b4d] shadow-sm font-semibold'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1d212c]'
            }`}
          >
            <span>Decks</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'decks'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {decks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ramps')}
            className={`px-3 py-1.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ramps'
                ? 'bg-[#222734] text-amber-400 border border-[#343b4d] shadow-sm font-semibold'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1d212c]'
            }`}
          >
            <span>Ramps</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'ramps'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {ramps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('handrails')}
            className={`px-3 py-1.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'handrails'
                ? 'bg-[#222734] text-amber-400 border border-[#343b4d] shadow-sm font-semibold'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1d212c]'
            }`}
          >
            <span>Handrails</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'handrails'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {handrails.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('landings')}
            className={`px-3 py-1.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'landings'
                ? 'bg-[#222734] text-amber-400 border border-[#343b4d] shadow-sm font-semibold'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1d212c]'
            }`}
          >
            <span>Landings</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'landings'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {ramps.reduce((acc, r) => acc + (r.landingPads?.length || 0), 0)}
            </span>
          </button>
        </div>
      </div>

      {/* Main Parameters Content Body */}
      <div className="flex flex-col gap-5 p-4 md:p-5 overflow-y-auto flex-1">
        {/* DECKS CONFIGURATION */}
        {activeTab === 'decks' &&
          decks.map((deck, i) => (
            <div
              key={deck.id}
              className="bg-[#13161f] rounded-xl border border-[#232734] shadow-md overflow-hidden"
            >
              {/* Deck Header */}
              <div className="bg-[#171b26] px-4 py-3 border-b border-[#232734] flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <h3 className="text-xs font-mono font-bold text-[#f8fafc] uppercase tracking-wider">
                    DECK {i + 1}{' '}
                    <span className="text-[#64748b] text-[11px] ml-1 font-normal">
                      [{deck.id}]
                    </span>
                  </h3>
                </div>
                {decks.length > 1 && (
                  <button
                    onClick={() => removeDeck(deck.id)}
                    className="text-[#ef4444] hover:text-[#f87171] text-[10px] font-mono font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 hover:border-[#ef4444]/40"
                  >
                    Remove Deck
                  </button>
                )}
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-5">
                {/* 1. Deck Type & Parent Attachment */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#232734] text-[11px] font-mono font-bold uppercase tracking-wider text-[#cbd5e1]">
                    <span className="text-amber-400">§</span>
                    <span>Architecture & Structure Type</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Visual Toggle Chip for Deck Type */}
                    <CadToggleChips
                      label="Deck Geometry Type"
                      value={deck.type || 'standard'}
                      onChange={(v) => updateDeck(deck.id, { type: v as any })}
                      options={[
                        {
                          value: 'standard',
                          label: 'Standard Flat',
                          icon: (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="8" width="18" height="8" rx="1" />
                            </svg>
                          ),
                        },
                        {
                          value: 'raking',
                          label: 'Raking (Tiers)',
                          icon: (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 18h16M4 14h12M4 10h8M4 6h4" />
                            </svg>
                          ),
                        },
                      ]}
                      tooltip="Choose flat planar scaffold or multi-tiered raking rostrum layout"
                    />

                    {/* Attachment Mode Toggle */}
                    <CadToggleChips
                      label="Attachment Mode"
                      value={deck.parentId ? 'attached' : 'absolute'}
                      onChange={(mode) => {
                        if (mode === 'absolute') {
                          updateDeck(deck.id, { parentId: undefined });
                        } else {
                          const availableParent = decks.find((d) => d.id !== deck.id);
                          if (availableParent) {
                            updateDeck(deck.id, { parentId: availableParent.id });
                          }
                        }
                      }}
                      options={[
                        { value: 'absolute', label: 'Absolute (Datum)' },
                        { value: 'attached', label: 'Attach to Deck' },
                      ]}
                      tooltip="Position relative to world origin or attach to an adjacent deck edge"
                    />
                  </div>

                  {/* Parent Deck selection if attached */}
                  {deck.parentId !== undefined && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-[#151823] border border-[#252a39]">
                      <CadSelectInput
                        label="Parent Deck Reference"
                        value={deck.parentId || ''}
                        onChange={(v) => updateDeck(deck.id, { parentId: v || undefined })}
                        options={decks
                          .filter((d) => d.id !== deck.id)
                          .map((d) => ({ value: d.id, label: `Deck [${d.id}]` }))}
                        tooltip="Select which deck this structure attaches to"
                      />

                      <CadToggleChips
                        label="Attach Edge"
                        value={deck.attachEdge || 'front'}
                        onChange={(v) => updateDeck(deck.id, { attachEdge: v as any })}
                        options={[
                          { value: 'front', label: 'Front' },
                          { value: 'back', label: 'Back' },
                          { value: 'left', label: 'Left' },
                          { value: 'right', label: 'Right' },
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Dimensions & Positioning */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#232734] text-[11px] font-mono font-bold uppercase tracking-wider text-[#cbd5e1]">
                    <span className="text-amber-400">§</span>
                    <span>Dimensions & Bay Spacing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {deck.type === 'raking' ? (
                      <>
                        <CadDimensionField
                          label="Number of Tiers"
                          value={deck.tiers ?? 8}
                          onChange={(v) => updateDeck(deck.id, { tiers: v === '' ? '' : Math.round(v) })}
                          min={1}
                          max={20}
                          step={1}
                          unit="tiers"
                          tooltip="Number of stepped levels in raking rostrum"
                        />
                        <CadDimensionField
                          label="Step Height (Rise)"
                          value={deck.stepHeight ?? 0.25}
                          onChange={(v) => updateDeck(deck.id, { stepHeight: v })}
                          min={0.15}
                          max={0.5}
                          step={0.05}
                          unit="m"
                          tooltip="Vertical step height between tiers (default 250mm)"
                        />
                        <CadDimensionField
                          label="Step Depth (Run)"
                          value={deck.stepDepth ?? 1.2}
                          onChange={(v) => updateDeck(deck.id, { stepDepth: v })}
                          min={0.6}
                          max={2.4}
                          step={0.1}
                          unit="m"
                          tooltip="Horizontal tread depth per tier (standard 1.2m rostrum hook side)"
                        />
                      </>
                    ) : (
                      <CadDimensionField
                        label="Deck Length (Depth)"
                        value={deck.depth ?? 4.8}
                        onChange={(v) => updateDeck(deck.id, { depth: v })}
                        min={1.2}
                        max={30}
                        step={0.6}
                        unit="m"
                        tooltip="Scaffold length along main run axis"
                      />
                    )}

                    <CadDimensionField
                      label="Deck Width (Span)"
                      value={deck.width ?? (deck.type === 'raking' ? 8.4 : 4.8)}
                      onChange={(v) => updateDeck(deck.id, { width: v })}
                      min={1.2}
                      max={30}
                      step={0.6}
                      unit="m"
                      tooltip="Scaffold width across bay modules"
                    />

                    {deck.type === 'raking' && (
                      <div className="sm:col-span-2 bg-[#161a25] border border-[#272d3c] rounded-lg p-3 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-mono text-[#cbd5e1] font-semibold">Raking Construction Datum</span>
                            <span className="text-[10px] text-[#7e8b9f]">Left Corner Datum (0, 0) • Rostrums hook on 1.2m sides with 2.4m hooks facing inwards</span>
                          </div>
                          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-400/10 border border-amber-400/40 text-amber-400">
                            LEFT CORNER ORIGIN
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#272d3c] text-[10px] font-mono">
                          <div className="flex flex-col">
                            <span className="text-[#7e8b9f]">Total Depth:</span>
                            <span className="text-amber-400 font-bold">
                              {(((Number(deck.tiers) || 8) * (Number(deck.stepDepth) || 1.2))).toFixed(2)}m
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#7e8b9f]">Top Elevation:</span>
                            <span className="text-amber-400 font-bold">
                              {(((Number(deck.tiers) || 8) * (Number(deck.stepHeight) || 0.25))).toFixed(2)}m
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#7e8b9f]">Rake Pitch:</span>
                            <span className="text-amber-400 font-bold">
                              {(Math.atan((Number(deck.stepHeight) || 0.25) / (Number(deck.stepDepth) || 1.2)) * 180 / Math.PI).toFixed(1)}°
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#272d3c] flex flex-col gap-1 text-[10px] font-mono text-[#94a3b8]">
                          <div className="flex items-center justify-between">
                            <span>Bracing Pattern:</span>
                            <span className="text-amber-300 font-semibold">4 Ledger Bays / Braced Bay • Open Bay Alternating</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Bracing Elevation:</span>
                            <span className="text-amber-300 font-semibold">Starts &ge; 1.0m • Uniform Depth Direction</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Double Ledger Line:</span>
                            <span className="text-amber-300 font-semibold">Active &gt; 1750mm Standards • 1m Vertical Spacing</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!deck.parentId ? (
                      <>
                        <CadDimensionField
                          label="Origin X Position"
                          value={deck.originX ?? 0}
                          onChange={(v) => updateDeck(deck.id, { originX: v })}
                          min={-20}
                          max={20}
                          step={0.6}
                          unit="m"
                          tooltip="World X offset from origin"
                        />
                        <CadDimensionField
                          label="Origin Z Position"
                          value={deck.originZ ?? 0}
                          onChange={(v) => updateDeck(deck.id, { originZ: v })}
                          min={-20}
                          max={20}
                          step={0.6}
                          unit="m"
                          tooltip="World Z offset from origin"
                        />
                        <CadDimensionField
                          label="Orientation Rotation"
                          value={deck.orientation ?? 0}
                          onChange={(v) => updateDeck(deck.id, { orientation: v })}
                          min={-180}
                          max={180}
                          step={15}
                          unit="°"
                          tooltip="Angular orientation in degrees"
                        />
                      </>
                    ) : (
                      <CadDimensionField
                        label="Attachment Offset"
                        value={deck.attachOffset ?? 0}
                        onChange={(v) => updateDeck(deck.id, { attachOffset: v })}
                        min={-15}
                        max={15}
                        step={0.6}
                        unit="m"
                        tooltip="Shift along the attached parent edge"
                      />
                    )}

                    <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#141721] border border-[#242937]">
                      <CadToggleChips
                        label="Perimeter Guardrails"
                        value={deck.handrailType || 'standard'}
                        onChange={(v) => updateDeck(deck.id, { handrailType: v as any })}
                        options={[
                          { value: 'standard', label: 'Standard Dual Rail' },
                          { value: 'none', label: 'No Railings' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Elevations & Ground Offsets */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#232734] text-[11px] font-mono font-bold uppercase tracking-wider text-[#cbd5e1]">
                    <span className="text-amber-400">§</span>
                    <span>Elevations & Ground Grade</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <CadDimensionField
                      label="Top Deck Datum Height"
                      value={deck.terrain.deckHeight ?? 2.0}
                      onChange={(v) => updateTerrain(deck.id, { deckHeight: v })}
                      min={0.4}
                      max={12.0}
                      step={0.2}
                      unit="m"
                      tooltip="Surface elevation from base reference datum"
                    />

                    <CadDimensionField
                      label="Corner 1 (Origin) Grade"
                      value={deck.terrain.groundOffsets.origin ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { origin: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                      tooltip="Ground offset at origin corner (0,0)"
                    />

                    <CadDimensionField
                      label="Corner 2 (Width End) Grade"
                      value={deck.terrain.groundOffsets.widthEnd ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { widthEnd: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                    />

                    <CadDimensionField
                      label="Corner 3 (Depth End) Grade"
                      value={deck.terrain.groundOffsets.depthEnd ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { depthEnd: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                    />

                    <CadDimensionField
                      label="Corner 4 (Diagonal) Grade"
                      value={deck.terrain.groundOffsets.diagonal ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { diagonal: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* RAMPS CONFIGURATION */}
        {activeTab === 'ramps' &&
          decks.map((deck, i) => (
            <div
              key={deck.id}
              className="bg-[#13161f] rounded-xl border border-[#232734] shadow-md overflow-hidden"
            >
              <div className="bg-[#171b26] px-4 py-3 border-b border-[#232734] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <h3 className="text-xs font-mono font-bold text-[#f8fafc] uppercase tracking-wider">
                    Ramps for Deck {i + 1}{' '}
                    <span className="text-[#64748b] text-[11px] ml-1 font-normal">
                      [{deck.id}]
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => addRamp(deck.id)}
                  className="px-3 py-1 text-amber-400 hover:text-stone-950 bg-[#1c202d] hover:bg-amber-400 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all rounded-md"
                >
                  + Add Ramp
                </button>
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-4">
                {ramps
                  .filter((r) => r.deckId === deck.id)
                  .map((ramp) => (
                    <div
                      key={ramp.id}
                      className="bg-[#161922] border border-[#272d3b] rounded-lg p-4 relative flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-[#272d3b]">
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          RAMP ID: {ramp.id}
                        </span>
                        <button
                          onClick={() => removeRamp(ramp.id)}
                          className="text-[#ef4444] hover:text-[#f87171] text-xs font-mono font-bold transition-colors"
                        >
                          ✕ Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <CadToggleChips
                          label="Attach to Deck Edge"
                          value={ramp.side}
                          onChange={(v) => updateRamp(ramp.id, { side: v as any })}
                          options={[
                            { value: 'top', label: 'Top' },
                            { value: 'bottom', label: 'Bottom' },
                            { value: 'left', label: 'Left' },
                            { value: 'right', label: 'Right' },
                          ]}
                        />

                        <CadSelectInput
                          label="Measure From Corner"
                          value={ramp.corner}
                          onChange={(v) => updateRamp(ramp.id, { corner: v as any })}
                          options={[
                            { value: 'topLeft', label: 'Top Left' },
                            { value: 'topRight', label: 'Top Right' },
                            { value: 'bottomLeft', label: 'Bottom Left' },
                            { value: 'bottomRight', label: 'Bottom Right' },
                          ]}
                        />

                        <CadNumberInput
                          label="Offset Along Edge"
                          value={ramp.offset ?? 0}
                          onChange={(v) => updateRamp(ramp.id, { offset: v === '' ? 0 : v })}
                          unit="m"
                          tooltip="Distance from reference corner"
                        />

                        <CadNumberInput
                          label="Ramp Width"
                          value={ramp.width ?? 1.2}
                          onChange={(v) => updateRamp(ramp.id, { width: v === '' ? 1.2 : v })}
                          unit="m"
                        />

                        <CadNumberInput
                          label="Ramp Run Length"
                          value={ramp.length ?? 2.4}
                          onChange={(v) => updateRamp(ramp.id, { length: v === '' ? 2.4 : v })}
                          unit="m"
                          tooltip="Length along incline gradient"
                        />

                        <CadToggleChips
                          label="Ramp Handrails"
                          value={ramp.handrailType ?? 'both'}
                          onChange={(v) => updateRamp(ramp.id, { handrailType: v as any })}
                          options={[
                            { value: 'both', label: 'Both Sides' },
                            { value: 'left', label: 'Left Only' },
                            { value: 'right', label: 'Right Only' },
                            { value: 'none', label: 'None' },
                          ]}
                        />
                      </div>
                    </div>
                  ))}

                {ramps.filter((r) => r.deckId === deck.id).length === 0 && (
                  <p className="text-[#64748b] text-xs font-mono italic text-center py-4">
                    No access ramps connected to this deck.
                  </p>
                )}
              </div>
            </div>
          ))}

        {/* HANDRAILS CONFIGURATION */}
        {activeTab === 'handrails' &&
          decks.map((deck, i) => (
            <div
              key={deck.id}
              className="bg-[#13161f] rounded-xl border border-[#232734] shadow-md overflow-hidden"
            >
              <div className="bg-[#171b26] px-4 py-3 border-b border-[#232734] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <h3 className="text-xs font-mono font-bold text-[#f8fafc] uppercase tracking-wider">
                    Handrails for Deck {i + 1}{' '}
                    <span className="text-[#64748b] text-[11px] ml-1 font-normal">
                      [{deck.id}]
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => addHandrail(deck.id)}
                  className="px-3 py-1 text-amber-400 hover:text-stone-950 bg-[#1c202d] hover:bg-amber-400 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all rounded-md"
                >
                  + Add Handrail
                </button>
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-4">
                {handrails
                  .filter((h) => h.deckId === deck.id)
                  .map((handrail) => (
                    <div
                      key={handrail.id}
                      className="bg-[#161922] border border-[#272d3b] rounded-lg p-4 relative flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-[#272d3b]">
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          RAILING ID: {handrail.id}
                        </span>
                        <button
                          onClick={() => removeHandrail(handrail.id)}
                          className="text-[#ef4444] hover:text-[#f87171] text-xs font-mono font-bold transition-colors"
                        >
                          ✕ Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <CadToggleChips
                          label="Attach to Side"
                          value={handrail.side}
                          onChange={(v) => updateHandrail(handrail.id, { side: v as any })}
                          options={[
                            { value: 'top', label: 'Top' },
                            { value: 'bottom', label: 'Bottom' },
                            { value: 'left', label: 'Left' },
                            { value: 'right', label: 'Right' },
                          ]}
                        />

                        <CadSelectInput
                          label="Corner Reference"
                          value={handrail.corner}
                          onChange={(v) => updateHandrail(handrail.id, { corner: v as any })}
                          options={[
                            { value: 'topLeft', label: 'Top Left' },
                            { value: 'topRight', label: 'Top Right' },
                            { value: 'bottomLeft', label: 'Bottom Left' },
                            { value: 'bottomRight', label: 'Bottom Right' },
                          ]}
                        />

                        <CadNumberInput
                          label="Offset Along Edge"
                          value={handrail.offset ?? 0}
                          onChange={(v) => updateHandrail(handrail.id, { offset: v === '' ? 0 : v })}
                          unit="m"
                        />

                        <CadNumberInput
                          label="Railing Span Length"
                          value={handrail.length ?? 2.4}
                          onChange={(v) => updateHandrail(handrail.id, { length: v === '' ? 2.4 : v })}
                          unit="m"
                        />

                        <CadToggleChips
                          label="Railing Specification"
                          value={handrail.type || 'standard'}
                          onChange={(v) => updateHandrail(handrail.id, { type: v as any })}
                          options={[
                            { value: 'standard', label: 'Standard Tube' },
                            { value: 'heavy-duty', label: 'Heavy Duty' },
                            { value: 'decorative', label: 'Decorative' },
                          ]}
                        />
                      </div>
                    </div>
                  ))}

                {handrails.filter((h) => h.deckId === deck.id).length === 0 && (
                  <p className="text-[#64748b] text-xs font-mono italic text-center py-4">
                    No custom perimeter handrails added.
                  </p>
                )}
              </div>
            </div>
          ))}

        {/* LANDING PADS CONFIGURATION */}
        {activeTab === 'landings' &&
          ramps.map((ramp, i) => (
            <div
              key={ramp.id}
              className="bg-[#13161f] rounded-xl border border-[#232734] shadow-md overflow-hidden"
            >
              <div className="bg-[#171b26] px-4 py-3 border-b border-[#232734] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <h3 className="text-xs font-mono font-bold text-[#f8fafc] uppercase tracking-wider">
                    Landings for Ramp {i + 1}{' '}
                    <span className="text-[#64748b] text-[11px] ml-1 font-normal">
                      [{ramp.id}]
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => addLandingPad(ramp.id)}
                  className="px-3 py-1 text-amber-400 hover:text-stone-950 bg-[#1c202d] hover:bg-amber-400 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all rounded-md"
                >
                  + Add Landing Pad
                </button>
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-3">
                {(ramp.landingPads || []).map((pad) => (
                  <div
                    key={pad.id}
                    className="flex flex-col sm:flex-row gap-3 items-end bg-[#161922] border border-[#272d3b] p-3.5 rounded-lg relative"
                  >
                    <button
                      onClick={() => removeLandingPad(ramp.id, pad.id)}
                      className="absolute top-2.5 right-2.5 text-[#ef4444] hover:text-[#f87171] font-mono text-xs font-bold"
                    >
                      ✕
                    </button>
                    <div className="flex-1 w-full">
                      <CadNumberInput
                        label="Start Offset from Incline"
                        value={pad.offset ?? 0}
                        onChange={(v) => updateLandingPad(ramp.id, pad.id, { offset: v === '' ? 0 : v })}
                        unit="m"
                        tooltip="Distance from ramp start point"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <CadNumberInput
                        label="Landing Platform Length"
                        value={pad.length ?? 1.2}
                        onChange={(v) => updateLandingPad(ramp.id, pad.id, { length: v === '' ? 1.2 : v })}
                        unit="m"
                        tooltip="Horizontal landing length"
                      />
                    </div>
                  </div>
                ))}

                {(!ramp.landingPads || ramp.landingPads.length === 0) && (
                  <p className="text-[#64748b] text-xs font-mono italic text-center py-4">
                    No landing pads configured for this ramp.
                  </p>
                )}
              </div>
            </div>
          ))}

        {/* Add Deck Button in Decks tab */}
        {activeTab === 'decks' && (
          <div className="mt-1">
            <button
              onClick={addDeck}
              className="w-full py-3.5 border border-dashed border-[#2d3446] hover:border-amber-400/60 text-[#8e9cb2] hover:text-amber-400 bg-[#13161f] hover:bg-[#181c27] rounded-xl font-mono font-medium tracking-wider transition-all text-xs shadow-sm flex items-center justify-center gap-2 group"
            >
              <span className="text-base group-hover:scale-110 transition-transform text-amber-400">+</span>
              <span>Add Another Scaffold Deck Bay</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="p-4 border-t border-[#232734] bg-[#111319] shrink-0">
        <button
          onClick={onComplete}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold uppercase tracking-wider text-xs rounded-md shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 12 12 17 22 12"></polyline>
            <polyline points="2 17 12 22 22 17"></polyline>
          </svg>
          <span>Render 3D CAD Model</span>
        </button>
      </div>
    </div>
  );
};
