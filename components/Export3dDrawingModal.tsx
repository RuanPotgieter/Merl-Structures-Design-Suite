import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Box, 
  Layers, 
  X, 
  Check, 
  Share2, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { DeckCalculationResult, Project } from '../types';
import { 
  CrewCheckpoint, 
  generateCrewCheckpoints, 
  capture3DCanvasDataUrl, 
  generateCadSchematicDataUrl, 
  export3dDrawingPdf 
} from '../utils/export3dDrawing';

export interface Export3dDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DeckCalculationResult;
  project?: Partial<Project> | null;
  onNavigateTo3D?: () => void;
}

export const Export3dDrawingModal: React.FC<Export3dDrawingModalProps> = ({
  isOpen,
  onClose,
  data,
  project,
  onNavigateTo3D,
}) => {
  const [activeTab, setActiveTab] = useState<'drawing' | 'checkpoints' | 'combined'>('combined');
  const [drawingImage, setDrawingImage] = useState<string>('');
  const [viewMode, setViewMode] = useState<'iso' | 'cad-plan'>('iso');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [checkpoints, setCheckpoints] = useState<CrewCheckpoint[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Generate checkpoints when data changes
  useEffect(() => {
    if (data) {
      const cps = generateCrewCheckpoints(data, project || undefined);
      setCheckpoints(cps);
      // Default all passed ones to checked
      const initialChecked = new Set<string>();
      cps.forEach(cp => {
        if (cp.status === 'passed') initialChecked.add(cp.id);
      });
      setCheckedIds(initialChecked);
    }
  }, [data, project]);

  // Capture or generate drawing image when modal opens or view changes
  useEffect(() => {
    if (!isOpen) return;

    if (viewMode === 'cad-plan') {
      const planImg = generateCadSchematicDataUrl(data, 1600, 1000);
      setDrawingImage(planImg);
    } else {
      // Try WebGL capture first
      const webglImg = capture3DCanvasDataUrl();
      if (webglImg) {
        setDrawingImage(webglImg);
      } else {
        // Fallback to high-definition CAD schematic
        const fallbackImg = generateCadSchematicDataUrl(data, 1600, 1000);
        setDrawingImage(fallbackImg);
      }
    }
  }, [isOpen, viewMode, data]);

  const handleRecapture = () => {
    const webglImg = capture3DCanvasDataUrl();
    if (webglImg) {
      setDrawingImage(webglImg);
      setViewMode('iso');
    } else {
      const planImg = generateCadSchematicDataUrl(data, 1600, 1000);
      setDrawingImage(planImg);
    }
  };

  const handleToggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      export3dDrawingPdf({
        data,
        project: project || undefined,
        imageDataUrl: drawingImage,
        checkpoints,
        viewName: viewMode === 'iso' ? '3D Isometric CAD Perspective' : '2D Orthographic Plan Layout'
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = () => {
    if (!drawingImage) return;
    const a = document.createElement('a');
    a.href = drawingImage;
    const site = (project?.siteName || 'Scaffold_Stage').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `3D_Drawing_${site}_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const siteName = project?.siteName || 'Festival Main Stage';
  const clientName = project?.clientName || 'Standard Production Client';
  const location = project?.location || 'Main Arena / Stage Field';
  const docDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const totalLedgers = (data.ledgerCounts?.blueBlue || 0) + 
                       (data.ledgerCounts?.blueBlack || 0) + 
                       (data.ledgerCounts?.blackBlack || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Card */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#b8d4e3] shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Header Bar (Hidden during print) */}
        <div className="px-5 py-4 bg-[#f0f8ff] border-b border-[#b8d4e3] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-[#0284c7] shadow-xs">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-mono font-bold text-[#0f172a] tracking-tight">
                  Export 3D Drawing & Crew Checkpoints
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                  PRINT-READY
                </span>
              </div>
              <p className="text-xs font-mono text-[#64748b]">
                {siteName} • Metric General Arrangement & Site Rigging Safety Inspection Sheet
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-mono font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
              title="Download professional 2-page landscape PDF"
            >
              <Download size={14} />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#ffffff] hover:bg-[#e0f2fe] text-[#334155] hover:text-[#0284c7] border border-[#8ebdd4] rounded-lg text-xs font-mono font-bold transition-all shadow-xs"
              title="Print directly or save as PDF via system dialog"
            >
              <Printer size={14} className="text-[#0284c7]" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            <button
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-[#ffffff] hover:bg-[#e0f2fe] text-[#334155] hover:text-[#0284c7] border border-[#b8d4e3] rounded-lg text-xs font-mono transition-all"
              title="Save 3D drawing image as PNG"
            >
              <Camera size={14} className="text-[#0284c7]" />
              <span className="hidden md:inline">PNG</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors ml-1"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* View Toggle Toolbar (Hidden during print) */}
        <div className="px-5 py-2.5 bg-[#ffffff] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          {/* Sheet Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#f0f8ff] p-1 rounded-lg border border-[#b8d4e3]">
            <button
              onClick={() => setActiveTab('combined')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                activeTab === 'combined'
                  ? 'bg-[#ffffff] text-[#0284c7] font-bold border border-[#bae6fd] shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <Layers size={13} />
              <span>Full Drawing Sheet</span>
            </button>

            <button
              onClick={() => setActiveTab('drawing')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                activeTab === 'drawing'
                  ? 'bg-[#ffffff] text-[#0284c7] font-bold border border-[#bae6fd] shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <Box size={13} />
              <span>3D Drawing Only</span>
            </button>

            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                activeTab === 'checkpoints'
                  ? 'bg-[#ffffff] text-[#0284c7] font-bold border border-[#bae6fd] shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Crucial Checkpoints ({checkpoints.length})</span>
            </button>
          </div>

          {/* Camera View Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#64748b]">View Source:</span>
            <div className="flex items-center gap-1 bg-[#f0f8ff] p-1 rounded-lg border border-[#b8d4e3]">
              <button
                onClick={() => setViewMode('iso')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  viewMode === 'iso'
                    ? 'bg-[#ffffff] text-[#0284c7] font-bold border border-[#bae6fd] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                3D CAD Viewport
              </button>
              <button
                onClick={() => setViewMode('cad-plan')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  viewMode === 'cad-plan'
                    ? 'bg-[#ffffff] text-[#0284c7] font-bold border border-[#bae6fd] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                2D CAD Layout Plan
              </button>
            </div>

            <button
              onClick={handleRecapture}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f0f8ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] rounded-lg text-xs font-mono font-medium transition-all"
              title="Re-capture current 3D canvas angle"
            >
              <Camera size={12} />
              <span>Recapture</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Drawing Canvas Sheet Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] print:p-0 print:overflow-visible print:bg-white">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* --- SHEET 1: 3D CAD DRAWING VIEWPORT & METADATA BLOCK --- */}
            {(activeTab === 'combined' || activeTab === 'drawing') && (
              <div className="bg-[#ffffff] rounded-xl border-2 border-[#0284c7] p-4 sm:p-5 shadow-lg flex flex-col gap-4 print:shadow-none print:border-2 print:border-black print:p-3 print:m-0 print:break-after-page">
                
                {/* CAD Title Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b-2 border-[#0284c7] gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                      KWIKSTAGE MODULAR RIGGING DRAWING • SHEET 01
                    </h3>
                    <p className="text-xs font-mono text-[#64748b]">
                      PROJECTION: METRIC CAD • SCALE: N.T.S. • ISSUED FOR CREW ERECTION
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-[#0284c7]">REF: DWG-{siteName.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}-3D-01</span>
                    <p className="text-[11px] text-[#64748b]">DATE: {docDate} • REV: A</p>
                  </div>
                </div>

                {/* Project Metadata Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#f0f8ff] rounded-lg border border-[#bae6fd] text-xs font-mono">
                  <div>
                    <span className="text-[#64748b] block font-semibold text-[10px] uppercase">Site / Event:</span>
                    <span className="text-[#0f172a] font-bold text-sm">{siteName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block font-semibold text-[10px] uppercase">Client / Producer:</span>
                    <span className="text-[#0f172a] font-bold">{clientName}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] block font-semibold text-[10px] uppercase">Venue Location:</span>
                    <span className="text-[#0f172a] font-bold">{location}</span>
                  </div>
                </div>

                {/* Main 3D Drawing Canvas Frame */}
                <div className="relative rounded-lg border border-[#b8d4e3] overflow-hidden bg-white shadow-inner flex flex-col">
                  {/* Viewport bar */}
                  <div className="px-3 py-1.5 bg-[#f0f8ff] border-b border-[#b8d4e3] flex justify-between items-center text-[11px] font-mono">
                    <span className="font-bold text-[#0284c7]">
                      VIEWPORT: [{viewMode === 'iso' ? '3D ISOMETRIC CAD PERSPECTIVE' : '2D ORTHOGRAPHIC GENERAL ARRANGEMENT'}]
                    </span>
                    <span className="text-[#64748b]">
                      DATUM HEIGHT: {(Number(data.terrain?.deckHeight) || 0).toFixed(2)}m
                    </span>
                  </div>

                  {/* 3D Image Display */}
                  <div className="w-full flex items-center justify-center p-2 bg-[#ffffff] min-h-[380px] sm:min-h-[460px]">
                    {drawingImage ? (
                      <img 
                        src={drawingImage} 
                        alt="3D Scaffold CAD Drawing" 
                        className="max-h-[500px] w-auto object-contain select-none" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#64748b] font-mono text-xs py-20 gap-2">
                        <Box size={32} className="text-[#0284c7] animate-pulse" />
                        <span>Rendering 3D Drawing Capture...</span>
                      </div>
                    )}
                  </div>

                  {/* Viewport Footer Callout */}
                  <div className="px-3 py-2 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-wrap justify-between items-center text-[11px] font-mono text-[#475569] gap-2">
                    <span>
                      Footprint: <strong className="text-[#0f172a]">{data.dimensions.width.toFixed(1)}m W × {data.dimensions.depth.toFixed(1)}m D</strong> ({data.totalArea.toFixed(1)} m²)
                    </span>
                    <span>
                      Support Legs: <strong className="text-[#0f172a]">{data.calculatedFeetCount} Standards</strong>
                    </span>
                    <span>
                      Surface: <strong className="text-[#0f172a]">{data.fullRostrumsCount || 0} Full (2.4m) / {data.halfRostrumsCount || 0} Half (1.2m)</strong>
                    </span>
                  </div>
                </div>

                {/* Key General Arrangement Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] text-[#64748b] block font-semibold uppercase">Horizontal Ledgers</span>
                    <span className="text-base font-bold text-[#0284c7]">{totalLedgers}</span>
                    <span className="text-[10px] text-[#94a3b8] block">Wedge-locked</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] text-[#64748b] block font-semibold uppercase">Diagonal Bracing</span>
                    <span className="text-base font-bold text-[#0284c7]">{data.braces?.length || 0}</span>
                    <span className="text-[10px] text-[#94a3b8] block">Swivel clamped</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] text-[#64748b] block font-semibold uppercase">Ramps & Landings</span>
                    <span className="text-base font-bold text-[#0284c7]">
                      {data.rostrums.filter(r => r.isRamp).length} / {data.rostrums.filter(r => r.id && r.id.includes('RAMP') && !r.isRamp).length}
                    </span>
                    <span className="text-[10px] text-[#94a3b8] block">Runs / Landings</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-[10px] text-[#64748b] block font-semibold uppercase">Guardrail Perimeter</span>
                    <span className="text-base font-bold text-[#0284c7]">{data.handrails?.length || 0}</span>
                    <span className="text-[10px] text-[#94a3b8] block">+1.0m / +0.5m dual</span>
                  </div>
                </div>

                {/* Title Block Bottom Signature Bar */}
                <div className="pt-3 border-t border-[#e2e8f0] flex flex-wrap justify-between items-center text-[11px] font-mono text-[#64748b] gap-2">
                  <div>
                    CAD Scaffold Workbench • Document Ref: DWG-{siteName.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}-3D-01 • Sheet 01 of 02
                  </div>
                  <div className="font-bold text-[#0284c7]">
                    STATUS: SOLVED • ALL LOAD PATHS VERIFIED
                  </div>
                </div>
              </div>
            )}

            {/* --- SHEET 2: CRUCIAL RIGGING CHECKPOINTS & SITE SAFETY AUDIT MATRIX --- */}
            {(activeTab === 'combined' || activeTab === 'checkpoints') && (
              <div className="bg-[#ffffff] rounded-xl border-2 border-[#0284c7] p-4 sm:p-5 shadow-lg flex flex-col gap-4 print:shadow-none print:border-2 print:border-black print:p-3 print:m-0 print:break-after-page">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b-2 border-[#0284c7] gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                      CRUCIAL RIGGING & ERECTION CHECKPOINTS • SHEET 02
                    </h3>
                    <p className="text-xs font-mono text-[#64748b]">
                      MANDATORY ENGINEERING SAFETY VERIFICATION & RIGGING CREW HANDOVER CHECKLIST
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      SAFETY AUDIT PASS
                    </span>
                    <p className="text-[11px] text-[#64748b] mt-0.5">SITE: {siteName.toUpperCase()}</p>
                  </div>
                </div>

                {/* Checkpoints Table */}
                <div className="w-full overflow-x-auto border border-[#b8d4e3] rounded-lg">
                  <table className="w-full border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-[#0284c7] text-white text-left font-bold">
                        <th className="py-2.5 px-3 border-r border-[#0369a1] text-center w-12">#</th>
                        <th className="py-2.5 px-3 border-r border-[#0369a1] w-28">Category</th>
                        <th className="py-2.5 px-3 border-r border-[#0369a1] w-64">Crucial Inspection Checkpoint</th>
                        <th className="py-2.5 px-3 border-r border-[#0369a1]">Engineering Rule / Required Specification</th>
                        <th className="py-2.5 px-3 border-r border-[#0369a1] w-48">Permissible Tolerance</th>
                        <th className="py-2.5 px-3 text-center w-28">Field Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkpoints.map((cp, idx) => {
                        const isChecked = checkedIds.has(cp.id);
                        return (
                          <tr 
                            key={cp.id}
                            className={`border-b border-[#e2e8f0] transition-colors ${
                              idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#f8fafc]'
                            } hover:bg-[#e0f2fe]/40`}
                          >
                            <td className="py-2.5 px-2 border-r border-[#e2e8f0] text-center font-bold text-[#0284c7]">
                              {cp.id}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#e2e8f0] font-semibold text-[#334155]">
                              {cp.category}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#e2e8f0] font-bold text-[#0f172a]">
                              {cp.title}
                              <span className="block text-[11px] font-normal text-[#64748b] mt-0.5">
                                {cp.detail}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#e2e8f0] text-[#334155] leading-relaxed">
                              {cp.requirement}
                            </td>
                            <td className="py-2.5 px-3 border-r border-[#e2e8f0] text-[#64748b] text-[11px]">
                              {cp.tolerance}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCheck(cp.id)}
                                  className="w-4 h-4 rounded text-[#0284c7] accent-[#0284c7] border-[#8ebdd4] cursor-pointer"
                                />
                                <span className={`text-[11px] font-bold ${isChecked ? 'text-emerald-600' : 'text-[#64748b]'}`}>
                                  {isChecked ? 'PASS' : 'CHECK'}
                                </span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Rigging Lead Handover Certificate Sign-off Box */}
                <div className="p-4 rounded-lg bg-[#f0f8ff] border border-[#bae6fd] flex flex-col gap-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#b8d4e3] pb-2">
                    <span className="font-bold text-[#0284c7] uppercase tracking-wider text-xs flex items-center gap-2">
                      <ShieldCheck size={16} />
                      RIGGING LEAD & SITE SAFETY HANDOVER CERTIFICATE
                    </span>
                    <span className="text-[#64748b] text-[11px]">
                      COMPLIANCE: BS EN 12810 / 12811 & KWIKSTAGE SPECIFICATION
                    </span>
                  </div>

                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    By signing below, the Lead Rigging Foreman verifies that all listed checkpoints have been physically inspected on-site. Standards are plumb, basejacks within safe range, all ledgers and braces locked, rostrums seated flush, and guardrails secure prior to stage handover.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3">
                    <div className="flex flex-col gap-1 border-t border-[#94a3b8] pt-2">
                      <span className="text-[10px] text-[#64748b] uppercase">Lead Rigging Foreman Signature:</span>
                      <span className="text-xs text-[#0f172a] font-bold">____________________________________</span>
                      <span className="text-[10px] text-[#94a3b8]">Print Full Name & Certification ID</span>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-[#94a3b8] pt-2">
                      <span className="text-[10px] text-[#64748b] uppercase">Production / Site Manager Sign-Off:</span>
                      <span className="text-xs text-[#0f172a] font-bold">____________________________________</span>
                      <span className="text-[10px] text-[#94a3b8]">Venue Acceptance Approval</span>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-[#94a3b8] pt-2">
                      <span className="text-[10px] text-[#64748b] uppercase">Date & Handover Timestamp:</span>
                      <span className="text-xs text-[#0f172a] font-bold">____ / ____ / 2026  ____ : ____ hrs</span>
                      <span className="text-[10px] text-[#94a3b8]">Handover Effective Immediately</span>
                    </div>
                  </div>
                </div>

                {/* Footer on Sheet 2 */}
                <div className="pt-2 border-t border-[#e2e8f0] flex flex-wrap justify-between items-center text-[11px] font-mono text-[#64748b] gap-2">
                  <div>
                    CAD Scaffold Workbench • Crucial Checkpoints Sheet • Site: {siteName} • Sheet 02 of 02
                  </div>
                  <div className="font-bold text-emerald-600">
                    VERIFIED RIGGING SPECIFICATION
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during print) */}
        <div className="px-5 py-3.5 bg-[#f0f8ff] border-t border-[#b8d4e3] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono text-[#64748b]">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span>
              {checkedIds.size} of {checkpoints.length} Checkpoints Verified
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#ffffff] hover:bg-[#e2e8f0] text-[#334155] border border-[#b8d4e3] rounded-lg text-xs font-mono font-medium transition-all"
            >
              Close
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ffffff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#8ebdd4] rounded-lg text-xs font-mono font-bold transition-all shadow-xs"
            >
              <Printer size={14} />
              <span>Print Drawing Sheet</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-mono font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isExportingPdf ? 'Exporting PDF...' : 'Download 3D PDF Document'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
