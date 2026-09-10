import React, { useState, useEffect } from 'react';
import { Project, DeckConfig, RampConfig, HandrailConfig } from '../types';
import { FolderOpen, Plus, Save, Edit2, Trash2, X, Cloud, LogIn, LogOut } from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken } from '../utils/auth';
import { saveProjectToDrive, updateProjectInDrive, listProjectsFromDrive, getProjectFromDrive, deleteProjectFromDrive } from '../utils/drive';

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
  const [driveProjects, setDriveProjects] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [clientName, setClientName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

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
    const unsubscribe = initAuth(
      () => {
        setIsAuthenticated(true);
        if (isOpen) fetchDriveProjects();
      },
      () => setIsAuthenticated(false)
    );
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (currentProject) {
      setSiteName(currentProject.siteName);
      setClientName(currentProject.clientName);
    } else {
      setSiteName('');
      setClientName('');
    }
  }, [currentProject]);

  const fetchDriveProjects = async () => {
    setIsLoadingDrive(true);
    try {
      const files = await listProjectsFromDrive();
      setDriveProjects(files || []);
    } catch (e) {
      console.error('Failed to load projects from Google Drive', e);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleLogin = async () => {
    try {
      await googleSignIn();
      setIsAuthenticated(true);
      fetchDriveProjects();
    } catch (e) {
      console.error('Login failed', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setDriveProjects([]);
  };

  const saveToStorage = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('deck_builder_projects', JSON.stringify(newProjects));
  };

  const handleSave = async (toDrive: boolean = false) => {
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
      
      if (!toDrive) {
         saveToStorage(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
      }
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
      if (!toDrive) {
         saveToStorage([...projects, updatedProject]);
      }
    }

    if (toDrive) {
      try {
         setIsLoadingDrive(true);
         const filename = `${siteName} - ${clientName}.json`;
         if (updatedProject.driveFileId) {
             await updateProjectInDrive(updatedProject.driveFileId, updatedProject);
         } else {
             const driveFile = await saveProjectToDrive(updatedProject, filename);
             updatedProject.driveFileId = driveFile.id;
         }
         alert('Project saved to Google Drive!');
      } catch (e) {
         console.error('Failed to save to Drive', e);
         alert('Failed to save to Google Drive');
      } finally {
         setIsLoadingDrive(false);
      }
    }
    
    onSaveProject(updatedProject);
    setIsEditing(false);
    if (isOpen && toDrive) fetchDriveProjects();
  };

  const handleDelete = async (id: string, isDrive: boolean = false) => {
    if (confirm(`Are you sure you want to delete this project${isDrive ? ' from Google Drive' : ''}?`)) {
      if (isDrive) {
         try {
             setIsLoadingDrive(true);
             await deleteProjectFromDrive(id);
             await fetchDriveProjects();
         } catch (e) {
             console.error('Failed to delete from Drive', e);
             alert('Failed to delete from Google Drive');
         } finally {
             setIsLoadingDrive(false);
         }
      } else {
         saveToStorage(projects.filter(p => p.id !== id));
      }
      if (currentProject?.id === id || currentProject?.driveFileId === id) {
        onNewProject();
      }
    }
  };

  const loadFromDrive = async (fileId: string) => {
      try {
          setIsLoadingDrive(true);
          const projectData = await getProjectFromDrive(fileId);
          onLoadProject(projectData);
          setIsOpen(false);
      } catch (e) {
          console.error('Failed to load project from Drive', e);
          alert('Failed to load project from Google Drive');
      } finally {
          setIsLoadingDrive(false);
      }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            setIsOpen(true);
            if (isAuthenticated) fetchDriveProjects();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#e6f2f5] hover:bg-[#dcebf0] border border-[#b8d4e3] hover:border-cyan-600/50 rounded text-xs font-mono font-semibold text-[#334155] hover:text-cyan-600 transition-all shadow-sm"
        >
          <FolderOpen size={13} className="text-cyan-600" />
          Projects
        </button>
        
        {currentProject && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#e6f2f5] border border-[#b8d4e3] rounded text-xs font-mono shadow-sm">
            <span className="text-[#64748b] text-[10px] uppercase">Active:</span>
            <span className="text-cyan-600 font-semibold truncate max-w-[120px]">{currentProject.siteName}</span>
            <button onClick={() => setIsEditing(true)} className="ml-1 text-[#64748b] hover:text-cyan-600 transition-colors">
              <Edit2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3f]/80 backdrop-blur-md">
          <div className="bg-[#e6f2f5] border border-[#b8d4e3] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#b8d4e3] bg-[#dcebf0]">
              <h2 className="text-sm font-mono font-bold text-[#0f172a] flex items-center gap-2 tracking-wider uppercase">
                <FolderOpen size={16} className="text-cyan-600" />
                Project Directory & Sync
              </h2>
              <div className="flex items-center gap-4">
                {isAuthenticated ? (
                  <button onClick={handleLogout} className="flex items-center gap-1.5 text-[#475569] hover:text-[#ef4444] text-xs font-mono font-semibold transition-colors">
                    <LogOut size={13} /> Logout
                  </button>
                ) : (
                  <button onClick={handleLogin} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#eef5f9] border border-[#a3c9db] text-[#334155] rounded shadow-sm hover:border-cyan-600 text-xs font-mono font-semibold transition-all">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-3.5 h-3.5" />
                    Sign in with Google
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-[#64748b] hover:text-[#0f172a] transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto bg-[#eef5f9] grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Local Projects */}
              <div>
                 <div className="flex justify-between items-center mb-3">
                   <h3 className="text-xs font-mono font-bold text-cyan-600 uppercase tracking-wider">Local Workspaces</h3>
                 </div>
                 
                 {projects.length === 0 ? (
                   <div className="text-center py-8 border border-[#b8d4e3] rounded-lg border-dashed bg-[#e6f2f5]/50">
                     <p className="text-[#64748b] text-xs font-mono">No local projects saved.</p>
                   </div>
                 ) : (
                   <div className="grid gap-2.5">
                     {projects.map(p => (
                       <div key={p.id} className="flex items-center justify-between p-3 bg-[#e6f2f5] border border-[#b8d4e3] rounded-lg hover:border-cyan-600/50 transition-all group">
                         <div>
                           <div className="font-mono font-semibold text-[#0f172a] text-xs">{p.siteName}</div>
                           <div className="text-[11px] font-mono text-[#64748b] mt-0.5">Client: {p.clientName}</div>
                         </div>
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => {
                               onLoadProject(p);
                               setIsOpen(false);
                             }}
                             className="px-2.5 py-1 bg-[#dcebf0] hover:bg-cyan-600 hover:text-white border border-[#a3c9db] rounded text-xs font-mono font-semibold text-cyan-600 transition-colors"
                           >
                             Open
                           </button>
                           <button 
                             onClick={() => handleDelete(p.id)}
                             className="p-1 text-[#ef4444] hover:bg-[#ef4444]/15 rounded transition-colors"
                           >
                             <Trash2 size={13} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              {/* Cloud Projects */}
              <div className="border-t md:border-t-0 md:border-l border-[#b8d4e3] pt-6 md:pt-0 md:pl-6">
                 <div className="flex justify-between items-center mb-3">
                   <h3 className="text-xs font-mono font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1.5"><Cloud size={13} className="text-cyan-600" /> Google Drive Cloud</h3>
                 </div>
                 
                 {!isAuthenticated ? (
                    <div className="text-center py-8 border border-[#b8d4e3] rounded-lg border-dashed bg-[#e6f2f5]/50">
                       <p className="text-[#64748b] text-xs font-mono mb-3">Sign in to sync with Google Drive</p>
                    </div>
                 ) : isLoadingDrive ? (
                    <div className="text-center py-8 border border-[#b8d4e3] rounded-lg border-dashed bg-[#e6f2f5]/50">
                       <p className="text-[#64748b] text-xs font-mono">Loading Drive files...</p>
                    </div>
                 ) : driveProjects.length === 0 ? (
                    <div className="text-center py-8 border border-[#b8d4e3] rounded-lg border-dashed bg-[#e6f2f5]/50">
                       <p className="text-[#64748b] text-xs font-mono">No cloud projects found.</p>
                    </div>
                 ) : (
                   <div className="grid gap-2.5">
                     {driveProjects.map(p => (
                       <div key={p.id} className="flex items-center justify-between p-3 bg-[#e6f2f5] border border-[#b8d4e3] rounded-lg hover:border-cyan-600/50 transition-all group">
                         <div>
                           <div className="font-mono font-semibold text-[#0f172a] text-xs truncate max-w-[140px]">{p.name.replace('.json', '')}</div>
                           <div className="text-[10px] font-mono text-[#64748b] mt-0.5">{new Date(p.modifiedTime).toLocaleDateString()}</div>
                         </div>
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => loadFromDrive(p.id)}
                             className="px-2.5 py-1 bg-[#dcebf0] hover:bg-cyan-600 hover:text-white border border-[#a3c9db] rounded text-xs font-mono font-semibold text-cyan-600 transition-colors"
                           >
                             Open
                           </button>
                           <button 
                             onClick={() => handleDelete(p.id, true)}
                             className="p-1 text-[#ef4444] hover:bg-[#ef4444]/15 rounded transition-colors"
                           >
                             <Trash2 size={13} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>
            <div className="p-4 border-t border-[#b8d4e3] bg-[#dcebf0] flex justify-end">
                <button 
                  onClick={() => {
                    onNewProject();
                    setIsOpen(false);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  <Plus size={14} />
                  New Project
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Save Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001f3f]/80 backdrop-blur-md">
          <div className="bg-[#e6f2f5] border border-[#b8d4e3] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#b8d4e3] bg-[#dcebf0]">
              <h2 className="text-xs font-mono font-bold text-[#0f172a] flex items-center gap-2 uppercase tracking-wider">
                <Save size={15} className="text-cyan-600" />
                {currentProject ? 'Edit Project Metadata' : 'Save Project Specification'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-[#64748b] hover:text-[#0f172a] transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 bg-[#eef5f9]">
              <div>
                <label className="block text-[11px] font-mono font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Site / Venue Name</label>
                <input 
                  type="text" 
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className="w-full bg-[#dcebf0] border border-[#a3c9db] rounded px-3 py-2 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/50 transition-all shadow-inner"
                  placeholder="e.g. Festival Main Stage Setup"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-bold text-[#475569] mb-1.5 uppercase tracking-wide">Client / Organization</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-[#dcebf0] border border-[#a3c9db] rounded px-3 py-2 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/50 transition-all shadow-inner"
                  placeholder="e.g. Acme Productions"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-[#b8d4e3] bg-[#dcebf0] flex justify-end gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded text-xs font-mono font-semibold text-[#475569] hover:text-[#0f172a] hover:bg-[#232733] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSave(false)}
                className="px-3.5 py-1.5 bg-[#eef5f9] border border-[#a3c9db] text-[#334155] hover:text-cyan-600 hover:border-cyan-600/50 rounded text-xs font-mono font-semibold transition-all shadow-sm"
              >
                Save Local
              </button>
              {isAuthenticated && (
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isLoadingDrive}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Cloud size={14} /> Save to Drive
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
