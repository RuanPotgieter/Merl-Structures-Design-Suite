import React, { useState } from 'react';
import { DeckConfig, RampConfig, HandrailConfig, TerrainConfig } from '../types';
import { 
  snapAddedDeck, 
  snapAdjacentDecks, 
  snapDeckToNearestAdjacent, 
  checkDeckOverlaps 
} from '../utils/deckLogic';

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
        <label className="text-sm font-mono font-medium text-[#475569] flex items-center gap-1.5">
          {label}
        </label>
        {tooltip && (
          <span className="text-xs font-mono text-[#64748b] cursor-help" title={tooltip}>
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
          className="bg-[#e6f2f5] border border-[#a3c9db] text-[#0f172a] font-mono text-xs rounded-md px-2.5 py-2.5 pr-8 w-full outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 transition-all shadow-inner placeholder-[#475569]"
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
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-[#64748b] select-none pointer-events-none uppercase">
            {unit}
          </span>
        )}
      </div>
      {tooltip && <p className="text-xs font-mono text-[#64748b] leading-tight mt-0.5">{tooltip}</p>}
    </div>
  );
});

// Architectural Numerical Input with Increment/Decrement Buttons on the sides (Default 1.2m increments)
const CadDimensionField: React.FC<{
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tooltip?: string;
}> = React.memo(({ label, value, onChange, min, max, step = 1.2, unit = 'm', tooltip }) => {
  const [localValue, setLocalValue] = useState<string>(value === '' ? '' : value.toString());
  const isFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value === '' ? '' : value.toString());
    }
  }, [value]);

  const commitValue = (val: number | '') => {
    if (val === '') {
      onChange('');
      return;
    }
    let clamped = val;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    clamped = Math.round(clamped * 1000) / 1000;
    setLocalValue(clamped.toString());
    onChange(clamped);
  };

  const handleStep = (direction: 1 | -1) => {
    const currentNum = value === '' ? (min !== undefined ? min : 0) : Number(value);
    const effectiveStep = step !== undefined ? step : 1.2;
    const nextVal = currentNum + direction * effectiveStep;
    commitValue(nextVal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleInputBlur = () => {
    isFocusedRef.current = false;
    const trimmed = localValue.trim();
    if (trimmed === '') {
      commitValue('');
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      commitValue(parsed);
    } else {
      setLocalValue(value === '' ? '' : value.toString());
    }
  };

  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#ffffff] border border-[#b8d4e3] shadow-sm">
      <div className="flex justify-between items-center">
        <label className="text-xs font-mono font-bold text-[#1e293b] flex items-center gap-1.5">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#0284c7] font-bold bg-[#e0f2fe] px-2 py-0.5 rounded border border-[#bae6fd]">
            {localValue !== '' ? `${localValue} ${unit}` : '--'}
          </span>
          <span className="text-[10px] font-mono text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
            ±{step}{unit}
          </span>
        </div>
      </div>

      {/* Text Input Box with Incremental Buttons on the Sides */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={min !== undefined && value !== '' && Number(value) <= min}
          className="h-9 w-10 bg-[#f1f5f9] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] disabled:opacity-35 disabled:cursor-not-allowed border border-[#b8d4e3] rounded-md font-mono font-bold text-base text-[#1e293b] transition-all flex items-center justify-center shrink-0 shadow-sm select-none"
          title={`Decrease by ${step} ${unit}`}
        >
          -
        </button>

        <div className="relative flex-1">
          <input
            type="number"
            step={step}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={localValue}
            onFocus={() => { isFocusedRef.current = true; }}
            onBlur={handleInputBlur}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleInputBlur();
                (e.target as HTMLElement).blur();
              }
            }}
            placeholder="0.00"
            className="w-full h-9 bg-[#f8fbfd] border border-[#b8d4e3] rounded-md px-2.5 pr-8 font-mono text-xs text-[#0f172a] text-center font-bold outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]/30 transition-all shadow-inner"
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-[#64748b] pointer-events-none select-none uppercase">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={max !== undefined && value !== '' && Number(value) >= max}
          className="h-9 w-10 bg-[#f1f5f9] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] disabled:opacity-35 disabled:cursor-not-allowed border border-[#b8d4e3] rounded-md font-mono font-bold text-base text-[#1e293b] transition-all flex items-center justify-center shrink-0 shadow-sm select-none"
          title={`Increase by ${step} ${unit}`}
        >
          +
        </button>
      </div>

      {tooltip && <p className="text-[11px] font-mono text-[#64748b] leading-tight mt-0.5">{tooltip}</p>}
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
      <label className="text-sm font-mono font-medium text-[#475569] flex items-center gap-1.5">
        {label}
      </label>
      {tooltip && (
        <span className="text-xs font-mono text-[#64748b] cursor-help" title={tooltip}>
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
            className={`px-3 py-2.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
              isSelected
                ? 'bg-cyan-600/15 border border-cyan-600/60 text-cyan-700 font-semibold shadow-sm'
                : 'bg-[#181c26] border border-[#a3c9db] text-[#475569] hover:border-[#384154] hover:text-[#0f172a]'
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
      <label className="text-sm font-mono font-medium text-[#475569] flex items-center gap-1.5">
        {label}
      </label>
      {tooltip && (
        <span className="text-xs font-mono text-[#64748b] cursor-help" title={tooltip}>
          ⓘ
        </span>
      )}
    </div>
    <select
      className="bg-[#e6f2f5] border border-[#a3c9db] text-[#0f172a] font-mono text-xs px-2.5 py-2.5 w-full outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 transition-all rounded-md shadow-inner"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#e6f2f5] text-[#0f172a]">
          {o.label}
        </option>
      ))}
    </select>
    {tooltip && <p className="text-xs font-mono text-[#64748b] leading-tight mt-0.5">{tooltip}</p>}
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
    const rawNewDeck: DeckConfig = {
      id: `deck-${decks.length + 1}`,
      type: 'standard',
      handrailType: 'standard',
      width: 4.8,
      depth: 4.8,
      originX: 0,
      originZ: 0,
      orientation: 0,
      terrain: {
        deckHeight: decks[0]?.terrain?.deckHeight ?? 2.0,
        groundOffsets: { origin: 0, widthEnd: 0, depthEnd: 0, diagonal: 0 },
      },
    };
    const snappedNewDeck = snapAddedDeck(rawNewDeck, decks);
    onDecksChange([...decks, snappedNewDeck]);
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

  const addRamp = (
    deckId: string,
    preset?: {
      startSource?: 'deck' | 'landing';
      parentRampId?: string;
      landingPadId?: string;
      landingFace?: 'forward' | 'left' | 'right';
    }
  ) => {
    const isLanding = preset?.startSource === 'landing';
    const newRamp: RampConfig = {
      id: `ramp-${Math.random().toString(36).substr(2, 9)}`,
      deckId,
      startSource: isLanding ? 'landing' : 'deck',
      parentRampId: preset?.parentRampId,
      landingPadId: preset?.landingPadId,
      landingFace: preset?.landingFace || 'forward',
      side: 'bottom',
      corner: 'bottomRight', // Origin is at bottom right
      offset: 0,
      width: 1.2,
      length: 2.4,
      landingPads: [],
      handrailType: 'both',
    };
    onRampsChange([...ramps, newRamp]);
  };

  const updateRamp = (id: string, updates: Partial<RampConfig>) => {
    onRampsChange(
      ramps.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...updates };
        // Auto-adapt corner when edge changes if corner is not explicitly updated
        if (updates.side && updates.side !== r.side && !updates.corner) {
          if (updates.side === 'bottom' || updates.side === 'right') {
            merged.corner = 'bottomRight';
          } else if (updates.side === 'top') {
            merged.corner = 'topRight';
          } else if (updates.side === 'left') {
            merged.corner = 'bottomLeft';
          }
        }
        return merged;
      })
    );
  };

  const removeRamp = (id: string) => {
    // Also remove any child ramps that branched from landing pads of this ramp
    onRampsChange(ramps.filter((r) => r.id !== id && r.parentRampId !== id));
  };

  const addLandingPad = (rampId: string) => {
    const targetRamp = ramps.find((r) => r.id === rampId);
    if (!targetRamp) return;
    const rampLen = Number(targetRamp.length) || 2.4;
    const defaultOffset = Math.max(0, rampLen >= 2.4 ? rampLen - 1.2 : 0);
    const newPad = {
      id: `lp-${Math.random().toString(36).substr(2, 9)}`,
      offset: defaultOffset,
      length: 1.2,
    };
    onRampsChange(
      ramps.map((r) => {
        if (r.id === rampId) {
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
      ramps
        .filter((r) => !(r.startSource === 'landing' && r.parentRampId === rampId && r.landingPadId === padId))
        .map((r) => {
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
    <div className="flex flex-col bg-[#0f1217] text-[#0f172a] h-full">
      {/* Top Header & CAD Sub-navigation */}
      <div className="p-4 md:p-5 pb-3 shrink-0 border-b border-[#b8d4e3] bg-[#ffffff]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
            <h2 className="text-xs md:text-sm font-mono font-bold text-[#0f172a] tracking-wider uppercase">
              Scaffold Parameters & Layout
            </h2>
          </div>
          <span className="text-xs font-mono text-[#7e8b9f] bg-[#181c27] border border-[#a3c9db] px-2 py-2 rounded">
            KWIKSTAGE STANDARDS
          </span>
        </div>
        <p className="text-[#8492a6] font-mono text-xs leading-relaxed mb-3">
          Configure bay dimensions, stepped raking tiers, perimeter guardrails, and terrain grades.
        </p>

        {/* CAD Navigation Tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar bg-[#e6f2f5] p-1 rounded-lg border border-[#a3c9db]">
          <button
            onClick={() => setActiveTab('decks')}
            className={`px-3 py-2.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'decks'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0]'
            }`}
          >
            <span>Decks</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'decks'
                ? 'bg-cyan-600/10 text-cyan-600 border border-cyan-600/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {decks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ramps')}
            className={`px-3 py-2.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ramps'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0]'
            }`}
          >
            <span>Ramps</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'ramps'
                ? 'bg-cyan-600/10 text-cyan-600 border border-cyan-600/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {ramps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('handrails')}
            className={`px-3 py-2.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'handrails'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0]'
            }`}
          >
            <span>Handrails</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'handrails'
                ? 'bg-cyan-600/10 text-cyan-600 border border-cyan-600/30'
                : 'bg-[#1b1f2a] text-[#7e8b9f]'
            }`}>
              {handrails.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('landings')}
            className={`px-3 py-2.5 text-xs font-mono font-medium tracking-wide rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'landings'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0]'
            }`}
          >
            <span>Landings</span>
            <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${
              activeTab === 'landings'
                ? 'bg-cyan-600/10 text-cyan-600 border border-cyan-600/30'
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
        {activeTab === 'decks' && (
          <>
            {decks.length > 1 && (
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border ${
                checkDeckOverlaps(decks).length > 0 
                  ? 'bg-amber-50/80 border-amber-300' 
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    checkDeckOverlaps(decks).length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      {checkDeckOverlaps(decks).length > 0
                        ? `Scaffold Overlap Detected (${checkDeckOverlaps(decks).length} collision${checkDeckOverlaps(decks).length > 1 ? 's' : ''})`
                        : 'Unified Modular Scaffold Array'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {checkDeckOverlaps(decks).length > 0
                        ? 'Decks overlap. Snap coordinates to unify standards & prevent collisions.'
                        : 'Adjacent decks share boundary standards & ledgers on 1.2m grid.'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDecksChange(snapAdjacentDecks(decks))}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-cyan-700 bg-cyan-50 border border-cyan-300 hover:bg-cyan-100 transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  title="Snap all adjacent decks onto 1.2m modular grid and resolve overlaps"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Auto-Snap All Decks
                </button>
              </div>
            )}
            {decks.map((deck, i) => (
            <div
              key={deck.id}
              className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-md overflow-hidden"
            >
              {/* Deck Header */}
              <div className="bg-[#f8fbfd] px-4 py-3 border-b border-[#b8d4e3] flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                  <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                    DECK {i + 1}{' '}
                    <span className="text-[#64748b] text-sm ml-1 font-normal">
                      [{deck.id}]
                    </span>
                  </h3>
                </div>
                {decks.length > 1 && (
                  <button
                    onClick={() => removeDeck(deck.id)}
                    className="text-[#ef4444] hover:text-[#f87171] text-xs font-mono font-bold uppercase tracking-wider transition-colors px-2 py-2 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 hover:border-[#ef4444]/40"
                  >
                    Remove Deck
                  </button>
                )}
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-5">
                {/* 1. Deck Type & Parent Attachment */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#b8d4e3] text-sm font-mono font-bold uppercase tracking-wider text-[#334155]">
                    <span className="text-cyan-600">§</span>
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
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#b8d4e3] text-sm font-mono font-bold uppercase tracking-wider text-[#334155]">
                    <span className="text-cyan-600">§</span>
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
                        step={1.2}
                        unit="m"
                        tooltip="Scaffold length along main run axis (user-defined, 1.2m increments)"
                      />
                    )}

                    <CadDimensionField
                      label="Deck Width (Span)"
                      value={deck.width ?? (deck.type === 'raking' ? 8.4 : 4.8)}
                      onChange={(v) => updateDeck(deck.id, { width: v })}
                      min={1.2}
                      step={1.2}
                      unit="m"
                      tooltip="Scaffold width across bay modules (user-defined, 1.2m increments)"
                    />

                    {deck.type === 'raking' && (
                      <div className="sm:col-span-2 bg-[#ffffff] border border-[#b8d4e3] rounded-lg p-3 flex flex-col gap-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-[#334155] font-semibold">Raking Construction Datum</span>
                            <span className="text-xs text-[#64748b]">Bottom Right Origin Datum • Rostrums hook on 1.2m sides</span>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-mono font-bold uppercase rounded bg-[#e0f2fe] border border-[#bae6fd] text-[#0284c7]">
                            BOTTOM RIGHT ORIGIN
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#e2e8f0] text-xs font-mono">
                          <div className="flex flex-col">
                            <span className="text-[#64748b]">Total Depth:</span>
                            <span className="text-[#0284c7] font-bold">
                              {(((Number(deck.tiers) || 8) * (Number(deck.stepDepth) || 1.2))).toFixed(2)}m
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#64748b]">Top Elevation:</span>
                            <span className="text-[#0284c7] font-bold">
                              {(((Number(deck.tiers) || 8) * (Number(deck.stepHeight) || 0.25))).toFixed(2)}m
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#64748b]">Rake Pitch:</span>
                            <span className="text-[#0284c7] font-bold">
                              {(Math.atan((Number(deck.stepHeight) || 0.25) / (Number(deck.stepDepth) || 1.2)) * 180 / Math.PI).toFixed(1)}°
                            </span>
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
                          step={1.2}
                          unit="m"
                          tooltip="World X offset from origin (1.2m increments)"
                        />
                        <CadDimensionField
                          label="Origin Z Position"
                          value={deck.originZ ?? 0}
                          onChange={(v) => updateDeck(deck.id, { originZ: v })}
                          step={1.2}
                          unit="m"
                          tooltip="World Z offset from origin (1.2m increments)"
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
                        {decks.length > 1 && (
                          <div className="sm:col-span-2 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => onDecksChange(snapDeckToNearestAdjacent(deck.id, decks))}
                              className="text-xs font-mono font-medium text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                              title="Snap this deck flush against the nearest adjacent deck on the 1.2m modular grid"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                              </svg>
                              Snap to Adjacent Deck
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <CadDimensionField
                        label="Attachment Offset"
                        value={deck.attachOffset ?? 0}
                        onChange={(v) => updateDeck(deck.id, { attachOffset: v })}
                        step={1.2}
                        unit="m"
                        tooltip="Shift along attached edge (1.2m increments)"
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
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#b8d4e3] text-sm font-mono font-bold uppercase tracking-wider text-[#334155]">
                    <span className="text-cyan-600">§</span>
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
                      label="Corner 1 (Origin - Bottom Right) Grade"
                      value={deck.terrain.groundOffsets.origin ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { origin: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                      tooltip="Ground offset at Origin (Bottom Right corner)"
                    />

                    <CadDimensionField
                      label="Corner 2 (Bottom Left) Grade"
                      value={deck.terrain.groundOffsets.widthEnd ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { widthEnd: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                      tooltip="Ground offset at Bottom Left corner"
                    />

                    <CadDimensionField
                      label="Corner 3 (Top Right) Grade"
                      value={deck.terrain.groundOffsets.depthEnd ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { depthEnd: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                      tooltip="Ground offset at Top Right corner"
                    />

                    <CadDimensionField
                      label="Corner 4 (Top Left) Grade"
                      value={deck.terrain.groundOffsets.diagonal ?? 0}
                      onChange={(v) => updateGroundOffsets(deck.id, { diagonal: v })}
                      min={-4}
                      max={4}
                      step={0.1}
                      unit="m"
                      tooltip="Ground offset at Top Left corner"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          </>
        )}

        {/* RAMPS CONFIGURATION */}
        {activeTab === 'ramps' &&
          decks.map((deck, i) => (
            <div
              key={deck.id}
              className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-md overflow-hidden"
            >
              <div className="bg-[#f8fbfd] px-4 py-3 border-b border-[#b8d4e3] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                  <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                    Ramps for Deck {i + 1}{' '}
                    <span className="text-[#64748b] text-sm ml-1 font-normal">
                      [{deck.id}]
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => addRamp(deck.id)}
                  className="px-3 py-2 text-cyan-600 hover:text-white bg-[#1c202d] hover:bg-cyan-600 border border-cyan-600/30 text-xs font-mono font-bold uppercase tracking-wider transition-all rounded-md"
                >
                  + Add Ramp
                </button>
              </div>

              <div className="p-4 md:p-5 flex flex-col gap-4">
                {ramps
                  .filter((r) => r.deckId === deck.id)
                  .map((ramp) => {
                    const isLandingStart = ramp.startSource === 'landing';
                    const otherRamps = ramps.filter((r) => r.id !== ramp.id);
                    const availableLandingPads = otherRamps.flatMap((r) =>
                      (r.landingPads || []).map((pad, pIdx) => ({
                        rampId: r.id,
                        padId: pad.id,
                        label: `Ramp [${r.id}] — Landing #${pIdx + 1} (@ ${pad.offset}m, ${pad.length}m lg)`,
                        pad,
                      }))
                    );

                    return (
                      <div
                        key={ramp.id}
                        className="bg-[#e6f2f5] border border-[#a3c9db] rounded-lg p-4 relative flex flex-col gap-4 shadow-sm"
                      >
                        {/* Ramp Header */}
                        <div className="flex flex-wrap justify-between items-center pb-2 border-b border-[#a3c9db] gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-cyan-700">
                              RAMP ID: {ramp.id}
                            </span>
                            {isLandingStart ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Landing Branch: {ramp.landingFace === 'left' ? 'Turn Left 90°' : ramp.landingFace === 'right' ? 'Turn Right 90°' : 'Forward 0°'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#d4e4ed] text-[#334155] border border-[#a3c9db]">
                                Deck Edge Attached ({ramp.side.toUpperCase()})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeRamp(ramp.id)}
                            className="text-[#ef4444] hover:text-[#dc2626] text-xs font-mono font-bold transition-colors"
                          >
                            ✕ Delete Ramp
                          </button>
                        </div>

                        {/* Starting Location Source Selector */}
                        <div className="bg-[#ffffff] p-3 rounded-lg border border-[#a3c9db] flex flex-col gap-2">
                          <CadToggleChips
                            label="Ramp Starting Location"
                            value={ramp.startSource || 'deck'}
                            onChange={(v) => {
                              const newSource = v as 'deck' | 'landing';
                              if (newSource === 'landing') {
                                const targetPad = availableLandingPads[0];
                                updateRamp(ramp.id, {
                                  startSource: 'landing',
                                  parentRampId: targetPad?.rampId,
                                  landingPadId: targetPad?.padId,
                                  landingFace: ramp.landingFace || 'forward',
                                });
                              } else {
                                updateRamp(ramp.id, {
                                  startSource: 'deck',
                                  parentRampId: undefined,
                                  landingPadId: undefined,
                                });
                              }
                            }}
                            options={[
                              { value: 'deck', label: 'Directly from Deck Edge' },
                              { value: 'landing', label: 'From Landing Pad Open Face' },
                            ]}
                          />
                        </div>

                        {/* If Starting from Landing Pad Open Face */}
                        {isLandingStart ? (
                          <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-3.5 flex flex-col gap-3">
                            <div className="text-xs font-mono font-bold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                              <span>§</span>
                              <span>Landing Pad Branch Connection</span>
                            </div>

                            {availableLandingPads.length === 0 ? (
                              <div className="bg-[#fffbeb] border border-[#fde68a] rounded p-3 text-xs font-mono text-[#92400e]">
                                ⚠️ No landing pads exist on other ramps yet. Landing pads can only be added once an access ramp is placed. Add a landing pad to an existing ramp first, or switch to "Directly from Deck Edge".
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <CadSelectInput
                                    label="Connect to Parent Landing Pad"
                                    value={ramp.landingPadId || availableLandingPads[0].padId}
                                    onChange={(val) => {
                                      const selected = availableLandingPads.find((p) => p.padId === val);
                                      if (selected) {
                                        updateRamp(ramp.id, {
                                          parentRampId: selected.rampId,
                                          landingPadId: selected.padId,
                                        });
                                      }
                                    }}
                                    options={availableLandingPads.map((p) => ({
                                      value: p.padId,
                                      label: p.label,
                                    }))}
                                  />

                                  <CadToggleChips
                                    label="Start on Open Face of Landing"
                                    value={ramp.landingFace || 'forward'}
                                    onChange={(v) => updateRamp(ramp.id, { landingFace: v as any })}
                                    options={[
                                      { value: 'forward', label: 'Straight Ahead (Forward)' },
                                      { value: 'left', label: 'Turn 90° Left' },
                                      { value: 'right', label: 'Turn 90° Right' },
                                    ]}
                                  />
                                </div>
                                <div className="text-[11px] font-mono text-sky-800 bg-[#e0f2fe] px-2.5 py-1.5 rounded border border-[#7dd3fc]">
                                  {ramp.landingFace === 'left' && '← Left Face: Ramp branches 90° to the left (dogleg/switchback configuration).'}
                                  {ramp.landingFace === 'right' && '→ Right Face: Ramp branches 90° to the right (dogleg/switchback configuration).'}
                                  {(!ramp.landingFace || ramp.landingFace === 'forward') && '↑ Straight Ahead: Ramp continues in-line with the parent ramp run direction.'}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          /* If Starting Directly from Deck Edge */
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                              options={
                                ramp.side === 'bottom'
                                  ? [
                                      { value: 'bottomRight', label: 'Bottom Right (Origin)' },
                                      { value: 'bottomLeft', label: 'Bottom Left' },
                                    ]
                                  : ramp.side === 'right'
                                  ? [
                                      { value: 'bottomRight', label: 'Bottom Right (Origin)' },
                                      { value: 'topRight', label: 'Top Right' },
                                    ]
                                  : ramp.side === 'top'
                                  ? [
                                      { value: 'topRight', label: 'Top Right' },
                                      { value: 'topLeft', label: 'Top Left' },
                                    ]
                                  : [
                                      { value: 'bottomLeft', label: 'Bottom Left' },
                                      { value: 'topLeft', label: 'Top Left' },
                                    ]
                              }
                            />

                            <CadDimensionField
                              label="Offset Along Edge"
                              value={ramp.offset ?? 0}
                              onChange={(v) => updateRamp(ramp.id, { offset: v === '' ? 0 : v })}
                              min={0}
                              step={1.2}
                              unit="m"
                              tooltip="Distance from reference corner in 1.2m increments"
                            />
                          </div>
                        )}

                        {/* Dimensions & Guardrails */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <CadDimensionField
                            label="Ramp Width"
                            value={ramp.width ?? 1.2}
                            onChange={(v) => updateRamp(ramp.id, { width: v === '' ? 1.2 : v })}
                            min={1.2}
                            step={1.2}
                            unit="m"
                            tooltip="Width of ramp run (standard 1.2m increments)"
                          />

                          <CadDimensionField
                            label="Ramp Run Length"
                            value={ramp.length ?? 2.4}
                            onChange={(v) => updateRamp(ramp.id, { length: v === '' ? 2.4 : v })}
                            min={1.2}
                            step={1.2}
                            unit="m"
                            tooltip="Incline run length in 1.2m increments"
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

                        {/* Integrated Landing Pads on this Ramp */}
                        <div className="bg-[#ffffff] rounded-lg border border-[#a3c9db] p-3 flex flex-col gap-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-1.5">
                              <span className="text-cyan-600">■</span>
                              <span>Landing Pads on this Ramp ({(ramp.landingPads || []).length})</span>
                            </span>
                            <button
                              onClick={() => addLandingPad(ramp.id)}
                              className="px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-700 hover:text-white bg-[#e0f2fe] hover:bg-cyan-600 border border-cyan-400/40 rounded transition-all"
                            >
                              + Add Landing Pad
                            </button>
                          </div>

                          {(ramp.landingPads || []).map((pad, pIdx) => (
                            <div
                              key={pad.id}
                              className="flex flex-col gap-2 p-2.5 rounded bg-[#f8fafc] border border-[#cbd5e1]"
                            >
                              <div className="flex justify-between items-center pb-1 border-b border-[#e2e8f0]">
                                <span className="text-[11px] font-mono font-bold text-cyan-800">
                                  Landing #{pIdx + 1} [{pad.id}]
                                </span>
                                <button
                                  onClick={() => removeLandingPad(ramp.id, pad.id)}
                                  className="text-[#ef4444] hover:text-[#dc2626] font-mono text-[11px] font-bold"
                                >
                                  ✕ Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <CadDimensionField
                                  label="Offset from Incline Start"
                                  value={pad.offset ?? 0}
                                  onChange={(v) => updateLandingPad(ramp.id, pad.id, { offset: v === '' ? 0 : v })}
                                  min={0}
                                  max={ramp.length ? Number(ramp.length) : undefined}
                                  step={1.2}
                                  unit="m"
                                  tooltip="Distance from ramp start in 1.2m increments"
                                />
                                <CadDimensionField
                                  label="Platform Length"
                                  value={pad.length ?? 1.2}
                                  onChange={(v) => updateLandingPad(ramp.id, pad.id, { length: v === '' ? 1.2 : v })}
                                  min={1.2}
                                  step={1.2}
                                  unit="m"
                                  tooltip="Horizontal landing length in 1.2m increments"
                                />
                              </div>

                              {/* Quick actions to branch a new ramp from this landing pad */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
                                <span className="text-[#64748b]">Branch new ramp:</span>
                                <button
                                  onClick={() => addRamp(deck.id, { startSource: 'landing', parentRampId: ramp.id, landingPadId: pad.id, landingFace: 'forward' })}
                                  className="px-2 py-0.5 rounded bg-[#e0f2fe] hover:bg-cyan-600 hover:text-white text-cyan-800 border border-cyan-300 font-bold transition-all"
                                  title="Add ramp continuing straight ahead from this landing"
                                >
                                  + Straight Ahead
                                </button>
                                <button
                                  onClick={() => addRamp(deck.id, { startSource: 'landing', parentRampId: ramp.id, landingPadId: pad.id, landingFace: 'left' })}
                                  className="px-2 py-0.5 rounded bg-[#e0f2fe] hover:bg-cyan-600 hover:text-white text-cyan-800 border border-cyan-300 font-bold transition-all"
                                  title="Add ramp turning 90° left from this landing"
                                >
                                  + Turn Left 90°
                                </button>
                                <button
                                  onClick={() => addRamp(deck.id, { startSource: 'landing', parentRampId: ramp.id, landingPadId: pad.id, landingFace: 'right' })}
                                  className="px-2 py-0.5 rounded bg-[#e0f2fe] hover:bg-cyan-600 hover:text-white text-cyan-800 border border-cyan-300 font-bold transition-all"
                                  title="Add ramp turning 90° right from this landing"
                                >
                                  + Turn Right 90°
                                </button>
                              </div>
                            </div>
                          ))}

                          {(!ramp.landingPads || ramp.landingPads.length === 0) && (
                            <p className="text-[#64748b] text-[11px] font-mono italic text-center py-1">
                              No landing pads configured on this ramp run. Click "+ Add Landing Pad" to add one.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

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
              className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-md overflow-hidden"
            >
              <div className="bg-[#f8fbfd] px-4 py-3 border-b border-[#b8d4e3] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                  <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                    Handrails for Deck {i + 1}{' '}
                    <span className="text-[#64748b] text-sm ml-1 font-normal">
                      [{deck.id}]
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => addHandrail(deck.id)}
                  className="px-3 py-2 text-cyan-600 hover:text-white bg-[#1c202d] hover:bg-cyan-600 border border-cyan-600/30 text-xs font-mono font-bold uppercase tracking-wider transition-all rounded-md"
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
                      className="bg-[#e6f2f5] border border-[#a3c9db] rounded-lg p-4 relative flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-[#a3c9db]">
                        <span className="text-xs font-mono font-bold text-cyan-600">
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

                        <CadDimensionField
                          label="Offset Along Edge"
                          value={handrail.offset ?? 0}
                          onChange={(v) => updateHandrail(handrail.id, { offset: v === '' ? 0 : v })}
                          min={0}
                          step={1.2}
                          unit="m"
                          tooltip="Offset from corner in 1.2m increments"
                        />

                        <CadDimensionField
                          label="Railing Span Length"
                          value={handrail.length ?? 2.4}
                          onChange={(v) => updateHandrail(handrail.id, { length: v === '' ? 2.4 : v })}
                          min={1.2}
                          step={1.2}
                          unit="m"
                          tooltip="Railing span in 1.2m increments"
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
        {activeTab === 'landings' && (
          <div className="flex flex-col gap-4">
            {/* Rule Notice / Empty state when no ramps placed */}
            {ramps.length === 0 ? (
              <div className="bg-[#fffbeb] border-2 border-dashed border-[#fde68a] rounded-xl p-6 text-center flex flex-col items-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center text-amber-600 text-2xl font-bold">
                  ⚠️
                </div>
                <div className="flex flex-col gap-1 max-w-lg">
                  <h4 className="text-sm font-mono font-bold text-[#92400e] uppercase tracking-wider">
                    Landing Pads Cannot Be Added Before a Ramp is Placed
                  </h4>
                  <p className="text-xs font-mono text-[#b45309] leading-relaxed">
                    Landing platforms are structural components integrated into access ramps. Place an access ramp on a deck edge first to enable adding landing pads.
                  </p>
                </div>
                {decks.length > 0 ? (
                  <button
                    onClick={() => {
                      addRamp(decks[0].id);
                      setActiveTab('ramps');
                    }}
                    className="mt-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2"
                  >
                    <span>+ Place First Ramp on Deck 1</span>
                  </button>
                ) : (
                  <p className="text-xs font-mono text-[#64748b] italic">
                    Add a deck first, then place an access ramp.
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Information Header */}
                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-3 text-xs font-mono text-sky-900 flex items-start gap-2.5">
                  <span className="text-sky-600 font-bold text-sm">ℹ</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Landing Platforms & Branching Ramps</span>
                    <span className="text-[11px] text-sky-800 leading-normal">
                      Landing pads are placed along access ramps. Ramps can be started on any 3 of the open faces of a landing (Straight Ahead, Left 90°, Right 90°) or directly from a deck edge.
                    </span>
                  </div>
                </div>

                {ramps.map((ramp, i) => (
                  <div
                    key={ramp.id}
                    className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-md overflow-hidden"
                  >
                    <div className="bg-[#f8fbfd] px-4 py-3 border-b border-[#b8d4e3] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                        <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                          Landings for Ramp {i + 1}{' '}
                          <span className="text-[#64748b] text-sm ml-1 font-normal">
                            [{ramp.id}]
                          </span>
                        </h3>
                      </div>
                      <button
                        onClick={() => addLandingPad(ramp.id)}
                        className="px-3 py-1.5 text-cyan-600 hover:text-white bg-[#1c202d] hover:bg-cyan-600 border border-cyan-600/30 text-xs font-mono font-bold uppercase tracking-wider transition-all rounded-md"
                      >
                        + Add Landing Pad
                      </button>
                    </div>

                    <div className="p-4 md:p-5 flex flex-col gap-3">
                      {(ramp.landingPads || []).map((pad, pIdx) => (
                        <div
                          key={pad.id}
                          className="flex flex-col gap-3 bg-[#e6f2f5] border border-[#a3c9db] p-3.5 rounded-lg relative"
                        >
                          <div className="flex justify-between items-center pb-1 border-b border-[#a3c9db]">
                            <span className="text-xs font-mono font-bold text-cyan-800">
                              Landing #{pIdx + 1} ID: {pad.id}
                            </span>
                            <button
                              onClick={() => removeLandingPad(ramp.id, pad.id)}
                              className="text-[#ef4444] hover:text-[#dc2626] font-mono text-xs font-bold transition-colors"
                            >
                              ✕ Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <CadDimensionField
                              label="Start Offset from Incline Start"
                              value={pad.offset ?? 0}
                              onChange={(v) => updateLandingPad(ramp.id, pad.id, { offset: v === '' ? 0 : v })}
                              min={0}
                              max={ramp.length ? Number(ramp.length) : undefined}
                              step={1.2}
                              unit="m"
                              tooltip="Distance from ramp start in 1.2m increments"
                            />
                            <CadDimensionField
                              label="Landing Platform Length"
                              value={pad.length ?? 1.2}
                              onChange={(v) => updateLandingPad(ramp.id, pad.id, { length: v === '' ? 1.2 : v })}
                              min={1.2}
                              step={1.2}
                              unit="m"
                              tooltip="Horizontal landing length in 1.2m increments"
                            />
                          </div>

                          {/* Branch Ramps from Open Faces */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#c6dfec] text-xs font-mono">
                            <span className="text-[#334155] font-semibold">Start ramp from open face:</span>
                            <button
                              onClick={() => addRamp(ramp.deckId, { startSource: 'landing', parentRampId: ramp.id, landingPadId: pad.id, landingFace: 'forward' })}
                              className="px-2.5 py-1 rounded bg-[#ffffff] hover:bg-cyan-600 hover:text-white text-cyan-800 border border-cyan-300 font-bold transition-all shadow-xs"
                              title="Branch continuing straight ahead from landing"
                            >
                              + Straight Ahead
                            </button>
                            <button
                              onClick={() => addRamp(ramp.deckId, { startSource: 'landing', parentRampId: ramp.id, landingPadId: pad.id, landingFace: 'left' })}
                              className="px-2.5 py-1 rounded bg-[#ffffff] hover:bg-cyan-600 hover:text-white text-cyan-800 border border-cyan-300 font-bold transition-all shadow-xs"
                              title="Branch turning 90° left from landing"
                            >
                              + Turn Left 90°
                            </button>
                            <button
                              onClick={() => addRamp(ramp.deckId, { startSource: 'landing', parentRampId: ramp.id, landingPadId: pad.id, landingFace: 'right' })}
                              className="px-2.5 py-1 rounded bg-[#ffffff] hover:bg-cyan-600 hover:text-white text-cyan-800 border border-cyan-300 font-bold transition-all shadow-xs"
                              title="Branch turning 90° right from landing"
                            >
                              + Turn Right 90°
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!ramp.landingPads || ramp.landingPads.length === 0) && (
                        <p className="text-[#64748b] text-xs font-mono italic text-center py-4">
                          No landing pads configured for this ramp. Click "+ Add Landing Pad" above to add one.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Add Deck Button in Decks tab */}
        {activeTab === 'decks' && (
          <div className="mt-1">
            <button
              onClick={addDeck}
              className="w-full py-3.5 border border-dashed border-[#2d3446] hover:border-cyan-600/60 text-[#475569] hover:text-cyan-600 bg-[#ffffff] hover:bg-[#181c27] rounded-xl font-mono font-medium tracking-wider transition-all text-xs shadow-sm flex items-center justify-center gap-2 group"
            >
              <span className="text-base group-hover:scale-110 transition-transform text-cyan-600">+</span>
              <span>Add Another Scaffold Deck Bay</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="p-4 border-t border-[#b8d4e3] bg-[#ffffff] shrink-0">
        <button
          onClick={onComplete}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-mono font-bold uppercase tracking-wider text-xs rounded-md shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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
