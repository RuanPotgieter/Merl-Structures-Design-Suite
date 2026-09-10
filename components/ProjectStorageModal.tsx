import React, { useState, useEffect, useRef } from 'react';
import { Project, DeckConfig, RampConfig, HandrailConfig } from '../types';
import { 
  FolderOpen, 
  Save, 
  Share2, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  X, 
  Check, 
  Copy, 
  HardDrive, 
  Cloud, 
  ExternalLink, 
  Calendar, 
  Building2, 
  User, 
  Layers, 
  FileText,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  getLocalStorageProjects, 
  saveProjectToLocalStorage, 
  deleteProjectFromLocalStorage, 
  exportProjectToFile, 
  importProjectFromFile, 
  generateProjectShareUrl, 
  shareProject 
} from '../utils/storage';
import { initAuth, googleSignIn, logout } from '../utils/auth';
import { 
  saveProjectToDrive, 
  updateProjectInDrive, 
  listProjectsFromDrive, 
  getProjectFromDrive, 
  deleteProjectFromDrive 
} from '../utils/drive';

export type ModalMode = 'open' | 'save' | 'share' | 'manage';

interface ProjectStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: ModalMode;
  currentProject: Project | null;
  onLoadProject: (project: Project) => void;
  onSaveProject: (project: Project) => void;
  onNewProject: () => void;
  decks: DeckConfig[];
  ramps: RampConfig[];
  handrails: HandrailConfig[];
}

export const ProjectStorageModal: React.FC<ProjectStorageModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  currentProject,
  onLoadProject,
  onSaveProject,
  onNewProject,
  decks,
  ramps,
  handrails
}) => {
  const [activeTab, setActiveTab] = useState<ModalMode>(initialMode);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [siteName, setSiteName] = useState(currentProject?.siteName || 'Festival Main Stage');
  const [clientName, setClientName] = useState(currentProject?.clientName || 'Acme Events');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveProjects, setDriveProjects] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [storageSource, setStorageSource] = useState<'local' | 'cloud'>('local');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with open/initialMode
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setLocalProjects(getLocalStorageProjects());
      setSaveSuccessNotice(null);
      setErrorMessage(null);
      if (currentProject) {
        setSiteName(currentProject.siteName);
        setClientName(currentProject.clientName);
      }
    }
  }, [isOpen, initialMode, currentProject]);

  // Auth listener for optional Google Drive
  useEffect(() => {
    const unsubscribe = initAuth(
      () => {
        setIsAuthenticated(true);
        if (storageSource === 'cloud') fetchDriveProjects();
      },
      () => setIsAuthenticated(false)
    );
    return () => unsubscribe();
  }, [storageSource]);

  const fetchDriveProjects = async () => {
    setIsDriveLoading(true);
    try {
      const files = await listProjectsFromDrive();
      setDriveProjects(files || []);
    } catch (err) {
      console.error('Failed to load Google Drive projects:', err);
    } finally {
      setIsDriveLoading(false);
    }
  };

  if (!isOpen) return null;

  // 1. SAVE TO LOCAL STORAGE
  const handleSaveToLocalStorage = () => {
    if (!siteName.trim()) {
      setErrorMessage('Please provide a Site / Venue Name');
      return;
    }

    try {
      const now = Date.now();
      const projToSave: Project = {
        id: currentProject?.id || `proj_${now}`,
        siteName: siteName.trim(),
        clientName: clientName.trim() || 'Standard Client',
        decks,
        ramps,
        handrails,
        createdAt: currentProject?.createdAt || now,
        updatedAt: now
      };

      const saved = saveProjectToLocalStorage(projToSave);
      onSaveProject(saved);
      setLocalProjects(getLocalStorageProjects());
      setSaveSuccessNotice(`Project "${saved.siteName}" saved to Local Storage!`);
      setErrorMessage(null);
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err) {
      setErrorMessage('Failed to save to browser local storage. Storage may be full.');
    }
  };

  // 2. OPEN LOCAL PROJECT
  const handleOpenLocalProject = (proj: Project) => {
    onLoadProject(proj);
    onClose();
  };

  // 3. DELETE LOCAL PROJECT
  const handleDeleteLocalProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this project from your local storage?')) {
      const updated = deleteProjectFromLocalStorage(id);
      setLocalProjects(updated);
      if (currentProject?.id === id) {
        onNewProject();
      }
    }
  };

  // 4. EXPORT FILE (.cadproj)
  const handleExportLocalFile = (proj?: Project) => {
    const target = proj || {
      id: currentProject?.id || `proj_${Date.now()}`,
      siteName: siteName.trim() || 'Scaffold_Project',
      clientName: clientName.trim() || 'Client',
      decks,
      ramps,
      handrails,
      createdAt: currentProject?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    exportProjectToFile(target);
  };

  // 5. IMPORT FILE
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importProjectFromFile(file);
      onLoadProject(imported);
      setLocalProjects(getLocalStorageProjects());
      onClose();
    } catch (err: any) {
      setErrorMessage(`Failed to import file: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 6. SHARE PROJECT
  const currentWorkingProject: Project = {
    id: currentProject?.id || `proj_${Date.now()}`,
    siteName: siteName.trim() || currentProject?.siteName || 'Scaffold Deck Project',
    clientName: clientName.trim() || currentProject?.clientName || 'Client',
    decks,
    ramps,
    handrails,
    createdAt: currentProject?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  const shareUrl = generateProjectShareUrl(currentWorkingProject);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeShare = async () => {
    const res = await shareProject(currentWorkingProject);
    if (res.method === 'clipboard' && res.success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyJson = async () => {
    try {
      const json = JSON.stringify(currentWorkingProject, null, 2);
      await navigator.clipboard.writeText(json);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3f]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#e6f2f5] border border-[#b8d4e3] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Tab Navigation */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#b8d4e3] bg-[#dcebf0]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
            <h2 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
              Project Storage & Share Manager
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#475569] hover:text-[#0f172a] transition-colors p-1 rounded hover:bg-[#232733]"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex border-b border-[#b8d4e3] bg-[#eef5f9] px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('save'); setErrorMessage(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'save'
                ? 'text-cyan-600 border-cyan-600 bg-[#e6f2f5]'
                : 'text-[#475569] border-transparent hover:text-[#334155] hover:bg-[#e6f2f5]/50'
            }`}
          >
            <Save size={14} className={activeTab === 'save' ? 'text-cyan-600' : 'text-[#475569]'} />
            Save to Local
          </button>
          
          <button
            onClick={() => { setActiveTab('open'); setErrorMessage(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'open'
                ? 'text-cyan-600 border-cyan-600 bg-[#e6f2f5]'
                : 'text-[#475569] border-transparent hover:text-[#334155] hover:bg-[#e6f2f5]/50'
            }`}
          >
            <FolderOpen size={14} className={activeTab === 'open' ? 'text-cyan-600' : 'text-[#475569]'} />
            Open Local ({localProjects.length})
          </button>

          <button
            onClick={() => { setActiveTab('share'); setErrorMessage(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'share'
                ? 'text-cyan-600 border-cyan-600 bg-[#e6f2f5]'
                : 'text-[#475569] border-transparent hover:text-[#334155] hover:bg-[#e6f2f5]/50'
            }`}
          >
            <Share2 size={14} className={activeTab === 'share' ? 'text-cyan-600' : 'text-[#475569]'} />
            Share Project
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto bg-[#eef5f9] space-y-5">
          
          {/* Status notices */}
          {saveSuccessNotice && (
            <div className="flex items-center gap-2 p-3 bg-[#10b981]/15 border border-[#10b981]/40 rounded-lg text-[#34d399] text-xs font-mono">
              <Check size={16} />
              <span>{saveSuccessNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-[#ef4444]/15 border border-[#ef4444]/40 rounded-lg text-[#f87171] text-xs font-mono">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: SAVE TO LOCAL STORAGE */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider mb-1 flex items-center gap-2">
                  <HardDrive size={14} className="text-cyan-600" />
                  Save Specification to Local Storage
                </h3>
                <p className="text-sm font-mono text-[#475569]">
                  Save this CAD setup directly to your browser local storage. No login required. Persists across browser refreshes and offline sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold text-[#475569] uppercase tracking-wider">
                    Site / Venue Name
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    placeholder="e.g. Waterfront Summer Festival"
                    className="bg-[#dcebf0] border border-[#a3c9db] text-[#0f172a] font-mono text-xs rounded px-3 py-2 outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/50 transition-all shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold text-[#475569] uppercase tracking-wider">
                    Client / Organization
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Acme Productions Ltd"
                    className="bg-[#dcebf0] border border-[#a3c9db] text-[#0f172a] font-mono text-xs rounded px-3 py-2 outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#e6f2f5] border border-[#b8d4e3] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers size={18} className="text-cyan-600" />
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#0f172a]">
                      {decks.length} Deck{decks.length !== 1 ? 's' : ''}, {ramps.length} Ramp{ramps.length !== 1 ? 's' : ''}, {handrails.length} Rail{handrails.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs font-mono text-[#64748b]">
                      Active project ID: {currentProject?.id || 'New Draft'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportLocalFile()}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-[#dcebf0] hover:bg-[#232733] border border-[#a3c9db] rounded text-xs font-mono font-semibold text-[#334155] hover:text-cyan-600 transition-all"
                    title="Export .cadproj file to device download folder"
                  >
                    <Download size={13} />
                    Export File
                  </button>

                  <button
                    onClick={handleSaveToLocalStorage}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    <Save size={13} />
                    Save Local
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPEN FROM LOCAL STORAGE */}
          {activeTab === 'open' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider mb-0.5 flex items-center gap-2">
                    <FolderOpen size={14} className="text-cyan-600" />
                    Local Storage Workspaces
                  </h3>
                  <p className="text-sm font-mono text-[#475569]">
                    Select any saved project to immediately load its scaffold configurations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json,.cadproj"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-[#dcebf0] hover:bg-[#232733] border border-[#a3c9db] hover:border-cyan-600/50 rounded text-xs font-mono font-semibold text-[#334155] hover:text-cyan-600 transition-all"
                  >
                    <Upload size={13} />
                    Import File
                  </button>
                  <button
                    onClick={() => {
                      onNewProject();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-[#e6f2f5] hover:bg-[#dcebf0] border border-[#b8d4e3] rounded text-xs font-mono font-semibold text-[#334155] hover:text-cyan-600 transition-all"
                  >
                    <Plus size={13} />
                    New Empty
                  </button>
                </div>
              </div>

              {localProjects.length === 0 ? (
                <div className="text-center py-12 border border-[#b8d4e3] border-dashed rounded-xl bg-[#e6f2f5]/40">
                  <HardDrive size={28} className="mx-auto text-[#64748b] mb-2 opacity-50" />
                  <p className="text-xs font-mono text-[#475569] mb-1">No saved local projects yet.</p>
                  <p className="text-sm font-mono text-[#64748b]">
                    Use the "Save to Local" tab to store your active scaffold setup.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {localProjects.map(proj => {
                    const isCurrent = currentProject?.id === proj.id;
                    const dateStr = new Date(proj.updatedAt || proj.createdAt).toLocaleString();
                    const dCount = proj.decks?.length || 0;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => handleOpenLocalProject(proj)}
                        className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer group ${
                          isCurrent
                            ? 'bg-[#e6f2f5] border-cyan-600/60 shadow-md'
                            : 'bg-[#e6f2f5]/80 border-[#b8d4e3] hover:border-cyan-600/40 hover:bg-[#dcebf0]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-xs ${
                            isCurrent ? 'bg-cyan-600 text-white' : 'bg-[#dcebf0] text-cyan-600 border border-[#b8d4e3]'
                          }`}>
                            {dCount}D
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#0f172a] group-hover:text-cyan-600 transition-colors">
                                {proj.siteName}
                              </span>
                              {isCurrent && (
                                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-cyan-600/20 text-cyan-700 border border-cyan-600/40">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-[#64748b] flex items-center gap-3 mt-0.5">
                              <span>Client: {proj.clientName}</span>
                              <span>•</span>
                              <span>{dateStr}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportLocalFile(proj);
                            }}
                            className="p-1.5 text-[#475569] hover:text-cyan-600 hover:bg-[#232733] rounded transition-colors"
                            title="Download .cadproj file"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteLocalProject(proj.id, e)}
                            className="p-1.5 text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
                            title="Delete from local storage"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenLocalProject(proj)}
                            className="px-3 py-2 bg-[#dcebf0] group-hover:bg-cyan-600 group-hover:text-white text-cyan-600 rounded text-xs font-mono font-semibold transition-all border border-[#a3c9db] group-hover:border-transparent"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHARE PROJECT */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Share2 size={14} className="text-cyan-600" />
                  Share Scaffold Specification
                </h3>
                <p className="text-sm font-mono text-[#475569]">
                  Share this full configuration instantly with team members, contractors, or clients. Opening the link automatically loads all decks, terrain, and calculations in their browser.
                </p>
              </div>

              {/* 1-Click Share URL Box */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-[#e6f2f5] border border-[#b8d4e3] rounded-lg">
                <label className="text-xs font-mono font-bold text-cyan-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Direct Web Share URL</span>
                  {copiedLink && (
                    <span className="text-[#34d399] flex items-center gap-1 normal-case text-sm">
                      <Check size={12} /> Copied to Clipboard!
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-[#eef5f9] border border-[#a3c9db] text-[#475569] font-mono text-sm rounded px-3 py-2.5 w-full outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded text-xs font-mono font-semibold transition-all shrink-0 ${
                      copiedLink
                        ? 'bg-[#10b981] text-[#090d16]'
                        : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    }`}
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Sharing Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Native Share */}
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-start gap-1 p-3 bg-[#e6f2f5] hover:bg-[#dcebf0] border border-[#b8d4e3] hover:border-cyan-600/50 rounded-lg text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full text-cyan-600">
                    <Share2 size={16} />
                    <span className="text-xs font-mono uppercase bg-cyan-600/10 px-1.5 py-2 rounded">Native</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#0f172a] mt-1">OS Share Sheet</span>
                  <span className="text-xs font-mono text-[#64748b]">Share via AirDrop, WhatsApp, Slack, Mail</span>
                </button>

                {/* Export .cadproj File */}
                <button
                  onClick={() => handleExportLocalFile()}
                  className="flex flex-col items-start gap-1 p-3 bg-[#e6f2f5] hover:bg-[#dcebf0] border border-[#b8d4e3] hover:border-cyan-600/50 rounded-lg text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full text-[#38bdf8]">
                    <Download size={16} />
                    <span className="text-xs font-mono uppercase bg-[#38bdf8]/10 px-1.5 py-2 rounded">.CADPROJ</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#0f172a] mt-1">Export CAD File</span>
                  <span className="text-xs font-mono text-[#64748b]">Download standalone offline project file</span>
                </button>

                {/* Copy JSON */}
                <button
                  onClick={handleCopyJson}
                  className="flex flex-col items-start gap-1 p-3 bg-[#e6f2f5] hover:bg-[#dcebf0] border border-[#b8d4e3] hover:border-cyan-600/50 rounded-lg text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full text-[#a855f7]">
                    <FileText size={16} />
                    <span className="text-xs font-mono uppercase bg-[#a855f7]/10 px-1.5 py-2 rounded">
                      {copiedJson ? 'COPIED' : 'JSON'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#0f172a] mt-1">Copy Data Object</span>
                  <span className="text-xs font-mono text-[#64748b]">Raw JSON payload for developer scripts</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#b8d4e3] bg-[#dcebf0] flex items-center justify-between">
          <span className="text-xs font-mono text-[#64748b]">
            MERL Local Engine • Browser Sandboxed Storage
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-[#eef5f9] hover:bg-[#232733] border border-[#a3c9db] rounded text-xs font-mono font-semibold text-[#334155] hover:text-[#0f172a] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
