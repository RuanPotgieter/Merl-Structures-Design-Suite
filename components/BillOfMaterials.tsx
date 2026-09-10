import React from 'react';
import { DeckCalculationResult } from '../types';
import { COMPONENT_COLORS, STANDARD_DESCRIPTIONS } from '../constants';

interface BillOfMaterialsProps {
  data: DeckCalculationResult;
}

export const BillOfMaterials: React.FC<BillOfMaterialsProps> = ({ data }) => {
  const inventory: Record<string, { count: number; id: string; category: string; color?: string }> = {};

  data.feet.forEach(f => {
    if (!f.assembly) return;

    const { basejack, pipe, standards } = f.assembly;

    // Basejack
    if (basejack > 0) {
      const bjKey = `${basejack}mm Basejack`;
      inventory[bjKey] = inventory[bjKey] || { count: 0, category: 'Base', id: `BJ-${basejack}` };
      inventory[bjKey].count++;
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
      inventory['Blue-Black Ledger'] = {
        count: data.ledgerCounts.blueBlack,
        category: 'Ledger',
        id: 'LDG-PUR',
        color: '#a855f7' // Purple
      };
    }
    if (data.ledgerCounts.blackBlack > 0) {
      inventory['Black-Black Ledger'] = {
        count: data.ledgerCounts.blackBlack,
        category: 'Ledger',
        id: 'LDG-BLU',
        color: '#3b82f6' // Blue
      };
    }
    if (data.ledgerCounts.blueBlue > 0) {
      inventory['Blue-Blue Ledger'] = {
        count: data.ledgerCounts.blueBlue,
        category: 'Ledger',
        id: 'LDG-GRN',
        color: '#22c55e' // Green
      };
    }
  }

  // Add Braces to Inventory
  if (data.braces && data.braces.length > 0) {
    inventory['Diagonal Brace'] = {
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

  const rows = Object.entries(inventory).map(([name, d]) => ({
    id: d.id,
    category: d.category,
    desc: name,
    qty: d.count,
    color: d.color
  }));

  return (
    <div className="w-full text-xs font-mono bg-[#ffffff] text-[#0f172a] overflow-x-auto border-t border-[#b8d4e3]">
       <table className="w-full border-collapse">
          <thead>
             <tr className="bg-[#f0f8ff] border-b border-[#b8d4e3] text-[#475569] text-left">
                <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none w-10 text-center bg-[#eef5f9] text-[#64748b]">#</th>
                <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none w-28 text-cyan-600">Part ID</th>
                <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none w-36">Category</th>
                <th className="py-2.5 px-3 border-r border-[#b8d4e3] font-semibold select-none">Component Description</th>
                <th className="py-2.5 px-3 font-semibold select-none text-right w-24 text-[#334155]">Quantity</th>
             </tr>
          </thead>
          <tbody>
             {rows.map((row, i) => (
                <tr key={i} className={`border-b border-[#b8d4e3] hover:bg-[#e6f2f5] transition-colors ${i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#f8fbfd]'}`}>
                   <td className="py-2 px-3 border-r border-[#b8d4e3] text-[#64748b] text-center bg-[#eef5f9]">{i + 1}</td>
                   <td className="py-2 px-3 border-r border-[#b8d4e3] font-mono text-cyan-600 font-semibold">{row.id}</td>
                   <td className="py-2 px-3 border-r border-[#b8d4e3] text-[#475569]">
                     <span className="px-2 py-2 rounded bg-[#dcebf0] border border-[#a3c9db] text-xs">
                       {row.category}
                     </span>
                   </td>
                   <td className="py-2 px-3 border-r border-[#b8d4e3] text-[#0f172a]">
                     <div className="flex items-center gap-2.5">
                        {row.color && <div className="w-2.5 h-2.5 rounded-sm border border-[#2e3547] shadow-sm shrink-0" style={{ backgroundColor: row.color }}></div>}
                        <span>{row.desc}</span>
                     </div>
                   </td>
                   <td className="py-2 px-3 text-right font-bold text-[#0f172a]">{row.qty}</td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
};
