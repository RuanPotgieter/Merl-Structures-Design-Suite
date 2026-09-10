import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { calculateDecks } from './utils/deckLogic';
const DeckVisualizer3D = lazy(() => import('./components/DeckVisualizer3D').then(module => ({ default: module.DeckVisualizer3D })));
import { SpecificationsPanel } from './components/SpecificationsPanel';
import { BillOfMaterials } from './components/BillOfMaterials';
import { StatsPanel } from './components/StatsPanel';
import { ProjectStorageModal, ModalMode } from './components/ProjectStorageModal';
import { DeckConfig, DeckCalculationResult, RampConfig, Project, HandrailConfig } from './types';
import { 
  FolderOpen, 
  Save, 
  Share2, 
  Plus, 
  Sliders, 
  Box, 
  Boxes,
  ClipboardList, 
  Check, 
  Edit3, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  getActiveProjectFromLocalStorage, 
  saveProjectToLocalStorage, 
  parseProjectFromUrlHash, 
  generateProjectShareUrl,
  autoSaveDraftToLocalStorage,
  getAutoSavedDraftFromLocalStorage,
  clearDraftFromLocalStorage
} from './utils/storage';
import { ErrorBoundary } from './components/ErrorBoundary';

export const INITIAL_DECK: DeckConfig = {
  id: 'deck-1',
  type: 'standard',
  handrailType: 'standard',
  width: 10.8,
  depth: 10.8,
  originX: 0,
  originZ: 0,
  orientation: 0,
  terrain: {
    deckHeight: 2.0,
    groundOffsets: { origin: 0, widthEnd: 0, depthEnd: 0, diagonal: 0 }
  }
};

export type AppScreen = 'specs' | 'model' | 'bom';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('model');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [decks, setDecks] = useState<DeckConfig[]>([INITIAL_DECK]);
  const [ramps, setRamps] = useState<RampConfig[]>([]);
  const [handrails, setHandrails] = useState<HandrailConfig[]>([]);
  
  // Storage Modal
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [storageModalMode, setStorageModalMode] = useState<ModalMode>('open');

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3D Viewport Controls
  const [selection, setSelection] = useState<{ type: string; id: string; data: any } | null>(null);
  const [layers, setLayers] = useState({ structure: true, ledgers: true, terrain: true, rostrums: true });
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);

  // Auto-calculation with smooth debounced transition
  const [calculationResult, setCalculationResult] = useState<DeckCalculationResult>(() => 
    calculateDecks([INITIAL_DECK], [], [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setCalculationResult(calculateDecks(decks, ramps, handrails));
    }, 120);
    return () => clearTimeout(timer);
  }, [decks, ramps, handrails]);

  // Continuously auto-save current working draft to prevent any data loss on browser refresh
  useEffect(() => {
    const draftTimer = setTimeout(() => {
      autoSaveDraftToLocalStorage({
        project: currentProject,
        decks,
        ramps,
        handrails
      });
    }, 300);
    return () => clearTimeout(draftTimer);
  }, [decks, ramps, handrails, currentProject]);

  // Initial Load: check URL share hash first, then auto-saved draft, then last saved project
  useEffect(() => {
    try {
      const shared = parseProjectFromUrlHash();
      if (shared) {
        handleLoadProject(shared);
        showToast(`Loaded shared project: ${shared.siteName}`);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      // Check auto-saved draft first so user's work in progress is never lost on refresh
      const draft = getAutoSavedDraftFromLocalStorage();
      if (draft && Array.isArray(draft.decks) && draft.decks.length > 0) {
        if (draft.project) setCurrentProject(draft.project);
        setDecks(draft.decks);
        setRamps(draft.ramps || []);
        setHandrails(draft.handrails || []);
        return;
      }

      const lastActive = getActiveProjectFromLocalStorage();
      if (lastActive) {
        handleLoadProject(lastActive);
      }
    } catch (err) {
      console.warn('Initial project restore error:', err);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelection = useCallback((type: string | null, id: string | null, data: any | null) => {
    if (!type) setSelection(null);
    else setSelection({ type, id: id!, data });
  }, []);

  const handleLoadProject = (project: Project) => {
    setCurrentProject(project);
    setDecks(project.decks && project.decks.length > 0 ? project.decks : [INITIAL_DECK]);
    setRamps(project.ramps || []);
    setHandrails(project.handrails || []);
  };

  const handleSaveProject = (project: Project) => {
    setCurrentProject(project);
    showToast(`Project "${project.siteName}" saved to Local Storage`);
  };

  const handleNewProject = () => {
    if (decks.length > 1 || ramps.length > 0 || currentProject) {
      if (!window.confirm('Start a new project? Any unsaved changes to the current project will be discarded.')) {
        return;
      }
    }
    clearDraftFromLocalStorage();
    setCurrentProject(null);
    setDecks([INITIAL_DECK]);
    setRamps([]);
    setHandrails([]);
    showToast('Started new project');
  };

  // Quick 1-click Save to Local Storage
  const handleQuickSave = () => {
    const now = Date.now();
    const projToSave: Project = {
      id: currentProject?.id || `proj_${now}`,
      siteName: currentProject?.siteName || 'Festival Main Stage',
      clientName: currentProject?.clientName || 'Standard Client',
      decks,
      ramps,
      handrails,
      createdAt: currentProject?.createdAt || now,
      updatedAt: now
    };
    const saved = saveProjectToLocalStorage(projToSave);
    setCurrentProject(saved);
    showToast(`Saved to Local Storage (${saved.siteName})`);
  };

  const openStorageModal = (mode: ModalMode) => {
    setStorageModalMode(mode);
    setIsStorageModalOpen(true);
  };

  const is3DActive = currentScreen === 'model';

  return (
    <div className="flex flex-col h-screen bg-[#f0f8ff] overflow-hidden text-[#0f172a] font-sans select-none">
      
      {/* ARCHITECTURAL CAD HEADER */}
      <header className="h-14 shrink-0 flex items-center justify-between px-3 md:px-5 bg-[#ffffff] border-b border-[#b8d4e3] z-50 shadow-sm">
        
        {/* Left: Brand + Active Project Badge */}
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shrink-0">
              <Boxes size={15} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs md:text-sm tracking-wider text-[#0f172a] leading-none hidden sm:inline">
                  MERL <span className="text-cyan-600">MAGIC</span>
                </span>
                <span className="text-xs font-mono font-semibold uppercase px-1.5 py-2 rounded bg-[#dcebf0] text-[#475569] border border-[#8ebdd4] leading-none hidden lg:inline">
                  CAD
                </span>
              </div>
              <span className="text-xs font-mono text-[#64748b] tracking-wider uppercase hidden sm:inline leading-tight mt-0.5">
                Kwikstage Engineering
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#b8d4e3] hidden sm:block"></div>

          {/* Active Project Pill */}
          <button
            onClick={() => openStorageModal('save')}
            className="flex items-center gap-2.5 px-3 py-2 bg-[#e6f2f5] hover:bg-[#dcebf0] border border-[#a3c9db] hover:border-cyan-500/40 rounded-md text-left transition-all max-w-[150px] md:max-w-[280px] group shadow-inner"
            title="Click to rename or edit project details"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-mono font-semibold text-[#0f172a] truncate group-hover:text-cyan-600 transition-colors leading-tight">
                {currentProject?.siteName || 'Festival Main Stage'}
              </div>
              <div className="text-xs font-mono text-[#78859b] truncate leading-tight hidden sm:block">
                Client: {currentProject?.clientName || 'Standard Client'}
              </div>
            </div>
            <Edit3 size={11} className="text-[#64748b] group-hover:text-cyan-600 shrink-0 transition-colors" />
          </button>
        </div>

        {/* Center: Multi-Screen Switcher (Tactile Segmented Pill) - Desktop Only */}
        <nav className="hidden sm:flex items-center bg-[#e6f2f5] p-1 rounded-lg border border-[#a3c9db] shadow-inner absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setCurrentScreen('specs')}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-mono font-medium transition-all ${
              currentScreen === 'specs'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0] border border-transparent'
            }`}
            title="Parametric Specifications Workbench"
          >
            <Sliders size={13} className={currentScreen === 'specs' ? 'text-cyan-600' : 'text-[#7e8b9f]'} />
            <span>Specifications</span>
          </button>

          <button
            onClick={() => setCurrentScreen('model')}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-mono font-medium transition-all ${
              currentScreen === 'model'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0] border border-transparent'
            }`}
            title="Full-screen 3D CAD Viewport"
          >
            <Box size={13} className={currentScreen === 'model' ? 'text-cyan-600' : 'text-[#7e8b9f]'} />
            <span>3D Viewport</span>
          </button>

          <button
            onClick={() => setCurrentScreen('bom')}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-mono font-medium transition-all ${
              currentScreen === 'bom'
                ? 'bg-[#e0f2fe] text-cyan-600 border border-[#8ebdd4] shadow-sm font-semibold'
                : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#dcebf0] border border-transparent'
            }`}
            title="Parts Schedule & Structural Analysis"
          >
            <ClipboardList size={13} className={currentScreen === 'bom' ? 'text-cyan-600' : 'text-[#7e8b9f]'} />
            <span>Schedule & BOM</span>
          </button>
        </nav>

        {/* Right: Project Quick Actions with Primary Hierarchy */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Quick Save to Local Storage */}
          <button
            onClick={handleQuickSave}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md text-xs font-mono font-bold transition-all shadow-sm active:scale-95"
            title="Quick save changes to local storage"
          >
            <Save size={13} />
            <span className="hidden md:inline">Save</span>
          </button>

          {/* Open Local Storage Projects */}
          <button
            onClick={() => openStorageModal('open')}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-2.5 bg-[#e6f2f5] hover:bg-[#dcebf0] text-[#334155] hover:text-[#0f172a] border border-[#a3c9db] hover:border-[#8ebdd4] rounded-md text-xs font-mono font-medium transition-all"
            title="Open project from storage or file"
          >
            <FolderOpen size={13} className="text-[#475569]" />
            <span className="hidden md:inline">Projects</span>
          </button>

          {/* Share Project */}
          <button
            onClick={() => openStorageModal('share')}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-2.5 bg-[#e6f2f5] hover:bg-[#dcebf0] text-[#334155] hover:text-[#0f172a] border border-[#a3c9db] hover:border-[#8ebdd4] rounded-md text-xs font-mono font-medium transition-all"
            title="Share project link or export CAD JSON"
          >
            <Share2 size={13} className="text-[#475569]" />
            <span className="hidden md:inline">Share</span>
          </button>

          {/* New Project */}
          <button
            onClick={handleNewProject}
            className="p-1.5 md:px-2.5 md:py-2.5 bg-[#e6f2f5] hover:bg-[#dcebf0] text-[#475569] hover:text-[#0f172a] border border-[#a3c9db] hover:border-[#8ebdd4] rounded-md text-xs font-mono font-medium transition-all"
            title="Create clean new project"
          >
            <Plus size={14} />
          </button>
        </div>
      </header>

      {/* REFINED FLOATING TOAST */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-[#e6f2f5]/95 backdrop-blur-md border border-sky-300 text-[#0f172a] font-mono text-xs rounded-full shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MULTI-SCREEN MAIN WORKSPACE */}
      <main className="flex-1 relative overflow-hidden flex flex-col">

        {/* SCREEN 1: FULL SPECIFICATIONS WORKBENCH */}
        {currentScreen === 'specs' && (
          <div className="w-full h-full overflow-y-auto bg-[#f0f8ff]">
            <div className="max-w-4xl mx-auto py-6 px-4 md:px-8">
              
              {/* Studio screen helper banner */}
              <div className="mb-5 flex items-center justify-between p-3.5 bg-[#ffffff] border border-[#b8d4e3] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0f172a] block">Parametric Specifications Workbench</span>
                    <span className="text-sm text-[#7e8b9f] block">Dedicated parameter tuning with maximum editing space</span>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentScreen('model')}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-[#e6f2f5] hover:bg-cyan-500 text-cyan-600 hover:text-white border border-cyan-500/30 rounded-md text-xs font-mono font-semibold transition-all"
                >
                  <span>3D Viewport</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              <div className="bg-[#ffffff] rounded-xl shadow-xl border border-[#b8d4e3] overflow-hidden">
                <SpecificationsPanel 
                  decks={decks} onDecksChange={setDecks} 
                  ramps={ramps} onRampsChange={setRamps} 
                  handrails={handrails} onHandrailsChange={setHandrails} 
                  onComplete={() => setCurrentScreen('model')} 
                />
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: FULL 3D MODEL STUDIO */}
        {currentScreen === 'model' && (
          <div className="w-full h-full relative overflow-hidden bg-[#ffffff]">
            <ErrorBoundary fallbackTitle="3D Stage CAD Viewport Restored">
              <Suspense fallback={<div className="flex w-full h-full items-center justify-center bg-sky-100 text-cyan-500 font-mono text-sm tracking-wider">LOADING 3D ENGINE...</div>}>
                <DeckVisualizer3D 
                  data={calculationResult} 
                  onSelect={handleSelection} 
                  selectionId={selection?.id || null} 
                  layers={layers}
                  active={is3DActive}
                />
              </Suspense>
            </ErrorBoundary>

            {/* Decluttered Minimalist HUD Status Pill */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 flex items-center gap-3 px-3 py-2 bg-white/80 backdrop-blur-md rounded-full border border-sky-200 shadow-md pointer-events-auto text-xs font-mono text-sky-900">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${calculationResult.status === 'SOLVED' ? 'bg-emerald-400' : 'bg-cyan-600'}`}></span>
                <span className="font-semibold text-sky-900">
                  {calculationResult.status === 'SOLVED' ? 'Solved' : 'Review'}
                </span>
              </div>
              <span className="text-sky-300">|</span>
              <span>{calculationResult.totalArea.toFixed(1)} m²</span>
              <span className="text-sky-300">|</span>
              <span>{calculationResult.calculatedFeetCount} Standards</span>
            </div>

            {/* Decluttered Layer Visibility Toggle Button with Small Icon */}
            <div className="absolute right-3 top-3 z-20">
              <button
                onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-white/80 backdrop-blur-md border border-sky-200 rounded-md text-sm font-mono text-sky-800 hover:text-white hover:bg-sky-50 shadow-md transition-all"
                title="Toggle Layers"
              >
                <Layers size={10} className="text-cyan-600" />
                <span>Layers</span>
              </button>

              {isLayersMenuOpen && (
                <div className="absolute right-0 top-8 bg-white/95 backdrop-blur-md border border-sky-200 p-2.5 rounded-lg flex flex-col gap-2 w-44 shadow-2xl animate-in fade-in duration-150">
                  <span className="text-xs font-mono font-bold text-sky-800 uppercase tracking-wider border-b border-sky-200 pb-1">
                    Scaffold Layers
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-sky-800 hover:text-cyan-600">
                    <input type="checkbox" checked={layers.structure} onChange={e => setLayers({...layers, structure: e.target.checked})} className="rounded bg-sky-50 border-sky-300 text-cyan-500 accent-cyan-500 w-3 h-3" />
                    <span>Leg Structure</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-sky-800 hover:text-cyan-600">
                    <input type="checkbox" checked={layers.ledgers} onChange={e => setLayers({...layers, ledgers: e.target.checked})} className="rounded bg-sky-50 border-sky-300 text-cyan-500 accent-cyan-500 w-3 h-3" />
                    <span>Ledgers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-sky-800 hover:text-cyan-600">
                    <input type="checkbox" checked={layers.terrain} onChange={e => setLayers({...layers, terrain: e.target.checked})} className="rounded bg-sky-50 border-sky-300 text-cyan-500 accent-cyan-500 w-3 h-3" />
                    <span>Terrain Surface</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-sky-800 hover:text-cyan-600">
                    <input type="checkbox" checked={layers.rostrums} onChange={e => setLayers({...layers, rostrums: e.target.checked})} className="rounded bg-sky-50 border-sky-300 text-cyan-500 accent-cyan-500 w-3 h-3" />
                    <span>Deck Rostrums</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 4: BILL OF MATERIALS & STRUCTURAL ANALYSIS */}
        {currentScreen === 'bom' && (
          <div className="w-full h-full overflow-y-auto bg-[#f0f8ff]">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
              
              <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-2 rounded-md bg-[#e6f2f5] border border-[#a3c9db] text-sm font-mono text-cyan-600 mb-2.5">
                    <Boxes size={13} className="text-cyan-600" />
                    PARTS SPECIFICATION SCHEDULE
                  </div>
                  <h2 className="text-xl md:text-2xl font-mono font-bold text-[#0f172a] tracking-tight mb-1">
                    Project Parts Schedule
                  </h2>
                  <p className="text-[#8b98ad] text-xs max-w-xl leading-relaxed">
                    Automatic bill of materials generated from active CAD calculations. Component lengths and counts reflect real Kwikstage site rules.
                  </p>
                </div>
                <StatsPanel data={calculationResult} isValid={calculationResult.status === 'SOLVED'} />
              </div>
              
              <div className="bg-[#ffffff] rounded-xl overflow-hidden border border-[#b8d4e3] shadow-xl">
                <div className="px-5 py-3.5 border-b border-[#b8d4e3] flex justify-between items-center bg-[#f8fbfd]">
                  <h3 className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-600 rounded-full"></span>
                    Scaffold Component Inventory
                  </h3>
                  <button 
                    onClick={() => window.print()} 
                    className="px-3.5 py-2.5 bg-[#eef5f9] border border-[#8ebdd4] text-xs font-mono font-medium text-[#334155] hover:text-cyan-600 hover:border-cyan-600/40 transition-all rounded-md shadow-sm flex items-center gap-2"
                  >
                    Export Schedule / Print
                  </button>
                </div>
                <BillOfMaterials data={calculationResult} />
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="sm:hidden shrink-0 flex items-center justify-around bg-[#ffffff] border-t border-[#b8d4e3] px-2 py-2 pb-safe z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
        <button
          onClick={() => setCurrentScreen('specs')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 transition-all ${
            currentScreen === 'specs'
              ? 'text-cyan-600 bg-[#e6f2f5]'
              : 'text-[#64748b] hover:text-[#475569]'
          }`}
        >
          <Sliders size={18} />
          <span className="text-xs font-mono font-medium">Specs</span>
        </button>

        <button
          onClick={() => setCurrentScreen('model')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 transition-all ${
            currentScreen === 'model'
              ? 'text-cyan-600 bg-[#e6f2f5]'
              : 'text-[#64748b] hover:text-[#475569]'
          }`}
        >
          <Box size={18} />
          <span className="text-xs font-mono font-medium">3D View</span>
        </button>

        <button
          onClick={() => setCurrentScreen('bom')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 transition-all ${
            currentScreen === 'bom'
              ? 'text-cyan-600 bg-[#e6f2f5]'
              : 'text-[#64748b] hover:text-[#475569]'
          }`}
        >
          <ClipboardList size={18} />
          <span className="text-xs font-mono font-medium">BOM</span>
        </button>
      </nav>

      {/* DEDICATED PROJECT STORAGE & SHARING MODAL */}
      <ProjectStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        initialMode={storageModalMode}
        currentProject={currentProject}
        onLoadProject={handleLoadProject}
        onSaveProject={handleSaveProject}
        onNewProject={handleNewProject}
        decks={decks}
        ramps={ramps}
        handrails={handrails}
      />

    </div>
  );
};

export default App;
