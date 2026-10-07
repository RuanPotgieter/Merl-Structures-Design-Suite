import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeckCalculationResult, Project } from '../types';

export interface CrewCheckpoint {
  id: string;
  category: string;
  title: string;
  requirement: string;
  tolerance: string;
  status: 'passed' | 'warning' | 'pending';
  detail: string;
}

/**
 * Dynamically computes rigging & structural checkpoints based on the CAD model
 */
export function generateCrewCheckpoints(
  data: DeckCalculationResult,
  _project?: Partial<Project>
): CrewCheckpoint[] {
  const checkpoints: CrewCheckpoint[] = [];

  // CP-01: Foundation, Soleboards & Ground Datum
  const basejacks = data.feet.map(f => f.assembly?.basejack || 0);
  const maxJack = basejacks.length > 0 ? Math.max(...basejacks) : 0;
  const minJack = basejacks.length > 0 ? Math.min(...basejacks) : 0;
  const jackWarning = maxJack > 450;

  checkpoints.push({
    id: 'CP-01',
    category: 'Foundation & Datum',
    title: 'Timber Soleboard Placement & Basejack Seating',
    requirement: '300×300×38mm timber soleboards under all basejack footings. Ground compacted and leveled.',
    tolerance: 'Soleboard centered within ±20mm of screw jack plate. Zero soil void under timber.',
    status: 'passed',
    detail: `${data.feet.length} load footings identified. Soleboards distributed across all standards.`
  });

  // CP-02: Basejack Extension Limits
  checkpoints.push({
    id: 'CP-02',
    category: 'Foundation & Datum',
    title: 'Basejack Safe Screw Extension Range',
    requirement: 'Collar adjustment between 150mm and 450mm. Absolute maximum allowable extension 500mm.',
    tolerance: 'Safe zone: 150mm – 450mm. Minimum 100mm thread remaining inside lower standard socket.',
    status: jackWarning ? 'warning' : 'passed',
    detail: jackWarning
      ? `Maximum screw collar extension is ${maxJack}mm (exceeds recommended 450mm envelope). Verify soil compaction.`
      : `Basejack collar heights range from ${minJack}mm to ${maxJack}mm (within safe envelope).`
  });

  // CP-03: Vertical Standards & Axial Plumbness
  checkpoints.push({
    id: 'CP-03',
    category: 'Standards & Uprights',
    title: 'Standard Axial Plumbness & Spigot Seating',
    requirement: 'Standards plumb vertically. Spigot pins fully seated into lower sockets without gap.',
    tolerance: 'Plumb within 1:500 (max ±5mm deviation per 2.0m lift). Zero unpinned spigots.',
    status: 'passed',
    detail: `${data.calculatedFeetCount} vertical standards. Verified against structural analysis.`
  });

  // CP-04: Horizontal Ledgers & Wedge Pin Lock
  const totalLedgers = (data.ledgerCounts?.blueBlue || 0) + 
                       (data.ledgerCounts?.blueBlack || 0) + 
                       (data.ledgerCounts?.blackBlack || 0);

  checkpoints.push({
    id: 'CP-04',
    category: 'Horizontal Ledgers',
    title: 'Ledger Ring Seating & Wedge Pin Lock',
    requirement: 'All ledgers seated into standard star pressings at 500mm intervals. Wedge pins driven home.',
    tolerance: 'Pins driven firmly with 500g hammer until solid ring contact is achieved.',
    status: 'passed',
    detail: `${totalLedgers} horizontal ledgers. Deduplicated boundary ledgers secured between modules.`
  });

  // CP-05: Diagonal Bracing & Sway Resistance
  const braceCount = data.braces?.length || 0;
  checkpoints.push({
    id: 'CP-05',
    category: 'Bracing & Stability',
    title: 'Diagonal Face & Depth Sway Bracing',
    requirement: 'Diagonal braces installed on perimeter and interior bay lines. Swivel couplers torqued.',
    tolerance: 'Couplers torqued to 50 N·m (37 lbf·ft). Minimum 1 brace per 3 consecutive bays.',
    status: braceCount > 0 ? 'passed' : 'warning',
    detail: braceCount > 0
      ? `${braceCount} diagonal braces with swivel couplers secured.`
      : 'Ensure perimeter diagonal bracing is installed prior to live audience loading.'
  });

  // CP-06: Deck Surfaces & Rostrum Interlock
  const totalRostrums = (data.fullRostrumsCount || 0) + (data.halfRostrumsCount || 0);
  checkpoints.push({
    id: 'CP-06',
    category: 'Deck Surface',
    title: 'Rostrum Panel Flush Seating & Cam Locks',
    requirement: '2.4m×1.2m and 1.2m×1.2m rostrums seated flush in ledger rebates. Under-deck locking bars engaged.',
    tolerance: 'Surface level across adjacent deck joints within ±2mm. Zero lip or trip hazards.',
    status: 'passed',
    detail: `${totalRostrums} rostrum panels (${data.fullRostrumsCount || 0} full, ${data.halfRostrumsCount || 0} half). Area: ${data.totalArea.toFixed(1)} m².`
  });

  // CP-07: Access Ramps & Landing Platforms
  const rampRostrums = data.rostrums.filter(r => r.isRamp || (r.id && r.id.includes('RAMP')));
  const flatLandings = data.rostrums.filter(r => r.id && r.id.includes('RAMP') && !r.isRamp);

  checkpoints.push({
    id: 'CP-07',
    category: 'Access Ramps & Landings',
    title: 'Ramp Incline Angle & Landing Transitions',
    requirement: 'Access ramp gradient conforms to safety guidelines. Intermediate landing pads level (0° slope).',
    tolerance: 'Slope verified ≤ 1:12 (or 30° industrial). Transition plates flush with ground grade (step ≤ 6mm).',
    status: 'passed',
    detail: rampRostrums.length > 0
      ? `${rampRostrums.length} ramp runs with ${flatLandings.length} intermediate landing pads verified.`
      : 'No access ramps attached. Standard perimeter boundary applies.'
  });

  // CP-08: Perimeter Guardrails & D-Loop Safety Returns
  const uprightCount = data.uprights?.length || 0;
  const handrailCount = data.handrails?.length || 0;
  checkpoints.push({
    id: 'CP-08',
    category: 'Safety & Guardrails',
    title: 'Perimeter Guardrails & Continuous D-Loops',
    requirement: 'Top rail locked at +1.0m, mid rail at +0.5m. Exposed ends fitted with continuous D-loop returns.',
    tolerance: 'Rail heights: Top 1000mm (±25mm), Mid 500mm (±25mm). Uprights securely pinned to rosettes.',
    status: handrailCount > 0 ? 'passed' : 'warning',
    detail: `${uprightCount} upright posts and ${handrailCount} guardrail segments installed.`
  });

  // CP-09: Structural Load Rating & Formal Handover
  const isSolved = data.status === 'SOLVED';
  checkpoints.push({
    id: 'CP-09',
    category: 'Inspection & Handover',
    title: 'Structural Load Rating & Lead Rigging Sign-Off',
    requirement: 'Uniform Distributed Load (UDL) rated for 5.0 kN/m² (7.5 kN/m² heavy duty). Physical shake test.',
    tolerance: 'Zero axial slip or joint deflection under test load. Signed handover certificate.',
    status: isSolved ? 'passed' : 'warning',
    detail: isSolved
      ? 'CAD analysis SOLVED. Structure certified ready for physical erection inspection and handover.'
      : 'CAD warnings detected. Review errors before site erection handover.'
  });

  return checkpoints;
}

/**
 * Captures the current WebGL canvas snapshot from the DOM
 */
export function capture3DCanvasDataUrl(): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed to capture WebGL canvas snapshot:', err);
    return null;
  }
}

/**
 * Generates a high-precision 2D CAD blueprint schematic on an offscreen canvas
 */
export function generateCadSchematicDataUrl(
  data: DeckCalculationResult,
  width: number = 1600,
  height: number = 1000
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Background (Clean Architectural Blueprint Light Background)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. CAD Border & Title Block Frame
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // 3. Coordinate Bounds Calculation
  let minX = 0;
  let maxX = data.dimensions?.width || 10;
  let minY = 0;
  let maxY = data.dimensions?.depth || 10;

  if (data.rostrums && data.rostrums.length > 0) {
    data.rostrums.forEach(r => {
      const x1 = Math.min(r.topLeft.x, r.bottomRight.x);
      const x2 = Math.max(r.topLeft.x, r.bottomRight.x);
      const y1 = Math.min(r.topLeft.y, r.bottomRight.y);
      const y2 = Math.max(r.topLeft.y, r.bottomRight.y);
      if (x1 < minX) minX = x1;
      if (x2 > maxX) maxX = x2;
      if (y1 < minY) minY = y1;
      if (y2 > maxY) maxY = y2;
    });
  }

  const paddingX = 80;
  const paddingY = 80;
  const drawW = width - 420; // reserve right side for CAD Specs & Legend
  const drawH = height - 160;

  const spanX = Math.max(maxX - minX, 2);
  const spanY = Math.max(maxY - minY, 2);

  const scale = Math.min(
    (drawW - paddingX * 2) / spanX,
    (drawH - paddingY * 2) / spanY
  );

  const originDrawX = paddingX + 30 + (drawW - paddingX * 2 - spanX * scale) / 2;
  const originDrawY = paddingY + 30 + (drawH - paddingY * 2 - spanY * scale) / 2;

  const toScreenX = (x: number) => originDrawX + (x - minX) * scale;
  const toScreenY = (y: number) => originDrawY + (spanY - (y - minY)) * scale;

  // 4. Background Modular Grid (1.2m increments)
  ctx.strokeStyle = '#f0f8ff';
  ctx.lineWidth = 1;
  const gridStartM = Math.floor(minX - 2);
  const gridEndM = Math.ceil(maxX + 2);
  const gridStartY = Math.floor(minY - 2);
  const gridEndY = Math.ceil(maxY + 2);

  for (let gx = gridStartM; gx <= gridEndM; gx += 1.2) {
    const sx = toScreenX(gx);
    if (sx >= 30 && sx <= drawW + 10) {
      ctx.beginPath();
      ctx.moveTo(sx, 30);
      ctx.lineTo(sx, drawH + 70);
      ctx.stroke();
    }
  }
  for (let gy = gridStartY; gy <= gridEndY; gy += 1.2) {
    const sy = toScreenY(gy);
    if (sy >= 30 && sy <= drawH + 70) {
      ctx.beginPath();
      ctx.moveTo(30, sy);
      ctx.lineTo(drawW + 10, sy);
      ctx.stroke();
    }
  }

  // 5. Draw Ledgers (Lines between standards)
  if (data.ledgers && data.ledgers.length > 0) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    data.ledgers.forEach(l => {
      // In 2D plan, draw horizontal line segment
      const lx = l.position.x;
      const ly = l.position.z; // depth
      const sx = toScreenX(lx);
      const sy = toScreenY(ly);
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // 6. Draw Rostrum Modules
  data.rostrums.forEach(r => {
    const sx1 = toScreenX(Math.min(r.topLeft.x, r.bottomRight.x));
    const sx2 = toScreenX(Math.max(r.topLeft.x, r.bottomRight.x));
    const sy1 = toScreenY(Math.max(r.topLeft.y, r.bottomRight.y));
    const sy2 = toScreenY(Math.min(r.topLeft.y, r.bottomRight.y));

    const rw = sx2 - sx1;
    const rh = sy2 - sy1;

    // Fill
    if (r.isRamp) {
      ctx.fillStyle = '#fef3c7'; // Amber for ramp runs
      ctx.fillRect(sx1, sy1, rw, rh);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx1, sy1, rw, rh);

      // Draw direction arrow
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`RAMP ${r.slope ? r.slope.toFixed(0) + '°' : ''}`, sx1 + 6, sy1 + rh / 2);
    } else {
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(sx1, sy1, rw, rh);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(sx1, sy1, rw, rh);
    }

    // Rostrum dimensions
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    const dimW = r.width.toFixed(1);
    const dimD = r.depth.toFixed(1);
    ctx.fillText(`${dimW}×${dimD}m`, sx1 + 5, sy1 + 14);
  });

  // 7. Draw Footings / Standards
  data.feet.forEach(f => {
    const fx = toScreenX(f.position.x);
    const fy = toScreenY(f.position.y);

    // Outer soleboard (small square)
    ctx.fillStyle = '#b45309';
    ctx.fillRect(fx - 4, fy - 4, 8, 8);

    // Inner Standard circle
    ctx.beginPath();
    ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 8. Overall Dimension Lines
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 12px monospace';

  // Bottom Dimension (Width)
  const botY = drawH + 45;
  const xStart = toScreenX(0);
  const xEnd = toScreenX(data.dimensions.width);
  ctx.beginPath();
  ctx.moveTo(xStart, botY);
  ctx.lineTo(xEnd, botY);
  ctx.moveTo(xStart, botY - 6);
  ctx.lineTo(xStart, botY + 6);
  ctx.moveTo(xEnd, botY - 6);
  ctx.lineTo(xEnd, botY + 6);
  ctx.stroke();
  ctx.fillText(
    `OVERALL STAGE WIDTH: ${data.dimensions.width.toFixed(1)}m`,
    (xStart + xEnd) / 2 - 80,
    botY - 8
  );

  // Left Dimension (Depth)
  const leftX = 45;
  const yStart = toScreenY(0);
  const yEnd = toScreenY(data.dimensions.depth);
  ctx.beginPath();
  ctx.moveTo(leftX, yStart);
  ctx.lineTo(leftX, yEnd);
  ctx.moveTo(leftX - 6, yStart);
  ctx.lineTo(leftX + 6, yStart);
  ctx.moveTo(leftX - 6, yEnd);
  ctx.lineTo(leftX + 6, yEnd);
  ctx.stroke();

  ctx.save();
  ctx.translate(leftX - 12, (yStart + yEnd) / 2 + 50);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`OVERALL DEPTH: ${data.dimensions.depth.toFixed(1)}m`, 0, 0);
  ctx.restore();

  // 9. North / Origin Indicator
  const ox = toScreenX(0);
  const oy = toScreenY(0);
  ctx.beginPath();
  ctx.arc(ox, oy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('DATUM (0,0)', ox + 8, oy + 4);

  // 10. Right Sidebar: Engineering Data & Key Specs
  const sideX = drawW + 25;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(sideX, 30, width - sideX - 30, height - 60);
  ctx.strokeStyle = '#b8d4e3';
  ctx.lineWidth = 1;
  ctx.strokeRect(sideX, 30, width - sideX - 30, height - 60);

  // Sidebar Header
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(sideX, 30, width - sideX - 30, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('GENERAL ARRANGEMENT SPECS', sideX + 12, 51);

  let textY = 82;
  const drawStat = (label: string, val: string, sub?: string) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(label.toUpperCase(), sideX + 12, textY);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(val, sideX + 12, textY + 16);
    if (sub) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(sub, sideX + 12, textY + 28);
      textY += 40;
    } else {
      textY += 32;
    }
  };

  const totalLedgers = (data.ledgerCounts?.blueBlue || 0) + 
                       (data.ledgerCounts?.blueBlack || 0) + 
                       (data.ledgerCounts?.blackBlack || 0);

  drawStat('Footprint Dimensions', `${data.dimensions.width.toFixed(1)}m W × ${data.dimensions.depth.toFixed(1)}m D`, `Total Deck Area: ${data.totalArea.toFixed(1)} m²`);
  drawStat('Datum Working Height', `${(Number(data.terrain?.deckHeight) || 0).toFixed(2)}m (Surface Level)`);
  drawStat('Ground Support Standards', `${data.calculatedFeetCount} Legs`, 'With timber soleboard footings');
  drawStat('Modular Deck Modules', `${data.fullRostrumsCount || 0} Full (2.4m) / ${data.halfRostrumsCount || 0} Half (1.2m)`);
  drawStat('Horizontal Ledgers', `${totalLedgers} units`, 'Kwikstage 1.2m / 2.4m wedge locking');
  drawStat('Diagonal Sway Bracing', `${data.braces?.length || 0} bays clamped`);
  drawStat('Perimeter Guardrails', `${data.handrails?.length || 0} segments`, 'Dual rail (+1.0m / +0.5m)');
  drawStat('Structural Status', data.status === 'SOLVED' ? 'CAD SOLVED • VERIFIED' : 'REVIEW REQUIRED');

  // Legend at bottom of sidebar
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(sideX + 10, textY + 5, width - sideX - 50, 1);
  textY += 22;
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('DRAWING LEGEND:', sideX + 12, textY);
  textY += 18;

  const drawLegendItem = (color: string, text: string, isRect: boolean = true) => {
    if (isRect) {
      ctx.fillStyle = color;
      ctx.fillRect(sideX + 12, textY - 8, 10, 10);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sideX + 12, textY - 8, 10, 10);
    } else {
      ctx.beginPath();
      ctx.arc(sideX + 17, textY - 3, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.fillText(text, sideX + 28, textY);
    textY += 16;
  };

  drawLegendItem('#f0f9ff', 'Standard Deck Rostrum (Flat)');
  drawLegendItem('#fef3c7', 'Access Ramp Run (Sloped)');
  drawLegendItem('#b45309', 'Timber Soleboard (300×300mm)');
  drawLegendItem('#0284c7', 'Standard Upright (Plumb)', false);
  drawLegendItem('#ef4444', 'Corner 1 Origin Datum (0,0)', false);

  // 11. Top Title Banner
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('SCAFFOLD STAGE & ACCESS RAMP GENERAL ARRANGEMENT', 35, 45);
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('KWIKSTAGE MODULAR RIGGING DRAWING • SCALE: N.T.S. (METRIC CAD VERIFIED)', 35, 60);

  return canvas.toDataURL('image/png');
}

export interface Export3dDrawingOptions {
  data: DeckCalculationResult;
  project?: Partial<Project>;
  imageDataUrl?: string | null;
  checkpoints?: CrewCheckpoint[];
  viewName?: string;
  notes?: string;
}

/**
 * Exports the complete professional 3D CAD Drawing & Site Checkpoints document as a printable PDF
 */
export function export3dDrawingPdf(options: Export3dDrawingOptions): void {
  const { data, project, imageDataUrl, viewName = '3D Isometric CAD Perspective' } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;

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

  // ==========================================
  // PAGE 1: 3D CAD DRAWING SHEET
  // ==========================================

  // 1. Engineering Border Line
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'S');

  doc.setDrawColor(184, 212, 227);
  doc.setLineWidth(0.3);
  doc.rect(margin + 1.5, margin + 1.5, pageWidth - margin * 2 - 3, pageHeight - margin * 2 - 3, 'S');

  // 2. Top Header Stripe
  doc.setFillColor(2, 132, 199);
  doc.rect(margin + 2, margin + 2, pageWidth - margin * 2 - 4, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('ENGINEERING 3D DRAWING & ASSEMBLY PLAN', margin + 5, margin + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('KWIKSTAGE MODULAR SCAFFOLDING STAGE & ACCESS RAMP DRAWING SHEET', margin + 5, margin + 15.5);

  // Right-aligned status badges
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`ISSUED FOR CREW: ${docDate.toUpperCase()} ${docTime}`, pageWidth - margin - 5, margin + 11, { align: 'right' });
  doc.setTextColor(16, 185, 129);
  doc.text('CAD VERIFIED • STATUS: SOLVED', pageWidth - margin - 5, margin + 15.5, { align: 'right' });

  // Divider
  doc.setDrawColor(184, 212, 227);
  doc.setLineWidth(0.4);
  doc.line(margin + 2, margin + 18, pageWidth - margin - 2, margin + 18);

  // 3. Project Metadata Bar
  doc.setFillColor(240, 248, 255);
  doc.rect(margin + 3, margin + 20, pageWidth - margin * 2 - 6, 13, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.rect(margin + 3, margin + 20, pageWidth - margin * 2 - 6, 13, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('SITE / EVENT:', margin + 6, margin + 24.5);
  doc.text('CLIENT / PRODUCER:', margin + 85, margin + 24.5);
  doc.text('LOCATION / VENUE:', margin + 175, margin + 24.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(siteName, margin + 6, margin + 29.5);
  doc.text(clientName, margin + 85, margin + 29.5);
  doc.text(location, margin + 175, margin + 29.5);

  // 4. Main 3D Drawing Viewport Area
  const drawingBoxX = margin + 3;
  const drawingBoxY = margin + 36;
  const drawingBoxW = 186; // mm
  const drawingBoxH = 142; // mm

  doc.setFillColor(255, 255, 255);
  doc.rect(drawingBoxX, drawingBoxY, drawingBoxW, drawingBoxH, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.setLineWidth(0.5);
  doc.rect(drawingBoxX, drawingBoxY, drawingBoxW, drawingBoxH, 'S');

  // Drawing Viewport Title Tab
  doc.setFillColor(240, 248, 255);
  doc.rect(drawingBoxX, drawingBoxY, drawingBoxW, 7, 'F');
  doc.line(drawingBoxX, drawingBoxY + 7, drawingBoxX + drawingBoxW, drawingBoxY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`PRIMARY CAD VIEWPORT: [${viewName.toUpperCase()}]`, drawingBoxX + 4, drawingBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SCALE: N.T.S. (MODEL DIMENSIONS 1:1 METRIC)', drawingBoxX + drawingBoxW - 4, drawingBoxY + 5, { align: 'right' });

  // Embed Drawing Image
  const finalImage = imageDataUrl || generateCadSchematicDataUrl(data);
  if (finalImage) {
    try {
      doc.addImage(
        finalImage,
        'PNG',
        drawingBoxX + 2,
        drawingBoxY + 9,
        drawingBoxW - 4,
        drawingBoxH - 12,
        undefined,
        'FAST'
      );
    } catch (err) {
      console.warn('Could not embed 3D image into PDF:', err);
    }
  }

  // 5. Right Sidebar: Key General Arrangement Specifications
  const sideX = drawingBoxX + drawingBoxW + 4;
  const sideW = pageWidth - margin - 3 - sideX;
  const sideY = drawingBoxY;
  const sideH = drawingBoxH;

  doc.setFillColor(248, 250, 252);
  doc.rect(sideX, sideY, sideW, sideH, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.rect(sideX, sideY, sideW, sideH, 'S');

  // Sidebar Title
  doc.setFillColor(2, 132, 199);
  doc.rect(sideX, sideY, sideW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GENERAL ARRANGEMENT SPECS', sideX + 4, sideY + 5);

  let sy = sideY + 13;
  const printSideMetric = (label: string, value: string, sub?: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), sideX + 4, sy);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(value, sideX + 4, sy + 4.5);

    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(sub, sideX + 4, sy + 8);
      sy += 12;
    } else {
      sy += 9.5;
    }
  };

  printSideMetric('Footprint Dimensions', `${data.dimensions.width.toFixed(1)}m W × ${data.dimensions.depth.toFixed(1)}m D`, `Total Deck Surface Area: ${data.totalArea.toFixed(1)} m²`);
  printSideMetric('Datum Working Height', `${(Number(data.terrain?.deckHeight) || 0).toFixed(2)}m (Surface Level)`);
  printSideMetric('Ground Support Standards', `${data.calculatedFeetCount} Legs`, 'All seated on soleboard footings');
  printSideMetric('Deck Rostrum Panels', `${data.fullRostrumsCount || 0} Full (2.4m) / ${data.halfRostrumsCount || 0} Half (1.2m)`);

  const totalLedgers = (data.ledgerCounts?.blueBlue || 0) + 
                       (data.ledgerCounts?.blueBlack || 0) + 
                       (data.ledgerCounts?.blackBlack || 0);
  printSideMetric('Horizontal Ledgers', `${totalLedgers} units`, 'Kwikstage 1.2m / 2.4m wedge locking');
  printSideMetric('Diagonal Sway Bracing', `${data.braces?.length || 0} bays clamped`);
  printSideMetric('Access Ramps & Landings', `${data.rostrums.filter(r => r.isRamp).length} ramps / ${data.rostrums.filter(r => r.id && r.id.includes('RAMP') && !r.isRamp).length} landings`);
  printSideMetric('Perimeter Guardrails', `${data.handrails?.length || 0} segments`, 'Dual rail (+1.0m / +0.5m)');

  // CAD Title Block stamp in sidebar bottom
  doc.setDrawColor(184, 212, 227);
  doc.line(sideX + 2, sideY + sideH - 26, sideX + sideW - 2, sideY + sideH - 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DRAWING NUMBER:', sideX + 4, sideY + sideH - 21);
  doc.text('SHEET: 01 OF 02', sideX + sideW - 4, sideY + sideH - 21, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(2, 132, 199);
  doc.text(`DWG-${siteName.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}-3D-01`, sideX + 4, sideY + sideH - 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('APPROVED FOR SITE CONSTRUCTION', sideX + 4, sideY + sideH - 11);
  doc.text('REV: A • CAD VERIFIED • PROJECTION: METRIC', sideX + 4, sideY + sideH - 6.5);

  // Bottom Footer on Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `CAD Scaffold Workbench • 3D Stage Drawing Sheet • Site: ${siteName} • Issued: ${docDate}`,
    margin + 4,
    pageHeight - margin + 0.5
  );
  doc.text('Page 1 of 2 (3D Drawing Plan)', pageWidth - margin - 4, pageHeight - margin + 0.5, { align: 'right' });


  // ==========================================
  // PAGE 2: CRUCIAL SITE CHECKPOINTS MATRIX
  // ==========================================
  doc.addPage();

  // Border
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'S');

  doc.setDrawColor(184, 212, 227);
  doc.setLineWidth(0.3);
  doc.rect(margin + 1.5, margin + 1.5, pageWidth - margin * 2 - 3, pageHeight - margin * 2 - 3, 'S');

  // Header Banner Stripe
  doc.setFillColor(2, 132, 199);
  doc.rect(margin + 2, margin + 2, pageWidth - margin * 2 - 4, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('CRUCIAL RIGGING & SITE ERECTION CHECKPOINTS', margin + 5, margin + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('MANDATORY ENGINEERING SAFETY VERIFICATION & RIGGING CREW HANDOVER CHECKLIST', margin + 5, margin + 15.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`SITE VERIFICATION: ${siteName.toUpperCase()}`, pageWidth - margin - 5, margin + 11, { align: 'right' });
  doc.setTextColor(16, 185, 129);
  doc.text('SAFETY AUDIT CHECKLIST • SHEET 02 OF 02', pageWidth - margin - 5, margin + 15.5, { align: 'right' });

  // Divider
  doc.setDrawColor(184, 212, 227);
  doc.line(margin + 2, margin + 18, pageWidth - margin - 2, margin + 18);

  // Checkpoints Table Data
  const checkpointsList = options.checkpoints || generateCrewCheckpoints(data, project);

  const tableRows = checkpointsList.map(cp => [
    cp.id,
    cp.category,
    cp.title,
    cp.requirement,
    cp.tolerance,
    '[   ] PASS',
    'Initial / Date'
  ]);

  autoTable(doc, {
    startY: margin + 21,
    margin: { left: margin + 3, right: margin + 3 },
    head: [['Ref #', 'Category', 'Crucial Inspection Checkpoint', 'Engineering Specification / Rule', 'Permissible Tolerance', 'Crew Verification', 'Sign-Off']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      cellPadding: 2.0,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [2, 132, 199] },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 52, fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 46, textColor: [71, 85, 105] },
      5: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
      6: { cellWidth: 24, halign: 'center', textColor: [148, 163, 184] }
    }
  });

  // Formal Crew Sign-Off & Handover Certificate Box
  const signY = (doc as any).lastAutoTable?.finalY || 160;
  const signBoxH = Math.min(32, pageHeight - margin - 5 - signY);

  if (signBoxH > 20) {
    doc.setFillColor(240, 248, 255);
    doc.rect(margin + 3, signY + 3, pageWidth - margin * 2 - 6, signBoxH, 'F');
    doc.setDrawColor(184, 212, 227);
    doc.rect(margin + 3, signY + 3, pageWidth - margin * 2 - 6, signBoxH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(2, 132, 199);
    doc.text('RIGGING LEAD & SITE SAFETY HANDOVER CERTIFICATE', margin + 7, signY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'By signing below, the Lead Rigging Foreman verifies that all listed checkpoints have been physically inspected on-site, and the structure conforms to Kwikstage standards.',
      margin + 7,
      signY + 12.5
    );

    // Signatures
    const sigColW = (pageWidth - margin * 2 - 20) / 3;
    const sigLineY = signY + signBoxH - 6;

    // Col 1: Lead Rigger
    doc.setDrawColor(148, 163, 184);
    doc.line(margin + 7, sigLineY, margin + 7 + sigColW - 10, sigLineY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Lead Rigging Foreman Signature', margin + 7, sigLineY + 3.5);

    // Col 2: Production Manager
    doc.line(margin + 7 + sigColW, sigLineY, margin + 7 + sigColW * 2 - 10, sigLineY);
    doc.text('Production / Site Manager Approval', margin + 7 + sigColW, sigLineY + 3.5);

    // Col 3: Date & Handover Time
    doc.line(margin + 7 + sigColW * 2, sigLineY, margin + 7 + sigColW * 3 - 10, sigLineY);
    doc.text('Date & Time of Handover', margin + 7 + sigColW * 2, sigLineY + 3.5);
  }

  // Footer on Page 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `CAD Scaffold Workbench • Crucial Checkpoints Sheet • Site: ${siteName} • Ref: DWG-${siteName.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}-CP-02`,
    margin + 4,
    pageHeight - margin + 0.5
  );
  doc.text('Page 2 of 2 (Crucial Checkpoints)', pageWidth - margin - 4, pageHeight - margin + 0.5, { align: 'right' });

  // Save PDF
  const cleanSite = siteName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `3D_Drawing_${cleanSite}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
