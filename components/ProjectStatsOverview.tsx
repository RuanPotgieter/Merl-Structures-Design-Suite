import React, { useState, useRef } from 'react';
import { Project, ProjectPhoto, DeckConfig, DeckCalculationResult, RampConfig, HandrailConfig } from '../types';
import { calculateStructuralIntegrity } from '../utils/structuralCalculations';
import { compressPhotoFile, exportProjectToFile } from '../utils/storage';
import { 
  Building2, 
  User, 
  MapPin, 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Maximize2, 
  Plus, 
  Sliders, 
  Box, 
  ClipboardList, 
  Save, 
  Check, 
  Download, 
  X, 
  Layers, 
  ShieldCheck, 
  Info, 
  FolderCheck,
  ExternalLink,
  Sparkles,
  Calendar,
  HardDrive
} from 'lucide-react';

interface ProjectStatsOverviewProps {
  currentProject: Project | null;
  onUpdateProject: (updated: Project) => void;
  calculationResult: DeckCalculationResult;
  decks: DeckConfig[];
  ramps: RampConfig[];
  handrails: HandrailConfig[];
  onNavigateScreen: (screen: 'stats' | 'specs' | 'model' | 'bom') => void;
  onAddDefaultDeck: (preset?: 'standard' | 'raking' | 'vip') => void;
  onSaveProject: () => void;
  onOpenNewProjectModal: () => void;
}

export const ProjectStatsOverview: React.FC<ProjectStatsOverviewProps> = ({
  currentProject,
  onUpdateProject,
  calculationResult,
  decks,
  ramps,
  handrails,
  onNavigateScreen,
  onAddDefaultDeck,
  onSaveProject,
  onOpenNewProjectModal
}) => {
  // Form fields
  const [fileName, setFileName] = useState(currentProject?.fileName || '');
  const [siteName, setSiteName] = useState(currentProject?.siteName || 'New Stage Setup');
  const [clientName, setClientName] = useState(currentProject?.clientName || 'Standard Client');
  const [location, setLocation] = useState(currentProject?.location || '');
  const [notes, setNotes] = useState(currentProject?.notes || '');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if currentProject changes externally
  React.useEffect(() => {
    if (currentProject) {
      setFileName(currentProject.fileName || '');
      setSiteName(currentProject.siteName || 'New Stage Setup');
      setClientName(currentProject.clientName || 'Standard Client');
      setLocation(currentProject.location || '');
      setNotes(currentProject.notes || '');
    }
  }, [currentProject?.id]);

  // Structural report (calculates weight, CoG, safety margins)
  const structuralReport = React.useMemo(() => {
    return calculateStructuralIntegrity(calculationResult);
  }, [calculationResult]);

  // Handle saving metadata changes to active project
  const handleSaveMetadata = (overrides?: Partial<Project>) => {
    const updated: Project = {
      id: currentProject?.id || `proj_${Date.now()}`,
      fileName: overrides?.fileName !== undefined ? overrides.fileName : fileName,
      siteName: overrides?.siteName !== undefined ? overrides.siteName : siteName,
      clientName: overrides?.clientName !== undefined ? overrides.clientName : clientName,
      location: overrides?.location !== undefined ? overrides.location : location,
      notes: overrides?.notes !== undefined ? overrides.notes : notes,
      photos: overrides?.photos !== undefined ? overrides.photos : (currentProject?.photos || []),
      decks,
      ramps,
      handrails,
      createdAt: currentProject?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    onUpdateProject(updated);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  // Photo uploads
  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);

    try {
      const newPhotos: ProjectPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        // Compress image to safe max 1280px dimension to protect localStorage
        const dataUrl = await compressPhotoFile(file, 1280, 0.82);
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          dataUrl,
          size: file.size,
          uploadedAt: Date.now()
        });
      }

      if (newPhotos.length > 0) {
        const existingPhotos = currentProject?.photos || [];
        const combined = [...existingPhotos, ...newPhotos];
        handleSaveMetadata({ photos: combined });
      }
    } catch (err) {
      console.error('Failed to process photos:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete photo
  const handleDeletePhoto = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = currentProject?.photos || [];
    const filtered = existing.filter(p => p.id !== photoId);
    handleSaveMetadata({ photos: filtered });
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const hasDecks = decks.length > 0;
  const photos = currentProject?.photos || [];

  return (
    <div className="w-full h-full overflow-y-auto bg-[#f0f8ff] select-text">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">

        {/* TOP STATUS HEADER & WORKBENCH ACTIONS */}
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#e0f2fe] border border-[#bae6fd] text-xs font-mono text-[#0284c7] font-semibold mb-2.5">
              <FolderCheck size={14} className="text-[#0284c7]" />
              PROJECT SPECIFICATION & SITE INTELLIGENCE
            </div>
            
            <h1 className="text-2xl md:text-3xl font-mono font-bold text-[#0f172a] tracking-tight mb-1">
              {siteName || 'Clean Project Overview'}
            </h1>
            
            <p className="text-[#64748b] text-xs md:text-sm max-w-2xl leading-relaxed">
              {hasDecks 
                ? `Active staging layout with ${decks.length} deck section(s) spanning ${calculationResult.totalArea.toFixed(1)} m². Review live metrics, site parameters, and attached documentation below.`
                : 'Clean project canvas initialized with zero active stage decks and no background 3D graphics rendering. Configure project identification, site location, attach field photos, or add your first stage below.'}
            </p>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenNewProjectModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ffffff] hover:bg-[#f0f8ff] border border-[#8ebdd4] hover:border-[#0284c7] text-[#0f172a] hover:text-[#0284c7] font-mono text-xs font-semibold rounded-lg shadow-xs transition-all"
              title="Create a brand new clean project"
            >
              <Plus size={14} className="text-[#0284c7]" />
              New Project
            </button>

            <button
              onClick={() => onNavigateScreen('specs')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ffffff] hover:bg-[#f0f8ff] border border-[#8ebdd4] hover:border-[#0284c7] text-[#0f172a] hover:text-[#0284c7] font-mono text-xs font-semibold rounded-lg shadow-xs transition-all"
              title="Open parametric specs editor"
            >
              <Sliders size={14} className="text-[#0284c7]" />
              Specifications
            </button>

            <button
              onClick={() => onNavigateScreen('model')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono text-xs font-semibold rounded-lg shadow-sm transition-all"
              title="Launch full 3D CAD viewport"
            >
              <Box size={14} />
              Launch 3D View
            </button>

            <button
              onClick={() => onNavigateScreen('bom')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#ffffff] hover:bg-[#f0f8ff] border border-[#8ebdd4] hover:border-[#0284c7] text-[#0f172a] hover:text-[#0284c7] font-mono text-xs font-semibold rounded-lg shadow-xs transition-all"
              title="View parts schedule and structural calculations"
            >
              <ClipboardList size={14} className="text-[#0284c7]" />
              BOM & Schedule
            </button>
          </div>
        </div>

        {/* HERO METRICS CARDS: CLEAN PROJECT STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Decks */}
          <div className="p-4 bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] uppercase tracking-wider mb-2">
              <span>Configured Decks</span>
              <span className={`w-2 h-2 rounded-full ${hasDecks ? 'bg-[#0284c7]' : 'bg-[#94a3b8]'}`}></span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-bold text-[#0f172a]">
              {decks.length}
              <span className="text-xs font-normal text-[#64748b] ml-1.5">units</span>
            </div>
            <div className="text-[11px] font-mono text-[#64748b] mt-1 truncate">
              {hasDecks ? `${decks.map(d => d.type === 'raking' ? 'Rake' : 'Flat').join(', ')}` : 'Clean canvas'}
            </div>
          </div>

          {/* Card 2: Surface Area */}
          <div className="p-4 bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] uppercase tracking-wider mb-2">
              <span>Deck Surface</span>
              <Layers size={13} className="text-[#0284c7]" />
            </div>
            <div className="text-2xl md:text-3xl font-mono font-bold text-[#0f172a]">
              {calculationResult.totalArea.toFixed(1)}
              <span className="text-xs font-normal text-[#64748b] ml-1.5">m²</span>
            </div>
            <div className="text-[11px] font-mono text-[#64748b] mt-1">
              {hasDecks ? `${calculationResult.fullRostrumsCount} Full + ${calculationResult.halfRostrumsCount} Half` : '0 panels'}
            </div>
          </div>

          {/* Card 3: Standards / Legs */}
          <div className="p-4 bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] uppercase tracking-wider mb-2">
              <span>Base Standards</span>
              <Building2 size={13} className="text-[#0284c7]" />
            </div>
            <div className="text-2xl md:text-3xl font-mono font-bold text-[#0f172a]">
              {calculationResult.calculatedFeetCount}
              <span className="text-xs font-normal text-[#64748b] ml-1.5">feet</span>
            </div>
            <div className="text-[11px] font-mono text-[#64748b] mt-1">
              {hasDecks ? `${calculationResult.calculatedFeetCount} jacks & soleboards` : 'No legs deployed'}
            </div>
          </div>

          {/* Card 4: Structural Dead Weight */}
          <div className="p-4 bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-[#64748b] uppercase tracking-wider mb-2">
              <span>Dead Weight</span>
              <ShieldCheck size={13} className="text-[#0284c7]" />
            </div>
            <div className="text-2xl md:text-3xl font-mono font-bold text-[#0f172a]">
              {(structuralReport.totalDeadWeightKg / 1000).toFixed(2)}
              <span className="text-xs font-normal text-[#64748b] ml-1.5">t</span>
            </div>
            <div className="text-[11px] font-mono text-[#0284c7] font-semibold mt-1">
              FoS: {hasDecks ? `${structuralReport.factorOfSafety.toFixed(1)}:1 (${structuralReport.safetyStatus})` : 'Optimal'}
            </div>
          </div>
        </div>

        {/* IF CLEAN CANVAS: HELPFUL QUICK STARTER TEMPLATES */}
        {!hasDecks && (
          <div className="p-5 md:p-6 bg-[#ffffff] rounded-xl border-2 border-dashed border-[#8ebdd4] shadow-xs flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-[#0284c7]" />
                  Empty Project Canvas — Choose Staging Template
                </h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  You are in clean project mode. Select a standard scaffolding preset to populate your layout, or build from scratch in Specifications.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              {/* Preset 1: Standard Stage */}
              <button
                onClick={() => onAddDefaultDeck('standard')}
                className="p-4 bg-[#f8fbfd] hover:bg-[#e0f2fe] border border-[#b8d4e3] hover:border-[#0284c7] rounded-xl text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-[#0f172a] group-hover:text-[#0284c7]">Standard Main Stage</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]">10.8 × 10.8m</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    116.6 m² flat performance deck at 2.0m height with standard hook orientation and symmetrical rostrum bays.
                  </p>
                </div>
                <div className="text-xs font-mono font-semibold text-[#0284c7] mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  + Load Main Stage &rarr;
                </div>
              </button>

              {/* Preset 2: Raking Grandstand */}
              <button
                onClick={() => onAddDefaultDeck('raking')}
                className="p-4 bg-[#f8fbfd] hover:bg-[#e0f2fe] border border-[#b8d4e3] hover:border-[#0284c7] rounded-xl text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-[#0f172a] group-hover:text-[#0284c7]">Raking Grandstand</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]">12.0 × 10.0m</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Stepped amphitheater seating with 5 longitudinal tiers, 0.2m riser steps, and multi-lift diagonal sway bracing.
                  </p>
                </div>
                <div className="text-xs font-mono font-semibold text-[#0284c7] mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  + Load Raking Tier &rarr;
                </div>
              </button>

              {/* Preset 3: VIP Riser */}
              <button
                onClick={() => onAddDefaultDeck('vip')}
                className="p-4 bg-[#f8fbfd] hover:bg-[#e0f2fe] border border-[#b8d4e3] hover:border-[#0284c7] rounded-xl text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-[#0f172a] group-hover:text-[#0284c7]">VIP Front of House</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]">4.8 × 3.6m</span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Compact 17.3 m² elevated technical platform at 1.2m datum height, suited for audio mixing consoles or VIP viewing.
                  </p>
                </div>
                <div className="text-xs font-mono font-semibold text-[#0284c7] mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  + Load VIP Platform &rarr;
                </div>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: PROJECT FILE & SITE IDENTIFICATION */}
        <div className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-[#f8fbfd] border-b border-[#b8d4e3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0284c7] rounded-full"></span>
              <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                Project & Site Identification
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {isSavedRecently && (
                <span className="text-xs font-mono text-emerald-600 flex items-center gap-1">
                  <Check size={13} /> Changes Auto-Saved
                </span>
              )}
              <button
                onClick={() => handleSaveMetadata()}
                className="px-3 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] border border-[#bae6fd] rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
              >
                <Save size={13} />
                Save Changes
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* File Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-[#0284c7]" />
                <span>Project File Name</span>
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  handleSaveMetadata({ fileName: e.target.value });
                }}
                placeholder="e.g. Centurion_Main_Stage_2026.cadproj"
                className="px-3.5 py-2.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-sm rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
              <span className="text-[11px] text-[#64748b]">
                Custom file label used for local indexing, file downloads, and report headers.
              </span>
            </div>

            {/* Site Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-[#0284c7]" />
                <span>Site / Venue Name</span>
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => {
                  setSiteName(e.target.value);
                  handleSaveMetadata({ siteName: e.target.value });
                }}
                placeholder="e.g. Royal Arena & Festival Grounds"
                className="px-3.5 py-2.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-sm rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
              <span className="text-[11px] text-[#64748b]">
                Location of construction, stage name, or venue hall identifier.
              </span>
            </div>

            {/* Client Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-[#0284c7]" />
                <span>Client / Production Company</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  handleSaveMetadata({ clientName: e.target.value });
                }}
                placeholder="e.g. Big Concerts International / Live Nation"
                className="px-3.5 py-2.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-sm rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
              <span className="text-[11px] text-[#64748b]">
                Client entity, event producer, or scaffolding contractor company name.
              </span>
            </div>

            {/* Site Location */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-[#0284c7]" />
                <span>Site Location & Coordinates</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  handleSaveMetadata({ location: e.target.value });
                }}
                placeholder="e.g. Gate 4 North Paddock, Johannesburg (GPS: -26.1952, 28.0340)"
                className="px-3.5 py-2.5 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-sm rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
              <span className="text-[11px] text-[#64748b]">
                Physical address, paddock/sector code, or GPS coordinates for ground inspection.
              </span>
            </div>

            {/* Site Engineering Notes (Full Width) */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-[#0284c7]" />
                <span>Site Survey & Engineering Notes</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  handleSaveMetadata({ notes: e.target.value });
                }}
                placeholder="Add ground slope observations, soil firmness ratings, access constraints, or rigging limits..."
                className="px-3.5 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-sm rounded-lg outline-none transition-all placeholder:text-[#94a3b8] resize-y"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: SITE PHOTOS & FIELD ATTACHMENTS */}
        <div className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-[#f8fbfd] border-b border-[#b8d4e3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={14} className="text-[#0284c7]" />
              <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                Site Photos & Field Attachments
              </h3>
              <span className="px-2 py-0.5 rounded bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] text-[11px] font-mono font-semibold">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Upload size={13} />
              {isUploadingPhoto ? 'Processing...' : 'Upload Photos'}
            </button>
          </div>

          <div className="p-5 md:p-6 flex flex-col gap-4">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handlePhotoFiles(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePhotoFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#8ebdd4] hover:border-[#0284c7] rounded-xl p-6 bg-[#f8fbfd] hover:bg-[#e0f2fe]/40 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-[#e0f2fe] group-hover:bg-[#bae6fd] flex items-center justify-center text-[#0284c7] mb-2.5 transition-colors">
                <Upload size={18} />
              </div>
              <p className="text-xs font-mono font-semibold text-[#0f172a] mb-0.5">
                Click or drag & drop site photos and elevation surveys
              </p>
              <p className="text-[11px] text-[#64748b]">
                Supports JPEG, PNG, and WebP (auto-optimized for CAD file export and local storage)
              </p>
            </div>

            {/* Photo Gallery Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-2">
                {photos.map((photo) => {
                  const sizeKb = photo.size ? `${(photo.size / 1024).toFixed(0)} KB` : '';
                  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

                  return (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="group relative rounded-lg overflow-hidden border border-[#b8d4e3] hover:border-[#0284c7] bg-[#f0f8ff] shadow-xs cursor-pointer transition-all flex flex-col"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full h-28 bg-[#e2e8f0] overflow-hidden relative">
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-[#0f172a]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-1.5 bg-white/90 rounded text-[#0f172a] hover:bg-white shadow">
                            <Maximize2 size={13} />
                          </span>
                        </div>
                      </div>

                      {/* Photo Info & Delete */}
                      <div className="p-2 flex items-center justify-between gap-1 bg-[#ffffff]">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono font-semibold text-[#0f172a] truncate leading-tight" title={photo.name}>
                            {photo.name}
                          </p>
                          <p className="text-[10px] text-[#64748b] truncate mt-0.5">
                            {sizeKb ? `${sizeKb} • ` : ''}{uploadDate}
                          </p>
                        </div>

                        <button
                          onClick={(e) => handleDeletePhoto(photo.id, e)}
                          className="p-1 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: DETAILED INVENTORY & SPECS SNAPSHOT */}
        <div className="bg-[#ffffff] rounded-xl border border-[#b8d4e3] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-[#f8fbfd] border-b border-[#b8d4e3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0284c7] rounded-full"></span>
              <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                Stage Hardware & Solver Verification
              </h3>
            </div>
            <button
              onClick={() => onNavigateScreen('bom')}
              className="text-xs font-mono text-[#0284c7] hover:underline font-semibold flex items-center gap-1"
            >
              Full Engineering Schedule &rarr;
            </button>
          </div>

          <div className="p-5 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#f0f8ff] rounded-lg border border-[#a3c9db]">
              <span className="text-[11px] font-mono text-[#64748b] uppercase block">Full Rostrums (2.4m × 1.2m)</span>
              <span className="text-xl font-mono font-bold text-[#0f172a]">{calculationResult.fullRostrumsCount}</span>
            </div>

            <div className="p-3 bg-[#f0f8ff] rounded-lg border border-[#a3c9db]">
              <span className="text-[11px] font-mono text-[#64748b] uppercase block">Half Rostrums (1.2m × 1.2m)</span>
              <span className="text-xl font-mono font-bold text-[#0284c7]">{calculationResult.halfRostrumsCount}</span>
            </div>

            <div className="p-3 bg-[#f0f8ff] rounded-lg border border-[#a3c9db]">
              <span className="text-[11px] font-mono text-[#64748b] uppercase block">Horizontal Ledgers</span>
              <span className="text-xl font-mono font-bold text-[#0f172a]">{calculationResult.ledgers?.length || 0}</span>
            </div>

            <div className="p-3 bg-[#f0f8ff] rounded-lg border border-[#a3c9db]">
              <span className="text-[11px] font-mono text-[#64748b] uppercase block">Diagonal Braces</span>
              <span className="text-xl font-mono font-bold text-[#0f172a]">{calculationResult.braces?.length || 0}</span>
            </div>
          </div>
        </div>

      </div>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-[#0f172a]/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-[#b8d4e3] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#f8fbfd] border-b border-[#b8d4e3] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-mono font-bold text-[#0f172a] truncate max-w-md">
                  {selectedPhoto.name}
                </h4>
                <p className="text-[11px] text-[#64748b] font-mono">
                  Uploaded {new Date(selectedPhoto.uploadedAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.dataUrl}
                  download={selectedPhoto.name}
                  className="p-2 text-[#334155] hover:text-[#0284c7] hover:bg-[#e0f2fe] rounded-lg transition-colors"
                  title="Download photo"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Photo Display */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-[#090d16]/5">
              <img
                src={selectedPhoto.dataUrl}
                alt={selectedPhoto.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
