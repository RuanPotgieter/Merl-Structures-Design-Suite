import React, { useState, useEffect } from 'react';
import { calculateDecks } from './utils/deckLogic';
import { DeckVisualizer3D } from './components/DeckVisualizer3D';
import { SpecificationsPanel } from './components/SpecificationsPanel';
import { BillOfMaterials } from './components/BillOfMaterials';
import { StatsPanel } from './components/StatsPanel';
import { ProjectManager } from './components/ProjectManager';
import { DeckConfig, DeckCalculationResult, RampConfig, Project, HandrailConfig } from './types';

const INITIAL_DECK: DeckConfig = {
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

type ViewMode = 'specs' | 'design' | 'analysis';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('specs');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [decks, setDecks] = useState<DeckConfig[]>([INITIAL_DECK]);
  const [ramps, setRamps] = useState<RampConfig[]>([]);
  const [handrails, setHandrails] = useState<HandrailConfig[]>([]);
  const [calculationResult, setCalculationResult] = useState<DeckCalculationResult>(() => calculateDecks([INITIAL_DECK], [], []));
  
  const [selection, setSelection] = useState<{ type: string; id: string; data: any } | null>(null);
  const [layers, setLayers] = useState({ structure: true, ledgers: true, terrain: true, rostrums: true });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-calculate when inputs change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCalculationResult(calculateDecks(decks, ramps, handrails));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [decks, ramps, handrails]);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleSelection = (type: string | null, id: string | null, data: any | null) => {
     if (!type) setSelection(null);
     else setSelection({ type, id: id!, data });
  };

  const handleLoadProject = (project: Project) => {
    setCurrentProject(project);
    setDecks(project.decks || [INITIAL_DECK]);
    setRamps(project.ramps || []);
    setHandrails(project.handrails || []);
  };

  const handleSaveProject = (project: Project) => {
    setCurrentProject(project);
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setDecks([INITIAL_DECK]);
    setRamps([]);
    setHandrails([]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f3f4f6] overflow-hidden text-[#1f2937] font-sans relative">
      
      {/* Top Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 z-50 bg-white border-b border-[#e5e7eb] shadow-sm">
         <div className="flex items-center gap-4 lg:gap-10 w-full justify-between">
            <ProjectManager 
              currentProject={currentProject}
              onLoadProject={handleLoadProject}
              onSaveProject={handleSaveProject}
              onNewProject={handleNewProject}
              decks={decks}
              ramps={ramps}
              handrails={handrails}
            />
            
            <div className="hidden lg:flex flex-col items-center absolute left-1/2 -translate-x-1/2">
               <span className="text-[16px] font-semibold tracking-wide text-[#111827]">MERL STRUCTURES CAD</span>
               <span className="text-[10px] text-[#6b7280] tracking-wider uppercase">Professional Design Suite</span>
            </div>
            
            <nav className="flex bg-[#f3f4f6] p-1 rounded-md border border-[#e5e7eb]">
               <button onClick={() => switchView('specs')} className={`px-3 lg:px-4 py-1.5 rounded text-[10px] lg:text-xs font-semibold uppercase tracking-wide transition-all ${viewMode === 'specs' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'}`}>Specifications</button>
               <button onClick={() => switchView('design')} className={`px-3 lg:px-4 py-1.5 rounded text-[10px] lg:text-xs font-semibold uppercase tracking-wide transition-all ${viewMode === 'design' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'}`}>3D View</button>
               <button onClick={() => switchView('analysis')} className={`px-3 lg:px-4 py-1.5 rounded text-[10px] lg:text-xs font-semibold uppercase tracking-wide transition-all ${viewMode === 'analysis' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'}`}>Parts List</button>
            </nav>
         </div>
      </div>

      <main className="flex-1 relative overflow-hidden flex flex-col">
         
         {/* Specifications View */}
         <div className={`absolute inset-0 bg-[#f9fafb] z-30 transition-opacity duration-300 overflow-y-auto ${viewMode === 'specs' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="max-w-4xl mx-auto py-8 px-4 lg:px-8 min-h-full flex flex-col">
               <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden flex-1 flex flex-col">
                  <SpecificationsPanel 
                    decks={decks} onDecksChange={setDecks} 
                    ramps={ramps} onRampsChange={setRamps} 
                    handrails={handrails} onHandrailsChange={setHandrails} 
                    onComplete={() => switchView('design')} 
                  />
               </div>
            </div>
         </div>

         {/* Simulation View */}
         <div className={`absolute inset-0 bg-[#f9fafb] z-10 transition-opacity duration-300 ${viewMode === 'design' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <DeckVisualizer3D data={calculationResult} onSelect={handleSelection} selectionId={selection?.id || null} layers={layers} />
            
            {/* Bottom Left HUD Info */}
            <div className="absolute left-6 bottom-6 z-20 flex flex-col gap-3 pointer-events-none">
               <div className="bg-white/90 backdrop-blur-sm px-5 py-3 rounded-lg border-l-4 border-[#2563eb] shadow-md">
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase block mb-1">Total Ground Area</span>
                  <span className="text-2xl font-bold text-[#111827]">{calculationResult.totalArea.toFixed(1)} <span className="text-sm font-normal text-[#6b7280]">m²</span></span>
               </div>
               <div className="bg-white/90 backdrop-blur-sm px-5 py-3 rounded-lg border-l-4 border-[#9ca3af] shadow-md">
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase block mb-1">Total Feet Required</span>
                  <span className="text-2xl font-bold text-[#111827]">{calculationResult.calculatedFeetCount} <span className="text-sm font-normal text-[#6b7280]">Units</span></span>
               </div>
            </div>

            {/* View Toggles Drawer */}
            <div className={`absolute right-0 top-6 transition-transform duration-300 z-30 flex ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[calc(100%-2.5rem)]'}`}>
               <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="w-10 h-10 bg-white border border-[#e5e7eb] border-r-0 rounded-l-md flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] shadow-sm transition-colors"
                  title="Toggle Layers"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
               </button>
               <div className="bg-white border border-[#e5e7eb] p-5 rounded-bl-lg flex flex-col gap-4 w-56 shadow-lg">
                  <h4 className="text-xs font-bold text-[#4b5563] uppercase tracking-wider mb-1 border-b border-[#e5e7eb] pb-2">Visibility Layers</h4>
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" checked={layers.structure} onChange={e => setLayers({...layers, structure: e.target.checked})} className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                     <span className="text-sm text-[#4b5563] group-hover:text-[#111827] transition-colors">Structure</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" checked={layers.ledgers} onChange={e => setLayers({...layers, ledgers: e.target.checked})} className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                     <span className="text-sm text-[#4b5563] group-hover:text-[#111827] transition-colors">Ledgers</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" checked={layers.terrain} onChange={e => setLayers({...layers, terrain: e.target.checked})} className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                     <span className="text-sm text-[#4b5563] group-hover:text-[#111827] transition-colors">Terrain</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" checked={layers.rostrums} onChange={e => setLayers({...layers, rostrums: e.target.checked})} className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                     <span className="text-sm text-[#4b5563] group-hover:text-[#111827] transition-colors">Rostrums</span>
                  </label>
               </div>
            </div>
         </div>

         {/* BOM / Analysis View */}
            <div className={`absolute inset-0 bg-[#f9fafb] z-20 transition-opacity duration-300 overflow-y-auto ${viewMode === 'analysis' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
               <div className="max-w-6xl mx-auto px-8 py-12 flex flex-col gap-8">
                  <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                     <div className="flex-1">
                        <h2 className="text-3xl font-bold text-[#111827] tracking-tight mb-2">Project Parts List</h2>
                        <p className="text-[#6b7280] text-sm max-w-xl leading-relaxed">
                           Automatic bill of materials generated from your current configuration. All components reflect standard scaffolding parts.
                        </p>
                     </div>
                     <StatsPanel data={calculationResult} isValid={calculationResult.status === 'SOLVED'} />
                  </div>
                  
                  <div className="bg-white rounded-lg overflow-hidden border border-[#e5e7eb] shadow-sm">
                     <div className="px-6 py-4 border-b border-[#e5e7eb] flex justify-between items-center bg-[#f9fafb]">
                        <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wider">Inventory Breakdown</h3>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-[#d1d5db] text-xs font-semibold text-[#374151] hover:bg-[#f3f4f6] transition-all rounded shadow-sm flex items-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                           Export CSV / PDF
                        </button>
                     </div>
                     <BillOfMaterials data={calculationResult} />
                  </div>
               </div>
            </div>
      </main>
    </div>
  );
};

export default App;
