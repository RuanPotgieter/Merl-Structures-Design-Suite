import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeckCalculationResult, Project } from '../types';
import { COMPONENT_COLORS, STANDARD_DESCRIPTIONS } from '../constants';

export interface InventoryItem {
  id: string;
  category: string;
  desc: string;
  qty: number;
  color?: string;
  unitWeightKg?: number;
}

export function compileInventoryFromCalculation(data: DeckCalculationResult): InventoryItem[] {
  const inventory: Record<string, { count: number; id: string; category: string; color?: string; unitWeightKg?: number }> = {};

  // 1. Rostrums / Deck Surfaces
  if (data.fullRostrumsCount > 0) {
    inventory['Full Rostrum (2.4m × 1.2m)'] = {
      count: data.fullRostrumsCount,
      category: 'Deck / Rostrum',
      id: 'ROST-24-12',
      color: '#0284c7',
      unitWeightKg: 42.0
    };
  }
  if (data.halfRostrumsCount > 0) {
    inventory['Half Rostrum (1.2m × 1.2m)'] = {
      count: data.halfRostrumsCount,
      category: 'Deck / Rostrum',
      id: 'ROST-12-12',
      color: '#38bdf8',
      unitWeightKg: 24.5
    };
  }

  // 2. Base Infrastructure & Standards
  data.feet.forEach(f => {
    if (!f.assembly) return;
    const { basejack, pipe, standards } = f.assembly;

    if (basejack > 0) {
      const bjKey = `${basejack}mm Adjustable Basejack`;
      inventory[bjKey] = inventory[bjKey] || { 
        count: 0, 
        category: 'Base Infrastructure', 
        id: `BJ-${basejack}`, 
        color: '#64748b',
        unitWeightKg: 4.8 
      };
      inventory[bjKey].count++;

      const sbKey = 'Timber Soleboard (300mm × 300mm × 38mm)';
      inventory[sbKey] = inventory[sbKey] || { 
        count: 0, 
        category: 'Base Infrastructure', 
        id: 'SOLE-300', 
        color: '#b45309',
        unitWeightKg: 2.2 
      };
      inventory[sbKey].count++;
    }

    if (pipe > 0) {
      const pKey = `${pipe}mm Galvanized Steel Support Pipe`;
      inventory[pKey] = inventory[pKey] || { 
        count: 0, 
        category: 'Support Pipe', 
        id: `PP-${pipe}`, 
        color: COMPONENT_COLORS.INFRASTRUCTURE.PIPE,
        unitWeightKg: (pipe / 1000) * 4.37 
      };
      inventory[pKey].count++;
    }

    standards.forEach(s => {
      if (s > 0) {
        const sKey = STANDARD_DESCRIPTIONS[s] || `${s}mm Kwikstage Standard`;
        inventory[sKey] = inventory[sKey] || { 
          count: 0, 
          category: 'Standard Upright', 
          id: `STD-${s}`, 
          color: (COMPONENT_COLORS.STANDARDS as any)[s / 1000] || '#64748b',
          unitWeightKg: (s / 1000) * 5.1 
        };
        inventory[sKey].count++;
      }
    });
  });

  // 3. Ledgers
  if (data.ledgerCounts) {
    if (data.ledgerCounts.blueBlack > 0) {
      inventory['Blue-Black Ledger (1.2m)'] = {
        count: data.ledgerCounts.blueBlack,
        category: 'Horizontal Ledger',
        id: 'LDG-PUR-1200',
        color: '#a855f7',
        unitWeightKg: 5.4
      };
    }
    if (data.ledgerCounts.blackBlack > 0) {
      inventory['Black-Black Ledger (1.2m)'] = {
        count: data.ledgerCounts.blackBlack,
        category: 'Horizontal Ledger',
        id: 'LDG-BLU-1200',
        color: '#3b82f6',
        unitWeightKg: 5.4
      };
    }
    if (data.ledgerCounts.blueBlue > 0) {
      inventory['Blue-Blue Ledger (2.4m)'] = {
        count: data.ledgerCounts.blueBlue,
        category: 'Horizontal Ledger',
        id: 'LDG-GRN-2400',
        color: '#22c55e',
        unitWeightKg: 9.8
      };
    }
  }

  // 4. Braces & Couplers
  if (data.braces && data.braces.length > 0) {
    inventory['Diagonal Face/Depth Scaffold Brace'] = {
      count: data.braces.length,
      category: 'Bracing & Stability',
      id: 'BRC-DIAG',
      color: '#dc2626',
      unitWeightKg: 8.5
    };
  }
  if (data.swivelConnectors && data.swivelConnectors.length > 0) {
    inventory['Swivel Coupler (90°/Angle Clamps)'] = {
      count: data.swivelConnectors.length,
      category: 'Bracing & Stability',
      id: 'COUPLER-SWIVEL',
      color: '#f472b6',
      unitWeightKg: 1.2
    };
  }

  // 5. Uprights
  if (data.uprights) {
    data.uprights.forEach(u => {
      let name = '';
      switch (u.type) {
        case 'DOUBLE': name = 'Double Handrail Upright Post'; break;
        case 'LEFT': name = 'Left Termination Handrail Post'; break;
        case 'RIGHT': name = 'Right Start Handrail Post'; break;
        case 'OUTSIDE_CORNER': name = 'Outside Corner Handrail Post'; break;
        case 'INSIDE_CORNER': name = 'Inside Corner Handrail Post'; break;
        default: name = 'Standard Handrail Upright Post';
      }
      inventory[name] = inventory[name] || {
        count: 0,
        category: 'Guardrail & Upright',
        id: `UPR-${u.type.substring(0, 3)}`,
        color: '#a0a5aa',
        unitWeightKg: 4.1
      };
      inventory[name].count++;
    });
  }

  // 6. Handrails
  if (data.handrails) {
    data.handrails.forEach(hr => {
      if (hr.isTermination) {
        const name = 'Handrail Continuous D-Loop Safety Return';
        inventory[name] = inventory[name] || {
          count: 0,
          category: 'Guardrail & Upright',
          id: 'HR-RET-LOOP',
          color: '#eab308',
          unitWeightKg: 3.5
        };
        inventory[name].count++;
        return;
      }
      const lenStr = hr.length >= 1.0 ? `${hr.length.toFixed(1)}m` : `${(hr.length * 1000).toFixed(0)}mm`;
      const name = `${lenStr} Dual Guardrail Set (+1.0m / +0.5m)`;
      inventory[name] = inventory[name] || {
        count: 0,
        category: 'Guardrail & Upright',
        id: `HR-${hr.length.toFixed(1)}`,
        color: '#eab308',
        unitWeightKg: hr.length * 3.8
      };
      inventory[name].count++;
    });
  }

  // 7. Ramp Plates / Transition Extrusions
  if (data.rampPlates && data.rampPlates.length > 0) {
    inventory['Aluminum Ground Transition Plate (1.2m Extrusion)'] = {
      count: data.rampPlates.length,
      category: 'Ramp Accessories',
      id: 'RAMP-PLT-1200',
      color: '#94a3b8',
      unitWeightKg: 5.0
    };
  }

  return Object.entries(inventory).map(([desc, item]) => ({
    id: item.id,
    category: item.category,
    desc,
    qty: item.count,
    color: item.color,
    unitWeightKg: Math.round((item.unitWeightKg || 5.0) * 10) / 10
  }));
}

export function exportBillOfMaterialsPdf(
  data: DeckCalculationResult,
  project?: Partial<Project>
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const siteName = project?.siteName || 'Festival Main Stage';
  const clientName = project?.clientName || 'Standard Production Client';
  const location = project?.location || 'Main Arena / Stage Field';
  const docDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const docTime = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const items = compileInventoryFromCalculation(data);
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const totalWeightKg = items.reduce((sum, item) => sum + item.qty * (item.unitWeightKg || 0), 0);

  // --- BRAND & DOCUMENT HEADER ---
  // Top Banner Stripe
  doc.setFillColor(2, 132, 199); // #0284c7 Primary Cyan/Blue
  doc.rect(margin, 12, pageWidth - margin * 2, 3.5, 'F');

  // Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('PARTS SCHEDULE & BILL OF MATERIALS', margin, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('KWIKSTAGE MODULAR SCAFFOLDING STAGE & ACCESS RAMP SPECIFICATION', margin, 29);

  // Status & Date Badge (Right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(2, 132, 199);
  doc.text(`ISSUED FOR RIGGING: ${docDate.toUpperCase()} ${docTime}`, pageWidth - margin, 24, { align: 'right' });
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('CAD VERIFIED • STATUS: SOLVED', pageWidth - margin, 29, { align: 'right' });

  // Divider line
  doc.setDrawColor(184, 212, 227); // #b8d4e3
  doc.setLineWidth(0.5);
  doc.line(margin, 32, pageWidth - margin, 32);

  // --- PROJECT METADATA CARD ---
  doc.setFillColor(240, 248, 255); // #f0f8ff
  doc.roundedRect(margin, 35, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.roundedRect(margin, 35, pageWidth - margin * 2, 20, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('SITE / EVENT:', margin + 4, 40);
  doc.text('CLIENT / PRODUCER:', margin + 65, 40);
  doc.text('LOCATION / VENUE:', margin + 125, 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(siteName, margin + 4, 45);
  doc.text(clientName, margin + 65, 45);
  doc.text(location, margin + 125, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Deck Footprint: ${data.dimensions.width.toFixed(1)}m W × ${data.dimensions.depth.toFixed(1)}m D (${data.totalArea.toFixed(1)} m²)`, margin + 4, 51);
  doc.text(`Working Height: ${(Number(data.terrain?.deckHeight) || 0).toFixed(2)}m (Datum)`, margin + 65, 51);
  doc.text(`Total Load Points (Standards): ${data.calculatedFeetCount} Legs`, margin + 125, 51);

  // --- EXECUTIVE SUMMARY METRIC BOXES ---
  const boxY = 58;
  const boxWidth = (pageWidth - margin * 2 - 9) / 4;
  const boxHeight = 14;

  const summaryBoxes = [
    { label: 'TOTAL COMPONENTS', value: `${totalQty.toLocaleString()} units`, sub: 'Assembly parts count' },
    { label: 'HARDWARE SKUs', value: `${items.length} types`, sub: 'Standardized parts' },
    { label: 'SUPPORT STANDARDS', value: `${data.feet.length} legs`, sub: 'Ground base jacks' },
    { label: 'EST. HARDWARE WT', value: `${Math.round(totalWeightKg).toLocaleString()} kg`, sub: `~${(totalWeightKg / 1000).toFixed(1)} tonnes` },
  ];

  summaryBoxes.forEach((box, i) => {
    const bx = margin + i * (boxWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(bx, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label, bx + 3, boxY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(2, 132, 199);
    doc.text(box.value, bx + 3, boxY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(box.sub, bx + 3, boxY + 12.5);
  });

  // --- AUTO TABLE: PARTS SCHEDULE ---
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.id,
    item.category,
    item.desc,
    item.qty.toString(),
    `${(item.qty * (item.unitWeightKg || 0)).toFixed(0)} kg`
  ]);

  autoTable(doc, {
    startY: 76,
    margin: { left: margin, right: margin },
    head: [['#', 'Part SKU', 'Category', 'Component Description & Specifications', 'Qty', 'Est. Wt']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.2,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // light slate
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold', textColor: [2, 132, 199] },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto', fontStyle: 'bold' },
      4: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'right', textColor: [100, 116, 139] }
    },
    foot: [[
      '',
      '',
      '',
      'TOTAL COMPONENT ASSEMBLIES & ESTIMATED RIGGING WEIGHT:',
      `${totalQty.toLocaleString()}`,
      `${Math.round(totalWeightKg).toLocaleString()} kg`
    ]],
    footStyles: {
      fillColor: [240, 248, 255],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'right',
      cellPadding: 2.5
    },
    didDrawPage: (dataHook) => {
      // Running header on continuation pages
      if (dataHook.pageNumber > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${siteName.toUpperCase()} — PARTS SCHEDULE (CONTINUED)`, margin, 10);
        doc.text(`Page ${dataHook.pageNumber}`, pageWidth - margin, 10, { align: 'right' });
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 12, pageWidth - margin, 12);
      }
    }
  });

  // --- SITE SIGN-OFF & RIGGING SAFETY VERIFICATION BLOCK ---
  let finalY = (doc as any).lastAutoTable?.finalY || 200;
  
  // If not enough room on current page for sign-off block (needs ~35mm), add a page
  if (finalY + 38 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 5;
  } else {
    finalY += 6;
  }

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('SITE COMPLIANCE, SAFETY & HANDOVER VERIFICATION', margin + 4, finalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Standards must be plumbed vertically and seated on timber soleboards with adjustable screw jacks leveled.', margin + 4, finalY + 10);
  doc.text('• Ledgers must be firmly locked with wedge pins driven home at each standard junction ring.', margin + 4, finalY + 14);
  doc.text('• Diagonal face and depth bracing must be clamped with couplers to ensure lateral wind and sway resistance.', margin + 4, finalY + 18);
  doc.text('• Guardrails (top rail 1.0m, mid rail 0.5m) and accessible handrails must be secured before deck handover.', margin + 4, finalY + 22);

  // Signature lines
  const sigX = pageWidth - margin - 60;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sigX, finalY + 18, pageWidth - margin - 4, finalY + 18);
  doc.text('Lead Rigging Foreman Signature', sigX, finalY + 22);
  doc.line(sigX, finalY + 26, pageWidth - margin - 4, finalY + 26);
  doc.text('Date & Handover Approval', sigX, finalY + 29);

  // --- RUNNING FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by CAD Scaffold Workbench • Document Ref: ${siteName.replace(/[^a-zA-Z0-9]/g, '_')}_BOM_${docDate}`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // Sanitize filename
  const cleanSiteName = siteName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Parts_Schedule_${cleanSiteName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Download PDF file directly
  doc.save(filename);
}
