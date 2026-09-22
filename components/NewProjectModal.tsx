import React, { useState, useRef } from 'react';
import { Project, ProjectPhoto, DeckConfig } from '../types';
import { compressPhotoFile } from '../utils/storage';
import { 
  Building2, 
  User, 
  MapPin, 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Plus, 
  X, 
  Sparkles,
  Layers,
  Check
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectData: {
    fileName: string;
    siteName: string;
    clientName: string;
    location: string;
    notes: string;
    photos: ProjectPhoto[];
    startingTemplate: 'clean' | 'standard' | 'raking';
  }) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [fileName, setFileName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [startingTemplate, setStartingTemplate] = useState<'clean' | 'standard' | 'raking'>('clean');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhoto(true);
    try {
      const added: ProjectPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressPhotoFile(file, 1280, 0.82);
        added.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          dataUrl,
          size: file.size,
          uploadedAt: Date.now()
        });
      }
      setPhotos(prev => [...prev, ...added]);
    } catch (err) {
      console.error('Failed to compress photos:', err);
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFileName = fileName.trim() || `${(siteName.trim() || 'Scaffold_Project').replace(/[^a-z0-9_-]/gi, '_')}.cadproj`;
    const finalSiteName = siteName.trim() || 'New Stage Setup';
    const finalClientName = clientName.trim() || 'Standard Client';

    onCreateProject({
      fileName: finalFileName,
      siteName: finalSiteName,
      clientName: finalClientName,
      location: location.trim(),
      notes: notes.trim(),
      photos,
      startingTemplate
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-[#ffffff] rounded-2xl max-w-2xl w-full border border-[#b8d4e3] shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#f8fbfd] border-b border-[#b8d4e3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-[#0284c7]">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-[#0f172a] tracking-tight">
                Create New Scaffold Project
              </h2>
              <p className="text-xs text-[#64748b] font-mono">
                Initialize file metadata, site location, and field photos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          
          {/* Starting Staging Choice */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#0284c7]" />
              <span>Initial Workspace Configuration</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStartingTemplate('clean')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  startingTemplate === 'clean'
                    ? 'bg-[#e0f2fe] border-[#0284c7] text-[#0284c7] shadow-xs'
                    : 'bg-[#f8fbfd] border-[#b8d4e3] text-[#475569] hover:bg-[#f0f8ff]'
                }`}
              >
                <div className="text-xs font-mono font-bold mb-0.5 flex items-center justify-between">
                  <span>Clean Canvas (0 Decks)</span>
                  {startingTemplate === 'clean' && <Check size={14} className="text-[#0284c7]" />}
                </div>
                <div className="text-[11px] text-[#64748b]">
                  Starts with clean stats page and zero 3D rendering.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStartingTemplate('standard')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  startingTemplate === 'standard'
                    ? 'bg-[#e0f2fe] border-[#0284c7] text-[#0284c7] shadow-xs'
                    : 'bg-[#f8fbfd] border-[#b8d4e3] text-[#475569] hover:bg-[#f0f8ff]'
                }`}
              >
                <div className="text-xs font-mono font-bold mb-0.5 flex items-center justify-between">
                  <span>Standard 10.8m Stage</span>
                  {startingTemplate === 'standard' && <Check size={14} className="text-[#0284c7]" />}
                </div>
                <div className="text-[11px] text-[#64748b]">
                  Pre-loads 10.8m × 10.8m stage into the stats summary.
                </div>
              </button>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Project File Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} className="text-[#0284c7]" />
                <span>File Name</span>
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. Centurion_Arena_Stage_2026.cadproj"
                className="px-3.5 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
            </div>

            {/* Site Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={12} className="text-[#0284c7]" />
                <span>Site / Venue Name</span>
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Royal Arena Main Stage"
                className="px-3.5 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
            </div>

            {/* Client Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} className="text-[#0284c7]" />
                <span>Client / Producer</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Productions / Big Concerts"
                className="px-3.5 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
            </div>

            {/* Site Location */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={12} className="text-[#0284c7]" />
                <span>Site Location & Address</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Gate 4 North Field, Johannesburg"
                className="px-3.5 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          {/* Site Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={12} className="text-[#0284c7]" />
              <span>Site Survey Notes (Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Firm asphalt base, 150mm ground fall east to west, 20m cable run..."
              className="px-3.5 py-2 bg-[#f0f8ff] border border-[#a3c9db] focus:border-[#0284c7] text-[#0f172a] font-mono text-xs rounded-lg outline-none transition-all placeholder:text-[#94a3b8]"
            />
          </div>

          {/* Site Photos Upload */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={12} className="text-[#0284c7]" />
                <span>Site Photos & Elevation Surveys</span>
              </label>
              <span className="text-[11px] font-mono text-[#64748b]">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'} attached
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handlePhotoFiles(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePhotoFiles(e.dataTransfer.files);
              }}
              className="border border-dashed border-[#8ebdd4] hover:border-[#0284c7] rounded-xl p-4 bg-[#f8fbfd] hover:bg-[#e0f2fe]/40 transition-all cursor-pointer flex items-center justify-center gap-3 text-center"
            >
              <Upload size={16} className="text-[#0284c7]" />
              <div className="text-left">
                <p className="text-xs font-mono font-medium text-[#0f172a]">
                  Click or drag photos to attach with this file
                </p>
                <p className="text-[10px] text-[#64748b]">
                  JPEG, PNG, WebP (auto-optimized)
                </p>
              </div>
            </div>

            {/* Photos thumbnail preview row */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                {photos.map((p) => (
                  <div key={p.id} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[#b8d4e3] bg-[#f0f8ff]">
                    <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(p.id)}
                      className="absolute inset-0 bg-[#0f172a]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <Trash2 size={13} className="text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-[#b8d4e3] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#f0f8ff] hover:bg-[#e2e8f0] text-[#475569] font-mono text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingPhoto}
              className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={14} />
              Create Project
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
