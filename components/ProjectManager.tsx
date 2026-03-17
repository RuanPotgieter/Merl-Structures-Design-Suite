import React, { useState, useEffect } from 'react';
import { Project, DeckConfig, RampConfig, HandrailConfig } from '../types';
import { FolderOpen, Plus, Save, Edit2, Trash2, X } from 'lucide-react';

interface ProjectManagerProps {
  currentProject: Project | null;
  onLoadProject: (project: Project) => void;
  onSaveProject: (project: Project) => void;
  onNewProject: () => void;
  decks: DeckConfig[];
  ramps: RampConfig[];
  handrails: HandrailConfig[];
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  currentProject,
  onLoadProject,
  onSaveProject,
  onNewProject,
  decks,
  ramps,
  handrails
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('deck_builder_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }
  }, []);

  useEffect(() => {
    if (currentProject) {
      setSiteName(currentProject.siteName);
      setClientName(currentProject.clientName);
    } else {
      setSiteName('');
      setClientName('');
    }
  }, [currentProject]);

  const saveToStorage = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('deck_builder_projects', JSON.stringify(newProjects));
  };

  const handleSave = () => {
    if (!siteName || !clientName) {
      alert('Please enter both Site Name and Client Name');
      return;
    }

    const now = Date.now();
    let updatedProject: Project;

    if (currentProject) {
      updatedProject = {
        ...currentProject,
        siteName,
        clientName,
        decks,
        ramps,
        handrails,
        updatedAt: now
      };
      saveToStorage(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    } else {
      updatedProject = {
        id: `proj_${now}`,
        siteName,
        clientName,
        decks,
        ramps,
        handrails,
        createdAt: now,
        updatedAt: now
      };
      saveToStorage([...projects, updatedProject]);
    }
    
    onSaveProject(updatedProject);
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      saveToStorage(projects.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        onNewProject();
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium transition-colors"
        >
          <FolderOpen size={14} />
          Projects
        </button>
        
        {currentProject && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00d2ff]/10 border border-[#00d2ff]/20 rounded-md text-xs">
            <span className="text-white/60">Current:</span>
            <span className="text-[#00d2ff] font-medium">{currentProject.siteName}</span>
            <button onClick={() => setIsEditing(true)} className="ml-2 text-white/40 hover:text-white">
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <FolderOpen size={18} className="text-[#00d2ff]" />
                Project Manager
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Saved Projects</h3>
                <button 
                  onClick={() => {
                    onNewProject();
                    setIsOpen(false);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d2ff] text-black rounded-md text-xs font-bold hover:bg-[#00b8e6] transition-colors"
                >
                  <Plus size={14} />
                  New Project
                </button>
              </div>
              
              {projects.length === 0 ? (
                <div className="text-center py-12 border border-white/5 rounded-lg border-dashed">
                  <p className="text-white/40 text-sm">No projects saved yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:border-white/20 transition-colors group">
                      <div>
                        <div className="font-medium text-white text-sm">{p.siteName}</div>
                        <div className="text-xs text-white/40 mt-0.5">Client: {p.clientName} • Last updated: {new Date(p.updatedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            onLoadProject(p);
                            setIsOpen(false);
                          }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
                        >
                          Open
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Save Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Save size={18} className="text-[#00d2ff]" />
                {currentProject ? 'Edit Project Details' : 'Save New Project'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Site Name</label>
                <input 
                  type="text" 
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d2ff]/50 transition-colors"
                  placeholder="e.g. Main Stage Setup"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Client Name</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d2ff]/50 transition-colors"
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-[#00d2ff] text-black rounded-md text-sm font-bold hover:bg-[#00b8e6] transition-colors"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
