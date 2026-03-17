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
          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#f3f4f6] border border-[#e5e7eb] rounded-md text-xs font-semibold text-[#374151] transition-colors shadow-sm"
        >
          <FolderOpen size={14} className="text-[#6b7280]" />
          Projects
        </button>
        
        {currentProject && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-md text-xs shadow-sm">
            <span className="text-[#6b7280] font-medium">Current:</span>
            <span className="text-[#1d4ed8] font-semibold">{currentProject.siteName}</span>
            <button onClick={() => setIsEditing(true)} className="ml-2 text-[#9ca3af] hover:text-[#2563eb] transition-colors">
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
              <h2 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
                <FolderOpen size={18} className="text-[#2563eb]" />
                Project Manager
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-[#9ca3af] hover:text-[#4b5563] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-[#6b7280] uppercase tracking-wider">Saved Projects</h3>
                <button 
                  onClick={() => {
                    onNewProject();
                    setIsOpen(false);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] text-white rounded-md text-xs font-semibold hover:bg-[#1d4ed8] transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  New Project
                </button>
              </div>
              
              {projects.length === 0 ? (
                <div className="text-center py-12 border border-[#e5e7eb] rounded-lg border-dashed bg-[#f9fafb]">
                  <p className="text-[#6b7280] text-sm font-medium">No projects saved yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-[#e5e7eb] rounded-lg hover:border-[#bfdbfe] hover:bg-[#eff6ff] transition-colors group shadow-sm">
                      <div>
                        <div className="font-semibold text-[#111827] text-sm">{p.siteName}</div>
                        <div className="text-xs text-[#6b7280] mt-0.5 font-medium">Client: {p.clientName} • Last updated: {new Date(p.updatedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            onLoadProject(p);
                            setIsOpen(false);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-[#f3f4f6] border border-[#e5e7eb] rounded text-xs font-semibold text-[#374151] transition-colors shadow-sm"
                        >
                          Open
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
              <h2 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
                <Save size={18} className="text-[#2563eb]" />
                {currentProject ? 'Edit Project Details' : 'Save New Project'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-[#9ca3af] hover:text-[#4b5563] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 bg-white">
              <div>
                <label className="block text-xs font-bold text-[#4b5563] mb-1.5 uppercase tracking-wide">Site Name</label>
                <input 
                  type="text" 
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className="w-full bg-white border border-[#d1d5db] rounded-md px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-sm"
                  placeholder="e.g. Main Stage Setup"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4b5563] mb-1.5 uppercase tracking-wide">Client Name</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-white border border-[#d1d5db] rounded-md px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all shadow-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-[#e5e7eb] bg-[#f9fafb] flex justify-end gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-md text-sm font-semibold text-[#4b5563] hover:text-[#111827] hover:bg-[#e5e7eb] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-[#2563eb] text-white rounded-md text-sm font-semibold hover:bg-[#1d4ed8] transition-colors shadow-sm"
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
