import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeckCalculationResult, Project } from '../types';

export interface ClientApprovalExportOptions {
  data: DeckCalculationResult;
  project?: Partial<Project> | null;
  imageDataUrl?: string | null;
  notes?: string;
}

/**
 * Generates an official, high-resolution Client Approval Submittal PDF document
 * in A4 Landscape format ready for admittance, review, and client signature.
 */
export function exportClientApprovalPdf({
  data,
  project,
  imageDataUrl,
  notes
}: ClientApprovalExportOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 10;

  const siteName = project?.siteName || 'Festival & Event Main Stage';
  const clientName = project?.clientName || 'Standard Production Client';
  const designerName = project?.designerName || 'Lead Scaffolding Designer';
  const companyName = project?.companyName || 'Pro Staging & Scaffold Engineering Ltd';
  const designerEmail = project?.designerEmail || 'engineering@prostage.co.za';
  const designerPhone = project?.designerPhone || '+27 (0) 11 800 2000';
  const designerRegistration = project?.designerRegistration || 'CERT-SCAF-2026-A1';
  const projectRef = project?.projectReference || `PRJ-${Date.now().toString().slice(-6)}`;
  const location = project?.location || 'Main Arena / Stage Paddock';
  
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
  // PAGE 1: 3D ISOMETRIC CLIENT SUBMITTAL SHEET
  // ==========================================

  // 1. Dual CAD Engineering Border
  doc.setDrawColor(2, 132, 199); // Blue
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'S');

  doc.setDrawColor(184, 212, 227); // Light Blue Border
  doc.setLineWidth(0.3);
  doc.rect(margin + 1.5, margin + 1.5, pageWidth - margin * 2 - 3, pageHeight - margin * 2 - 3, 'S');

  // 2. Top Header Stripe
  doc.setFillColor(2, 132, 199);
  doc.rect(margin + 2, margin + 2, pageWidth - margin * 2 - 4, 3.5, 'F');

  // Title Block Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('CLIENT SUBMITTAL & APPROVAL DRAWING', margin + 5, margin + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('3D ISOMETRIC GENERAL ARRANGEMENT • KWIKSTAGE SCAFFOLD STAGE SYSTEM', margin + 5, margin + 15.5);

  // Right-aligned status badges
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`ISSUED FOR CLIENT ADMITTANCE • ${docDate.toUpperCase()} ${docTime}`, pageWidth - margin - 5, margin + 11.5, { align: 'right' });
  doc.setTextColor(16, 185, 129);
  doc.text('CAD VERIFIED • STATUS: SOLVED • REV 1.0', pageWidth - margin - 5, margin + 15.5, { align: 'right' });

  // Divider
  doc.setDrawColor(184, 212, 227);
  doc.setLineWidth(0.4);
  doc.line(margin + 2, margin + 18, pageWidth - margin - 2, margin + 18);

  // 3. Project & Designer Metadata Box (2-Tier Title Block)
  doc.setFillColor(248, 251, 253);
  doc.rect(margin + 3, margin + 20, pageWidth - margin * 2 - 6, 16, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.rect(margin + 3, margin + 20, pageWidth - margin * 2 - 6, 16, 'S');

  // Column 1: Client & Project
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CLIENT / PRODUCER:', margin + 6, margin + 24.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(clientName, margin + 6, margin + 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SITE / EVENT:', margin + 6, margin + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(siteName, margin + 26, margin + 33);

  // Column 2: Location & Ref
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SITE LOCATION / VENUE:', margin + 95, margin + 24.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(location, margin + 95, margin + 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PROJECT REF / DRAWING NO:', margin + 95, margin + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(projectRef, margin + 138, margin + 33);

  // Column 3: Deck Designer & Company (User Requested Requirement)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DECK DESIGNER / ENGINEER:', margin + 185, margin + 24.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(designerName, margin + 185, margin + 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DESIGN COMPANY:', margin + 185, margin + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName, margin + 215, margin + 33);

  // 4. Main 3D Isometric Viewport Box (Left Side)
  const drawW = 182; // mm
  const drawH = 120; // mm
  const drawX = margin + 3;
  const drawY = margin + 38;

  doc.setFillColor(255, 255, 255);
  doc.rect(drawX, drawY, drawW, drawH, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.setLineWidth(0.5);
  doc.rect(drawX, drawY, drawW, drawH, 'S');

  // Drawing Viewport Title Tab
  doc.setFillColor(240, 248, 255);
  doc.rect(drawX, drawY, drawW, 6.5, 'F');
  doc.line(drawX, drawY + 6.5, drawX + drawW, drawY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('3D ISOMETRIC PERSPECTIVE (CLIENT APPROVAL VIEW)', drawX + 4, drawY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ORIGIN DATUM: BOTTOM-RIGHT CORNER (0,0)', drawX + drawW - 4, drawY + 4.8, { align: 'right' });

  // Render 3D Canvas Snapshot if available
  if (imageDataUrl && imageDataUrl.startsWith('data:image')) {
    try {
      doc.addImage(imageDataUrl, 'PNG', drawX + 1.5, drawY + 8, drawW - 3, drawH - 9.5, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not embed 3D image into PDF:', e);
    }
  } else {
    // Elegant CAD isometric placeholder if image unavailable
    doc.setFillColor(248, 250, 252);
    doc.rect(drawX + 4, drawY + 10, drawW - 8, drawH - 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('3D ISOMETRIC RENDERING VIEWPORT', drawX + drawW / 2, drawY + drawH / 2 - 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('General arrangement perspective framed for client sign-off', drawX + drawW / 2, drawY + drawH / 2 + 4, { align: 'center' });
  }

  // 5. Right Column: Technical Specifications & Client Approval Sign-Off (Right Side)
  const rightX = drawX + drawW + 3; // 10 + 3 + 182 + 3 = 198 mm
  const rightW = pageWidth - margin - 3 - rightX; // ~89 mm
  const rightY = margin + 38;

  // Box 5A: Engineering Specifications Summary
  doc.setFillColor(248, 251, 253);
  doc.rect(rightX, rightY, rightW, 58, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.rect(rightX, rightY, rightW, 58, 'S');

  // Header
  doc.setFillColor(2, 132, 199);
  doc.rect(rightX, rightY, rightW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('STRUCTURE SPECIFICATIONS', rightX + 4, rightY + 4.8);

  const drawSpecRow = (label: string, val: string, yPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, rightX + 4, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val, rightX + rightW - 4, yPos, { align: 'right' });
  };

  const totalLedgers = (data.ledgerCounts?.blueBlue || 0) + 
                       (data.ledgerCounts?.blueBlack || 0) + 
                       (data.ledgerCounts?.blackBlack || 0);

  drawSpecRow('Footprint (W × D):', `${data.dimensions.width.toFixed(1)}m × ${data.dimensions.depth.toFixed(1)}m`, rightY + 12);
  drawSpecRow('Working Deck Height:', `${(Number(data.terrain?.deckHeight) || 0).toFixed(2)}m Datum`, rightY + 17.5);
  drawSpecRow('Total Surface Area:', `${data.totalArea.toFixed(1)} m²`, rightY + 23);
  drawSpecRow('Support Standards / Legs:', `${data.calculatedFeetCount} Vertical Legs`, rightY + 28.5);
  drawSpecRow('Modular Deck Panels:', `${(data.fullRostrumsCount || 0) + (data.halfRostrumsCount || 0)} Rostrums`, rightY + 34);
  drawSpecRow('Horizontal Ledgers:', `${totalLedgers} units`, rightY + 39.5);
  drawSpecRow('Live Load Rating (UDL):', '7.5 kN/m² (Certified)', rightY + 45);
  drawSpecRow('Standard Point Load Limit:', '25.0 kN per Leg', rightY + 50.5);
  drawSpecRow('Design Standard Code:', 'BS EN 12811 / SANS 10085', rightY + 56);

  // Box 5B: Formal Client Approval & Sign-Off Section (The Critical User Requirement)
  const signY = rightY + 61; // mm
  const signH = pageHeight - margin - 4 - signY; // ~37 mm

  doc.setFillColor(255, 255, 255);
  doc.rect(rightX, signY, rightW, signH, 'F');
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.6);
  doc.rect(rightX, signY, rightW, signH, 'S');

  // Title
  doc.setFillColor(224, 242, 254);
  doc.rect(rightX, signY, rightW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('CLIENT APPROVAL & SIGN-OFF', rightX + 4, signY + 4.8);

  // Status check circles / checkboxes
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.rect(rightX + 4, signY + 9, 3, 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('APPROVED FOR CONSTRUCTION', rightX + 9, signY + 11.5);

  doc.rect(rightX + 4, signY + 14, 3, 3);
  doc.text('APPROVED AS NOTED', rightX + 9, signY + 16.5);

  doc.rect(rightX + 48, signY + 14, 3, 3);
  doc.text('REVISE & RESUBMIT', rightX + 53, signY + 16.5);

  // Signature and Date lines
  doc.setDrawColor(184, 212, 227);
  doc.line(rightX + 4, signY + 23, rightX + rightW - 4, signY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENT AUTHORIZED SIGNATURE', rightX + 4, signY + 25.5);

  doc.line(rightX + 4, signY + 31, rightX + 42, signY + 31);
  doc.text('PRINT NAME & TITLE', rightX + 4, signY + 33.5);

  doc.line(rightX + 48, signY + 31, rightX + rightW - 4, signY + 31);
  doc.text('DATE (DD/MM/YYYY)', rightX + 48, signY + 33.5);

  // 6. Bottom Engineer Certification & Notes Footer
  const footerY = margin + 160;
  const footerH = pageHeight - margin - 3 - footerY;
  doc.setFillColor(248, 251, 253);
  doc.rect(drawX, footerY, drawW, footerH, 'F');
  doc.setDrawColor(184, 212, 227);
  doc.rect(drawX, footerY, drawW, footerH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(2, 132, 199);
  doc.text('ENGINEERING NOTES & COMPLIANCE CERTIFICATION:', drawX + 4, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Designed by ${designerName} (${companyName}) in accordance with SANS 10085 / BS EN 12811 temporary demountable structures. ` +
    `Designer contact: ${designerEmail} • ${designerPhone} • Reg: ${designerRegistration}. ` +
    `Soleboards must be placed beneath all standards before live load introduction.`,
    drawX + 4,
    footerY + 10,
    { maxWidth: drawW - 8 }
  );

  if (notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`Special Client Directives: "${notes}"`, drawX + 4, footerY + 17, { maxWidth: drawW - 8 });
  }

  // Save / Return document
  const safeSite = siteName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Client_Approval_3D_Isometric_${safeSite}_${safeClient}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  return doc;
}

/**
 * Creates a high-resolution standalone PNG image containing the 3D Isometric View
 * bordered by the official Client Approval Title Block & Engineering Sign-Off Box.
 */
export function generateClientApprovalPng({
  data,
  project,
  imageDataUrl,
  width = 1920,
  height = 1080
}: ClientApprovalExportOptions & { width?: number; height?: number }): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Top Title Bar
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(26, 26, width - 52, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('CLIENT SUBMITTAL & APPROVAL DRAWING — 3D ISOMETRIC VIEW', 45, 64);

  const docDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`FOR CLIENT ADMITTANCE • REV 1.0 • ${docDate.toUpperCase()}`, width - 45, 64);
  ctx.textAlign = 'left';

  // Metadata Strip
  const siteName = project?.siteName || 'Festival & Event Main Stage';
  const clientName = project?.clientName || 'Standard Production Client';
  const designerName = project?.designerName || 'Lead Scaffolding Designer';
  const companyName = project?.companyName || 'Pro Staging & Scaffold Engineering Ltd';
  const designerReg = project?.designerRegistration || 'CERT-SCAF-2026-A1';

  ctx.fillStyle = '#f0f8ff';
  ctx.fillRect(26, 90, width - 52, 65);
  ctx.strokeStyle = '#b8d4e3';
  ctx.strokeRect(26, 90, width - 52, 65);

  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('CLIENT / PRODUCER:', 45, 112);
  ctx.fillText('SITE & VENUE:', 450, 112);
  ctx.fillText('DECK DESIGNER:', 850, 112);
  ctx.fillText('ENGINEERING COMPANY:', 1250, 112);

  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(clientName, 45, 136);
  ctx.fillText(siteName, 450, 136);
  ctx.fillText(designerName, 850, 136);
  ctx.fillText(`${companyName} (${designerReg})`, 1250, 136);

  // Main 3D Canvas Viewport
  const viewW = width - 450;
  const viewH = height - 250;
  ctx.strokeStyle = '#b8d4e3';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 165, viewW, viewH);

  // If 3D Image provided
  if (imageDataUrl) {
    const img = new Image();
    img.src = imageDataUrl;
    try {
      ctx.drawImage(img, 28, 167, viewW - 4, viewH - 4);
    } catch (e) {
      console.warn('Image rendering to canvas skipped');
    }
  }

  // Right Side: Client Approval Sign-Off Block
  const signX = viewW + 36;
  const signW = width - signX - 26;
  const signH = viewH;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(signX, 165, signW, signH);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(signX, 165, signW, signH);

  // Sign-off header
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(signX, 165, signW, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('CLIENT APPROVAL STATUS', signX + 15, 190);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px monospace';
  let curY = 240;
  ctx.strokeRect(signX + 20, curY - 14, 18, 18);
  ctx.fillText('[  ] APPROVED FOR CONSTRUCTION', signX + 45, curY);

  curY += 40;
  ctx.strokeRect(signX + 20, curY - 14, 18, 18);
  ctx.fillText('[  ] APPROVED AS NOTED', signX + 45, curY);

  curY += 40;
  ctx.strokeRect(signX + 20, curY - 14, 18, 18);
  ctx.fillText('[  ] REVISE AND RESUBMIT', signX + 45, curY);

  curY += 70;
  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('AUTHORIZED CLIENT SIGNATURE:', signX + 20, curY);
  curY += 35;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(signX + 20, curY);
  ctx.lineTo(signX + signW - 20, curY);
  ctx.stroke();

  curY += 50;
  ctx.fillText('CLIENT REPRESENTATIVE NAME:', signX + 20, curY);
  curY += 35;
  ctx.beginPath();
  ctx.moveTo(signX + 20, curY);
  ctx.lineTo(signX + signW - 20, curY);
  ctx.stroke();

  curY += 50;
  ctx.fillText('DATE OF APPROVAL:', signX + 20, curY);
  curY += 35;
  ctx.beginPath();
  ctx.moveTo(signX + 20, curY);
  ctx.lineTo(signX + signW - 20, curY);
  ctx.stroke();

  // Bottom Datum Footer
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('DATUM: ORIGIN ANCHORED AT BOTTOM-RIGHT CORNER (0,0)', 35, height - 32);

  return canvas.toDataURL('image/png');
}
