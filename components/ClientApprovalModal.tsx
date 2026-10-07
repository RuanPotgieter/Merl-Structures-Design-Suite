import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Download, 
  Printer, 
  Camera, 
  X, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Calendar, 
  Check, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { DeckCalculationResult, Project } from '../types';
import { 
  exportClientApprovalPdf, 
  generateClientApprovalPng 
} from '../utils/clientApprovalExport';
import { capture3DCanvasDataUrl } from '../utils/export3dDrawing';

export interface ClientApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DeckCalculationResult;
  project?: Partial<Project> | null;
  onUpdateProject?: (updated: Partial<Project>) => void;
}

export const ClientApprovalModal: React.FC<ClientApprovalModalProps> = ({
  isOpen,
  onClose,
  data,
  project,
  onUpdateProject
}) => {
  const [designerName, setDesignerName] = useState(project?.designerName || 'Lead Scaffolding Designer');
  const [companyName, setCompanyName] = useState(project?.companyName || 'Pro Staging & Scaffold Engineering Ltd');
  const [designerEmail, setDesignerEmail] = useState(project?.designerEmail || 'engineering@prostage.co.za');
  const [designerPhone, setDesignerPhone] = useState(project?.designerPhone || '+27 (0) 11 800 2000');
  const [designerRegistration, setDesignerRegistration] = useState(project?.designerRegistration || 'CERT-SCAF-2026-A1');
  const [clientName, setClientName] = useState(project?.clientName || 'Standard Production Client');
  const [siteName, setSiteName] = useState(project?.siteName || 'Festival & Event Main Stage');
  const [notes, setNotes] = useState(project?.notes || 'Stage certified for temporary event installation. Subject to certified soleboard footing on leveled ground.');
  
  const [isometricImage, setIsometricImage] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Sync with project props when opened
  useEffect(() => {
    if (project) {
      if (project.designerName) setDesignerName(project.designerName);
      if (project.companyName) setCompanyName(project.companyName);
      if (project.designerEmail) setDesignerEmail(project.designerEmail);
      if (project.designerPhone) setDesignerPhone(project.designerPhone);
      if (project.designerRegistration) setDesignerRegistration(project.designerRegistration);
      if (project.clientName) setClientName(project.clientName);
      if (project.siteName) setSiteName(project.siteName);
      if (project.notes) setNotes(project.notes);
    }
  }, [project, isOpen]);

  // Capture canvas on open
  useEffect(() => {
    if (!isOpen) return;
    const img = capture3DCanvasDataUrl();
    if (img) {
      setIsometricImage(img);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRecapture = () => {
    const img = capture3DCanvasDataUrl();
    if (img) {
      setIsometricImage(img);
    }
  };

  const handleSaveFields = () => {
    if (onUpdateProject) {
      onUpdateProject({
        designerName: designerName.trim(),
        companyName: companyName.trim(),
        designerEmail: designerEmail.trim(),
        designerPhone: designerPhone.trim(),
        designerRegistration: designerRegistration.trim(),
        clientName: clientName.trim(),
        siteName: siteName.trim(),
        notes: notes.trim()
      });
    }
  };

  const handleDownloadPdf = () => {
    handleSaveFields();
    setIsExporting(true);
    try {
      exportClientApprovalPdf({
        data,
        project: {
          ...project,
          designerName,
          companyName,
          designerEmail,
          designerPhone,
          designerRegistration,
          clientName,
          siteName,
          notes
        },
        imageDataUrl: isometricImage,
        notes
      });
    } catch (e) {
      console.error('Failed to export Client Approval PDF:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPng = () => {
    handleSaveFields();
    try {
      const pngUrl = generateClientApprovalPng({
        data,
        project: {
          ...project,
          designerName,
          companyName,
          designerEmail,
          designerPhone,
          designerRegistration,
          clientName,
          siteName,
          notes
        },
        imageDataUrl: isometricImage
      });

      if (pngUrl) {
        const a = document.createElement('a');
        a.href = pngUrl;
        const safeSite = (siteName || 'Stage').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `Client_Approval_3D_Isometric_${safeSite}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
      }
    } catch (e) {
      console.error('Failed to download PNG:', e);
    }
  };

  const handlePrint = () => {
    handleSaveFields();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Card */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#b8d4e3] shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-[#f0f8ff] border-b border-[#b8d4e3] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-[#0284c7] shadow-xs">
              <FileCheck2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-mono font-bold text-[#0f172a] tracking-tight">
                  3D Isometric View Export for Client Approval
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-[#dcfce7] border border-[#bbf7d0] text-[#16a34a]">
                  CLIENT ADMITTANCE READY
                </span>
              </div>
              <p className="text-xs text-[#64748b] font-mono">
                Official submittal document with Designer & Company credentials, 3D Isometric View, and Client Sign-off block
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRecapture}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#b8d4e3] rounded-lg text-xs font-mono font-semibold transition-all shadow-xs"
              title="Recapture the current 3D viewport canvas"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Recapture 3D</span>
            </button>

            <button
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#e0f2fe] text-[#0f172a] border border-[#b8d4e3] rounded-lg text-xs font-mono font-semibold transition-all shadow-xs"
              title="Download High-Resolution PNG with approval border"
            >
              <Download size={14} />
              <span>PNG Image</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#e0f2fe] text-[#0f172a] border border-[#b8d4e3] rounded-lg text-xs font-mono font-semibold transition-all shadow-xs"
              title="Print directly to printer or save as system PDF"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg text-xs font-mono font-bold transition-all shadow-xs disabled:opacity-50"
              title="Generate official client approval PDF with sign-off box"
            >
              <Download size={14} />
              <span>Download Approval PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] rounded-lg transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Two-column Layout (Live Preview & Designer Information) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-5 bg-[#f8fafc]">
          
          {/* Left / Center: Interactive Preview Sheet */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-md overflow-hidden flex flex-col">
              
              {/* Sheet Title Bar */}
              <div className="bg-[#0284c7] px-4 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs tracking-wider">CLIENT SUBMISSION & APPROVAL SHEET</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">REV 1.0</span>
                </div>
                <div className="text-[11px] font-mono text-cyan-100">
                  ORIGIN DATUM: BOTTOM-RIGHT (0,0)
                </div>
              </div>

              {/* Sheet Metadata Bar */}
              <div className="bg-[#f0f8ff] border-b border-[#b8d4e3] px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[#64748b] block text-[10px]">CLIENT:</span>
                  <span className="font-bold text-[#0f172a] truncate block">{clientName}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[10px]">EVENT / SITE:</span>
                  <span className="font-bold text-[#0f172a] truncate block">{siteName}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[10px]">DECK DESIGNER:</span>
                  <span className="font-bold text-[#0284c7] truncate block">{designerName}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[10px]">ENGINEERING COMPANY:</span>
                  <span className="font-bold text-[#0f172a] truncate block">{companyName}</span>
                </div>
              </div>

              {/* 3D Isometric View Image Box */}
              <div className="p-3 bg-[#ffffff] flex flex-col items-center">
                <div className="relative w-full aspect-16/10 rounded-lg border border-[#b8d4e3] overflow-hidden bg-white shadow-inner flex items-center justify-center">
                  {isometricImage ? (
                    <img 
                      src={isometricImage} 
                      alt="3D Isometric Scaffold View" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#64748b] p-6 text-center font-mono">
                      <Camera size={36} className="text-[#0284c7] mb-2 animate-pulse" />
                      <span className="font-bold text-sm text-[#0f172a]">3D Isometric Viewport Ready</span>
                      <span className="text-xs text-[#64748b] mt-1">Click "Recapture 3D" to update this view from the CAD canvas</span>
                    </div>
                  )}

                  {/* Corner Datum Watermark Badge */}
                  <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-xs border border-[#ef4444] rounded px-2 py-1 shadow-sm flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#ef4444]">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping"></span>
                    <span>ORIGIN DATUM: BOTTOM RIGHT (0,0)</span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Summary Bar */}
              <div className="px-4 py-3 bg-[#f8fafc] border-t border-[#b8d4e3] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b] text-[10px] block">FOOTPRINT:</span>
                  <span className="font-bold text-[#0f172a]">{data.dimensions.width.toFixed(1)}m W × {data.dimensions.depth.toFixed(1)}m D</span>
                </div>
                <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b] text-[10px] block">DECK HEIGHT:</span>
                  <span className="font-bold text-[#0284c7]">{(Number(data.terrain?.deckHeight) || 0).toFixed(2)}m (Surface)</span>
                </div>
                <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b] text-[10px] block">LIVE LOAD CAPACITY:</span>
                  <span className="font-bold text-[#16a34a]">7.5 kN/m² (UDL)</span>
                </div>
                <div className="p-2 bg-white rounded border border-[#e2e8f0]">
                  <span className="text-[#64748b] text-[10px] block">STANDARDS / LEGS:</span>
                  <span className="font-bold text-[#0f172a]">{data.calculatedFeetCount} Vertical Legs</span>
                </div>
              </div>

              {/* Client Approval & Sign-off Section Preview */}
              <div className="p-4 bg-white border-t border-[#b8d4e3]">
                <div className="rounded-lg border-2 border-dashed border-[#0284c7] p-3.5 bg-[#f0f8ff]/50">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-mono font-bold text-xs text-[#0284c7] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      Formal Client Sign-Off & Admittance Block
                    </span>
                    <span className="text-[11px] font-mono text-[#64748b]">A4 Landscape Submittal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono mb-3">
                    <div className="flex items-center gap-1.5 p-1.5 bg-white rounded border border-[#b8d4e3]">
                      <div className="w-3.5 h-3.5 border border-[#64748b] rounded-xs"></div>
                      <span className="font-semibold text-[#0f172a]">APPROVED FOR CONSTRUCTION</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 bg-white rounded border border-[#b8d4e3]">
                      <div className="w-3.5 h-3.5 border border-[#64748b] rounded-xs"></div>
                      <span className="font-semibold text-[#0f172a]">APPROVED AS NOTED</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 bg-white rounded border border-[#b8d4e3]">
                      <div className="w-3.5 h-3.5 border border-[#64748b] rounded-xs"></div>
                      <span className="font-semibold text-[#0f172a]">REVISE & RESUBMIT</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2 border-t border-[#b8d4e3]">
                    <div>
                      <span className="text-[10px] text-[#64748b] block">AUTHORIZED CLIENT SIGNATURE:</span>
                      <div className="h-7 border-b border-[#94a3b8]"></div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b] block">CLIENT REPRESENTATIVE NAME:</span>
                      <div className="h-7 border-b border-[#94a3b8]"></div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b] block">APPROVAL DATE:</span>
                      <div className="h-7 border-b border-[#94a3b8]"></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Sidebar: Designer & Company Information Inputs (User Requested) */}
          <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
            
            {/* Designer & Company Information Card */}
            <div className="bg-white rounded-xl border border-[#b8d4e3] p-4 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#e2e8f0]">
                <div className="w-7 h-7 rounded-lg bg-[#e0f2fe] flex items-center justify-center text-[#0284c7]">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wide">
                    Deck Designer & Company
                  </h3>
                  <p className="text-[11px] text-[#64748b]">
                    Appears directly on official submittal title blocks
                  </p>
                </div>
              </div>

              {/* Designer Name Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-semibold text-[#334155] flex items-center gap-1">
                  <User size={12} className="text-[#0284c7]" />
                  <span>Deck Designer / Engineer Name</span>
                </label>
                <input
                  type="text"
                  value={designerName}
                  onChange={(e) => {
                    setDesignerName(e.target.value);
                    if (onUpdateProject) onUpdateProject({ designerName: e.target.value });
                  }}
                  placeholder="e.g. Ruan Potgieter"
                  className="px-3 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
                />
              </div>

              {/* Company Name Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-semibold text-[#334155] flex items-center gap-1">
                  <Building2 size={12} className="text-[#0284c7]" />
                  <span>Company / Scaffolding Firm</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (onUpdateProject) onUpdateProject({ companyName: e.target.value });
                  }}
                  placeholder="e.g. Pro Staging & Scaffolding Engineering"
                  className="px-3 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
                />
              </div>

              {/* Designer Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-semibold text-[#334155] flex items-center gap-1">
                    <Mail size={11} className="text-[#0284c7]" />
                    <span>Contact Email</span>
                  </label>
                  <input
                    type="email"
                    value={designerEmail}
                    onChange={(e) => {
                      setDesignerEmail(e.target.value);
                      if (onUpdateProject) onUpdateProject({ designerEmail: e.target.value });
                    }}
                    placeholder="email@company.com"
                    className="px-2.5 py-1.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-[11px] rounded-lg outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-semibold text-[#334155] flex items-center gap-1">
                    <Phone size={11} className="text-[#0284c7]" />
                    <span>Direct Phone</span>
                  </label>
                  <input
                    type="text"
                    value={designerPhone}
                    onChange={(e) => {
                      setDesignerPhone(e.target.value);
                      if (onUpdateProject) onUpdateProject({ designerPhone: e.target.value });
                    }}
                    placeholder="+27 11 000 0000"
                    className="px-2.5 py-1.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-[11px] rounded-lg outline-none transition-all"
                  />
                </div>
              </div>

              {/* Registration & License ID */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-semibold text-[#334155] flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#0284c7]" />
                  <span>Engineering Registration / License ID</span>
                </label>
                <input
                  type="text"
                  value={designerRegistration}
                  onChange={(e) => {
                    setDesignerRegistration(e.target.value);
                    if (onUpdateProject) onUpdateProject({ designerRegistration: e.target.value });
                  }}
                  placeholder="e.g. SANS-10085-CERT-8841"
                  className="px-3 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
                />
              </div>

              {/* Client & Site Name Edit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#e2e8f0]">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-semibold text-[#334155]">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (onUpdateProject) onUpdateProject({ clientName: e.target.value });
                    }}
                    className="px-2.5 py-1.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-[11px] rounded-lg outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-semibold text-[#334155]">
                    Site / Venue
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => {
                      setSiteName(e.target.value);
                      if (onUpdateProject) onUpdateProject({ siteName: e.target.value });
                    }}
                    className="px-2.5 py-1.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-[11px] rounded-lg outline-none transition-all"
                  />
                </div>
              </div>

              {/* Notes / Special Instructions */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono font-semibold text-[#334155] flex items-center gap-1">
                  <FileText size={11} className="text-[#0284c7]" />
                  <span>Submittal Notes & Directives</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (onUpdateProject) onUpdateProject({ notes: e.target.value });
                  }}
                  className="px-2.5 py-1.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-[11px] rounded-lg outline-none transition-all resize-none"
                />
              </div>

            </div>

            {/* Origin Datum Information Box */}
            <div className="bg-[#f0f8ff] rounded-xl border border-[#b8d4e3] p-4 text-xs font-mono flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[#0284c7] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                <span>ORIGIN DATUM ORIENTATION</span>
              </div>
              <p className="text-[#334155] text-[11px] leading-relaxed">
                The staging coordinates are anchored at the <strong>Bottom-Right corner (0,0)</strong>. Deck length (depth) extends backwards away from the audience, and deck width expands leftwards across modular bays.
              </p>
              <div className="mt-1 pt-2 border-t border-[#bae6fd] flex items-center justify-between text-[10px] text-[#0369a1]">
                <span>Datum (0,0): Bottom Right</span>
                <span className="font-bold text-[#16a34a]">VERIFIED CAD ALIGNMENT</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
