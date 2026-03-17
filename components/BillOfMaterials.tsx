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
    if (data.ledgerCounts.purple > 0) {
      inventory['Blue-Black Ledger'] = {
        count: data.ledgerCounts.purple,
        category: 'Ledger',
        id: 'LDG-PUR',
        color: '#a855f7' // Purple
      };
    }
    if (data.ledgerCounts.blue > 0) {
      inventory['Black-Black Ledger'] = {
        count: data.ledgerCounts.blue,
        category: 'Ledger',
        id: 'LDG-BLU',
        color: '#3b82f6' // Blue
      };
    }
    if (data.ledgerCounts.green > 0) {
      inventory['Blue-Blue Ledger'] = {
        count: data.ledgerCounts.green,
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
      color: '#ffe600' // Yellow
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
      // 1 set of handrail = 2 tubes. Since we emit 1 Handrail object per set, we just count them.
      // Wait, the prompt says "1 set of handrail consist of 2 square tubes of the same length."
      // Let's just list the handrail set.
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
    <div className="w-full text-[13px] font-sans bg-white text-black overflow-x-auto border border-[#d4d4d4] shadow-sm">
       <table className="w-full border-collapse">
          <thead>
             <tr className="bg-[#f3f2f1] border-b border-[#d4d4d4] text-[#323130] text-left">
                <th className="py-1 px-2 border-r border-[#d4d4d4] font-normal select-none w-8 text-center bg-[#e1dfdd] border-b-[#d4d4d4]"></th>
                <th className="py-1 px-2 border-r border-[#d4d4d4] font-normal select-none w-24 hover:bg-[#e1dfdd] cursor-pointer">Part ID</th>
                <th className="py-1 px-2 border-r border-[#d4d4d4] font-normal select-none w-32 hover:bg-[#e1dfdd] cursor-pointer">Category</th>
                <th className="py-1 px-2 border-r border-[#d4d4d4] font-normal select-none hover:bg-[#e1dfdd] cursor-pointer">Description</th>
                <th className="py-1 px-2 font-normal select-none text-right w-20 hover:bg-[#e1dfdd] cursor-pointer">Qty</th>
             </tr>
          </thead>
          <tbody>
             {rows.map((row, i) => (
                <tr key={i} className={`border-b border-[#e1dfdd] hover:bg-[#f3f2f1] ${i % 2 === 0 ? 'bg-white' : 'bg-white'}`}>
                   <td className="py-1 px-2 border-r border-[#d4d4d4] text-[#605e5c] text-center bg-[#f3f2f1]">{i + 1}</td>
                   <td className="py-1 px-2 border-r border-[#e1dfdd] font-mono text-[#0078d4]">{row.id}</td>
                   <td className="py-1 px-2 border-r border-[#e1dfdd] text-[#323130]">{row.category}</td>
                   <td className="py-1 px-2 border-r border-[#e1dfdd] flex items-center gap-2 text-[#323130]">
                      {row.color && <div className="w-2.5 h-2.5 rounded-sm border border-[#c8c6c4]" style={{ backgroundColor: row.color }}></div>}
                      {row.desc}
                   </td>
                   <td className="py-1 px-2 text-right text-[#323130]">{row.qty}</td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
};
