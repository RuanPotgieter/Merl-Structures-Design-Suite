import React, { useState, useEffect } from 'react';
import { calculateDecks } from './utils/deckLogic';
import { DeckVisualizer3D } from './components/DeckVisualizer3D';
import { SpecificationsPanel } from './components/SpecificationsPanel';
import { BillOfMaterials } from './components/BillOfMaterials';
import { StatsPanel } from './components/StatsPanel';
import { ProjectManager } from './components/ProjectManager';
import { DeckConfig, DeckCalculationResult, RampConfig, Project } from './types';

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

type ViewMode = 'specifications' | 'design' | 'analysis';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('specifications');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [decks, setDecks] = useState<DeckConfig[]>([INITIAL_DECK]);
  const [ramps, setRamps] = useState<RampConfig[]>([]);
  const [handrails, setHandrails] = useState<HandrailConfig[]>([]);
  const [calculationResult, setCalculationResult] = useState<DeckCalculationResult>(() => calculateDecks([INITIAL_DECK], [], []));
  
  const [selection, setSelection] = useState<{ type: string; id: string; data: any } | null>(null);
  const [layers, setLayers] = useState({ structure: true, ledgers: true, terrain: true, rostrums: true });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const switchView = (mode: ViewMode) => {
    if (mode !== 'specifications') {
      setCalculationResult(calculateDecks(decks, ramps, handrails));
    }
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
    setCalculationResult(calculateDecks(project.decks || [INITIAL_DECK], project.ramps || [], project.handrails || []));
  };

  const handleSaveProject = (project: Project) => {
    setCurrentProject(project);
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setDecks([INITIAL_DECK]);
    setRamps([]);
    setHandrails([]);
    setCalculationResult(calculateDecks([INITIAL_DECK], [], []));
  };

  return (
    <div className="flex flex-col h-screen bg-[#080808] overflow-hidden text-[#e2e2e7] font-sans relative">
      
      {/* Top Header Terminal */}
      <div className="h-14 shrink-0 flex items-center justify-between px-6 z-50 glass-panel border-b border-white/5">
         <div className="flex items-center gap-10">
            <div className="flex flex-col">
               <span className="text-[14px] font-display font-black tracking-[0.2em] text-white">MERL MAGIC</span>
               <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">Deck Builder v2.5.0</span>
            </div>
            
            <ProjectManager 
              currentProject={currentProject}
              onLoadProject={handleLoadProject}
              onSaveProject={handleSaveProject}
              onNewProject={handleNewProject}
              decks={decks}
              ramps={ramps}
              handrails={handrails}
            />
            
            <nav className="flex bg-white/5 p-1 rounded-lg border border-white/5">
               <button onClick={() => switchView('specifications')} className={`px-5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'specifications' ? 'bg-[#00d2ff] text-black' : 'text-white/40 hover:text-white'}`}>Specifications</button>
               <button onClick={() => switchView('design')} className={`px-5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'design' ? 'bg-[#00d2ff] text-black' : 'text-white/40 hover:text-white'}`}>3D View</button>
               <button onClick={() => switchView('analysis')} className={`px-5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'analysis' ? 'bg-[#00d2ff] text-black' : 'text-white/40 hover:text-white'}`}>Parts List</button>
            </nav>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-[9px] font-mono text-white/40 uppercase tracking-tighter">System Ready</span>
            </div>
         </div>
      </div>

      <main className="flex-1 relative overflow-hidden flex flex-col lg:flex-row">
         
         {/* Specifications View */}
         <div className={`absolute inset-0 bg-[#0a0a0c] z-40 transition-all duration-500 overflow-y-auto ${viewMode === 'specifications' ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <SpecificationsPanel decks={decks} onDecksChange={setDecks} ramps={ramps} onRampsChange={setRamps} handrails={handrails} onHandrailsChange={setHandrails} onComplete={() => switchView('design')} />
         </div>

         {/* Simulation View */}
         <div className={`relative w-full h-full transition-all duration-500 ease-in-out ${viewMode === 'design' ? 'flex-1 opacity-100' : 'hidden opacity-0 pointer-events-none'}`}>
            <DeckVisualizer3D data={calculationResult} onSelect={handleSelection} selectionId={selection?.id || null} layers={layers} />
            
            {/* Bottom Left HUD Info */}
            <div className="absolute left-4 bottom-20 lg:bottom-6 z-20 flex flex-col gap-2 pointer-events-none">
               <div className="glass-panel px-4 py-2 lg:px-5 lg:py-3 rounded border-l-2 border-[#00d2ff]">
                  <span className="text-[8px] lg:text-[9px] font-mono text-white/30 uppercase block mb-1">Total Ground Area</span>
                  <span className="text-xl lg:text-2xl font-mono font-bold text-white tracking-tighter">{calculationResult.totalArea.toFixed(1)} <span className="text-xs lg:text-sm font-normal text-white/40">M²</span></span>
               </div>
               <div className="glass-panel px-4 py-2 lg:px-5 lg:py-3 rounded border-l-2 border-white/20">
                  <span className="text-[8px] lg:text-[9px] font-mono text-white/30 uppercase block mb-1">Total feet required</span>
                  <span className="text-xl lg:text-2xl font-mono font-bold text-white tracking-tighter">{calculationResult.calculatedFeetCount} <span className="text-xs lg:text-sm font-normal text-white/40">Units</span></span>
               </div>
            </div>
         </div>

         {/* BOM / Analysis View */}
         <div className={`absolute inset-0 bg-[#0a0a0c] z-40 transition-all duration-500 overflow-y-auto ${viewMode === 'analysis' ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <div className="max-w-6xl mx-auto px-8 py-16 flex flex-col gap-12">
               <div className="flex flex-col lg:flex-row gap-10 items-start">
                  <div className="flex-1">
                     <h2 className="text-4xl font-display font-black text-white uppercase tracking-tight mb-3">Parts List</h2>
                     <div className="hud-line mb-4"></div>
                     <p className="text-white/40 text-sm max-w-lg leading-relaxed font-mono italic">
                        Automatic parts list generated for your deck build. All components are standard scaffolding parts.
                     </p>
                  </div>
                  <StatsPanel data={calculationResult} isValid={calculationResult.status === 'SOLVED'} />
               </div>
               
               <div className="glass-panel rounded-lg overflow-hidden border border-white/5 bg-white">
                  <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-[#f3f2f1]">
                     <h3 className="text-lg font-display font-black text-gray-800 uppercase tracking-widest">Parts List</h3>
                     <button onClick={() => window.print()} className="px-6 py-2 bg-white border border-gray-300 text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-100 transition-all rounded shadow-sm">Download CSV / PDF</button>
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
