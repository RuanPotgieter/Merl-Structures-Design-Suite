import React, { useState, useMemo } from 'react';
import { DeckCalculationResult } from '../types';
import { COMPONENT_COLORS, STANDARD_DESCRIPTIONS } from '../constants';
import { StructuralIntegrityPanel } from './StructuralIntegrityPanel';
import { 
  ShieldCheck, 
  Boxes, 
  Search, 
  Filter, 
  Layers, 
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface BillOfMaterialsProps {
  data: DeckCalculationResult;
}

export const BillOfMaterials: React.FC<BillOfMaterialsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'structural' | 'schedule'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const inventory: Record<string, { count: number; id: string; category: string; color?: string }> = {};

  // Rostrums
  if (data.fullRostrumsCount > 0) {
    inventory['Full Rostrum (2.4m × 1.2m)'] = {
      count: data.fullRostrumsCount,
      category: 'Deck / Rostrum',
      id: 'ROST-24-12',
      color: '#0284c7'
    };
  }
  if (data.halfRostrumsCount > 0) {
    inventory['Half Rostrum (1.2m × 1.2m)'] = {
      count: data.halfRostrumsCount,
      category: 'Deck / Rostrum',
      id: 'ROST-12-12',
      color: '#38bdf8'
    };
  }

  // Feet & Base Infrastructure
  data.feet.forEach(f => {
    if (!f.assembly) return;

    const { basejack, pipe, standards } = f.assembly;

    // Basejack
    if (basejack > 0) {
      const bjKey = `${basejack}mm Basejack`;
      inventory[bjKey] = inventory[bjKey] || { count: 0, category: 'Base', id: `BJ-${basejack}`, color: '#64748b' };
      inventory[bjKey].count++;

      // Soleboard / woodblock
      const sbKey = 'Woodblock / Sole Board (300×300mm)';
      inventory[sbKey] = inventory[sbKey] || { count: 0, category: 'Base', id: 'SOLE-300', color: '#b45309' };
      inventory[sbKey].count++;
    }

    // Pipe
    if (pipe > 0) {
      const pKey = `${pipe}mm Pipe`;
      inventory[pKey] = inventory[pKey] || { count: 0, category: 'Support Pipe', id: `PP-${pipe}`, color: COMPONENT_COLORS.INFRASTRUCTURE.PIPE };
      inventory[pKey].count++;
    }

    // Standards
    standards.forEach(s => {
      if (s > 0) {
        const sKey = STANDARD_DESCRIPTIONS[s] || `${s}mm Standard`;
        inventory[sKey] = inventory[sKey] || { 
          count: 0, 
          category: 'Standard', 
          id: `STD-${s}`, 
          color: (COMPONENT_COLORS.STANDARDS as any)[s/1000] 
        };
        inventory[sKey].count++;
      }
    });
  });

  // Add Ledgers to Inventory
  if (data.ledgerCounts) {
    if (data.ledgerCounts.blueBlack > 0) {
      inventory['Blue-Black Ledger (1.2m)'] = {
        count: data.ledgerCounts.blueBlack,
        category: 'Ledger',
        id: 'LDG-PUR-1200',
        color: '#a855f7' // Purple
      };
    }
    if (data.ledgerCounts.blackBlack > 0) {
      inventory['Black-Black Ledger (1.2m)'] = {
        count: data.ledgerCounts.blackBlack,
        category: 'Ledger',
        id: 'LDG-BLU-1200',
        color: '#3b82f6' // Blue
      };
    }
    if (data.ledgerCounts.blueBlue > 0) {
      inventory['Blue-Blue Ledger (2.4m)'] = {
        count: data.ledgerCounts.blueBlue,
        category: 'Ledger',
        id: 'LDG-GRN-2400',
        color: '#22c55e' // Green
      };
    }
  }

  // Add Braces to Inventory
  if (data.braces && data.braces.length > 0) {
    inventory['Diagonal Face/Depth Brace'] = {
      count: data.braces.length,
      category: 'Bracing',
      id: 'BRC-DIAG',
      color: '#dc2626' // Red
    };
  }

  // Add Swivel Couplers (Light Pink) to Inventory
  if (data.swivelConnectors && data.swivelConnectors.length > 0) {
    inventory['Swivel Coupler (Light Pink)'] = {
      count: data.swivelConnectors.length,
      category: 'Bracing',
      id: 'COUPLER-SWIVEL-PNK',
      color: '#f472b6' // Light Pink
    };
  }

  // Add Uprights to Inventory
  if (data.uprights) {
    data.uprights.forEach(u => {
      let name = '';
      switch (u.type) {
        case 'DOUBLE': name = 'Double Upright'; break;
        case 'LEFT': name = 'Left Termination Upright'; break;
        case 'RIGHT': name = 'Right Start Upright'; break;
        case 'OUTSIDE_CORNER': name = 'Outside Corner Upright'; break;
        case 'INSIDE_CORNER': name = 'Inside Corner Upright'; break;
      }
      inventory[name] = inventory[name] || {
        count: 0,
        category: 'Handrail',
        id: `UPR-${u.type.substring(0, 3)}`,
        color: '#a0a5aa'
      };
      inventory[name].count++;
    });
  }

  // Add Handrails to Inventory
  if (data.handrails) {
    data.handrails.forEach(hr => {
      if (hr.isTermination) {
        const name = `Handrail D-Loop Safety Return`;
        inventory[name] = inventory[name] || {
          count: 0,
          category: 'Handrail',
          id: `HR-RET-LOOP`,
          color: '#eab308'
        };
        inventory[name].count++;
        return;
      }
      const lenStr = hr.length >= 1.0 ? `${hr.length.toFixed(1)}m` : `${(hr.length * 1000).toFixed(0)}mm`;
      const name = `${lenStr} Handrail Set`;
      inventory[name] = inventory[name] || {
        count: 0,
        category: 'Handrail',
        id: `HR-${hr.length.toFixed(1)}`,
        color: '#eab308' // Safety yellow
      };
      inventory[name].count++;
    });
  }

  const allRows = useMemo(() => {
    return Object.entries(inventory).map(([name, d]) => ({
      id: d.id,
      category: d.category,
      desc: name,
      qty: d.count,
      color: d.color
    }));
  }, [inventory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(r => set.add(r.category));
    return ['ALL', ...Array.from(set)];
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      const matchesSearch = 
        row.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || row.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allRows, searchTerm, selectedCategory]);

  const totalPartsCount = useMemo(() => {
    return allRows.reduce((sum, r) => sum + r.qty, 0);
  }, [allRows]);

  return (
    <div className="w-full flex flex-col font-mono text-xs text-[#0f172a] bg-[#ffffff]">
      {/* Sub-Navigation Tabs */}
      <div className="px-5 py-3 bg-[#f0f8ff] border-b border-[#b8d4e3] flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2 p-1 bg-[#ffffff] rounded-lg border border-[#a3c9db] shadow-2xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-[#0284c7] text-white font-bold shadow-xs'
                : 'text-[#475569] hover:bg-[#e0f2fe]'
            }`}
          >
            <Boxes size={14} />
            <span>Complete Engineering Report</span>
          </button>

          <button
            onClick={() => setActiveTab('structural')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeTab === 'structural'
                ? 'bg-[#0284c7] text-white font-bold shadow-xs'
                : 'text-[#475569] hover:bg-[#e0f2fe]'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Structural Integrity Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeTab === 'schedule'
                ? 'bg-[#0284c7] text-white font-bold shadow-xs'
                : 'text-[#475569] hover:bg-[#e0f2fe]'
            }`}
          >
            <ClipboardList size={14} />
            <span>Component Schedule ({allRows.length} SKUs)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64748b] font-mono">
          <span className="bg-[#e0f2fe] text-[#0369a1] px-2.5 py-1 rounded-md border border-[#bae6fd] font-semibold">
            {totalPartsCount} Total Components
          </span>
          <span className="hidden sm:inline bg-[#e0f2fe] text-[#0369a1] px-2.5 py-1 rounded-md border border-[#bae6fd] font-semibold">
            {allRows.length} Hardware SKUs
          </span>
        </div>
      </div>

      {/* Structural Integrity Dashboard Panel */}
      {(activeTab === 'all' || activeTab === 'structural') && (
        <StructuralIntegrityPanel data={data} />
      )}

      {/* Bill of Materials Component Table */}
      {(activeTab === 'all' || activeTab === 'schedule') && (
        <div className="w-full flex flex-col">
          {/* Table Toolbar & Search Bar */}
          <div className="px-5 py-3 bg-[#ffffff] border-b border-[#b8d4e3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Filter part ID, category, or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#f8fbfd] border border-[#a3c9db] text-xs font-mono text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-[#64748b] uppercase font-semibold mr-1 flex items-center gap-1">
                <Filter size={11} className="text-[#0284c7]" />
                Category:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#0284c7] text-white font-bold'
                      : 'bg-[#f0f8ff] text-[#475569] hover:bg-[#e0f2fe] border border-[#bae6fd]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f0f8ff] border-b border-[#b8d4e3] text-[#475569] text-left">
                  <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none w-12 text-center bg-[#eef5f9] text-[#64748b]">#</th>
                  <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none w-32 text-[#0284c7]">Part ID</th>
                  <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none w-40">Category</th>
                  <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none">Component Description</th>
                  <th className="py-2.5 px-3 font-semibold select-none text-right w-28 text-[#0f172a]">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#64748b] font-mono">
                      No components found matching &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, i) => (
                    <tr 
                      key={i} 
                      className={`border-b border-[#b8d4e3] hover:bg-[#e0f2fe]/50 transition-colors ${
                        i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#f8fbfd]'
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-[#b8d4e3] text-[#64748b] text-center bg-[#eef5f9]">
                        {i + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-[#b8d4e3] font-mono text-[#0284c7] font-semibold">
                        {row.id}
                      </td>
                      <td className="py-2 px-3 border-r border-[#b8d4e3] text-[#475569]">
                        <span className="px-2 py-1 rounded bg-[#e0f2fe] border border-[#bae6fd] text-[11px] text-[#0369a1] font-medium">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-[#b8d4e3] text-[#0f172a]">
                        <div className="flex items-center gap-2.5">
                          {row.color && (
                            <div 
                              className="w-2.5 h-2.5 rounded-xs border border-[#334155]/30 shadow-2xs shrink-0" 
                              style={{ backgroundColor: row.color }} 
                            />
                          )}
                          <span className="font-medium">{row.desc}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#0f172a] text-sm">
                        {row.qty.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#f0f8ff] border-t-2 border-[#0284c7] text-[#0f172a] font-bold">
                  <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider font-mono">
                    Total Component Assemblies:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-[#0284c7]">
                    {filteredRows.reduce((acc, r) => acc + r.qty, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

