import { Project, DeckConfig, RampConfig, HandrailConfig } from '../types';

export const LOCAL_STORAGE_PROJECTS_KEY = 'merl_cad_local_projects';
export const LOCAL_STORAGE_ACTIVE_KEY = 'merl_cad_active_project';
export const LOCAL_STORAGE_DRAFT_KEY = 'merl_cad_draft_autosave';

export interface DraftProjectState {
  project: Project | null;
  decks: DeckConfig[];
  ramps: RampConfig[];
  handrails: HandrailConfig[];
  timestamp: number;
}

export interface StorageProjectSummary {
  id: string;
  siteName: string;
  clientName: string;
  updatedAt: number;
  createdAt: number;
  deckCount: number;
  totalAreaApprox: number;
}

/**
 * Retrieve all projects saved in browser Local Storage
 */
export function getLocalStorageProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY) || localStorage.getItem('deck_builder_projects');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read projects from local storage:', err);
    return [];
  }
}

/**
 * Save or update a project in browser Local Storage
 */
export function saveProjectToLocalStorage(project: Project): Project {
  try {
    const currentList = getLocalStorageProjects();
    const now = Date.now();
    const updated: Project = {
      ...project,
      id: project.id || `proj_${now}`,
      createdAt: project.createdAt || now,
      updatedAt: now
    };

    const index = currentList.findIndex(p => p.id === updated.id);
    let newList: Project[];
    if (index >= 0) {
      newList = [...currentList];
      newList[index] = updated;
    } else {
      newList = [updated, ...currentList];
    }

    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(newList));
    // Also save legacy key for backward compatibility
    localStorage.setItem('deck_builder_projects', JSON.stringify(newList));
    // Save as current active project
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, JSON.stringify(updated));

    return updated;
  } catch (err) {
    console.error('Failed to save project to local storage:', err);
    throw new Error('Local storage full or inaccessible');
  }
}

/**
 * Delete a project from browser Local Storage
 */
export function deleteProjectFromLocalStorage(id: string): Project[] {
  try {
    const currentList = getLocalStorageProjects();
    const filtered = currentList.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(filtered));
    localStorage.setItem('deck_builder_projects', JSON.stringify(filtered));

    const activeRaw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
        if (active.id === id) {
          localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
        }
      } catch (e) {
        // ignore
      }
    }
    return filtered;
  } catch (err) {
    console.error('Failed to delete project from local storage:', err);
    return [];
  }
}

/**
 * Get the last active project from browser Local Storage
 */
export function getActiveProjectFromLocalStorage(): Project | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
    if (raw) return JSON.parse(raw);
    const all = getLocalStorageProjects();
    return all.length > 0 ? all[0] : null;
  } catch (err) {
    console.error('Failed to load active project:', err);
    return null;
  }
}

/**
 * Continuously auto-save working draft state to prevent data loss on refresh or browser discard
 */
export function autoSaveDraftToLocalStorage(draft: Omit<DraftProjectState, 'timestamp'>): void {
  try {
    const state: DraftProjectState = {
      ...draft,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(state));
    
    // Also update active project cache if project exists or synthesized
    if (draft.decks && draft.decks.length > 0) {
      const activeProj: Project = {
        id: draft.project?.id || 'draft_active',
        siteName: draft.project?.siteName || 'Work In Progress',
        clientName: draft.project?.clientName || 'CAD Draft',
        decks: draft.decks,
        ramps: draft.ramps || [],
        handrails: draft.handrails || [],
        createdAt: draft.project?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, JSON.stringify(activeProj));
    }
  } catch (err) {
    console.warn('Auto-save failed to write to local storage:', err);
  }
}

/**
 * Retrieve the auto-saved working draft if available
 */
export function getAutoSavedDraftFromLocalStorage(): DraftProjectState | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.decks) && parsed.decks.length > 0) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Failed to retrieve auto-saved draft:', err);
    return null;
  }
}

/**
 * Clear the draft from local storage
 */
export function clearDraftFromLocalStorage(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * Export project as a downloadable .cadproj / .json file
 */
export function exportProjectToFile(project: Project) {
  try {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = (project.siteName || 'scaffold_project').replace(/[^a-z0-9_-]/gi, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.cadproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export project file:', err);
    return false;
  }
}

/**
 * Import a project from an uploaded .cadproj or .json file
 */
export function importProjectFromFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.decks || !Array.isArray(parsed.decks)) {
          throw new Error('Invalid project file format: missing decks configuration');
        }
        const project: Project = {
          id: parsed.id || `proj_${Date.now()}`,
          siteName: parsed.siteName || file.name.replace(/\.[^/.]+$/, ''),
          clientName: parsed.clientName || 'Imported Client',
          decks: parsed.decks,
          ramps: parsed.ramps || [],
          handrails: parsed.handrails || [],
          createdAt: parsed.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        // Automatically save to local storage
        saveProjectToLocalStorage(project);
        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate a shareable URL containing the complete project data in the hash
 */
export function generateProjectShareUrl(project: Project): string {
  try {
    const payload = {
      s: project.siteName,
      c: project.clientName,
      d: project.decks,
      r: project.ramps,
      h: project.handrails
    };
    const json = JSON.stringify(payload);
    // Base64 encode in URL-safe manner
    const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share=${encoded}`;
  } catch (err) {
    console.error('Failed to encode share URL:', err);
    return window.location.href;
  }
}

/**
 * Parse project data from URL hash if present
 */
export function parseProjectFromUrlHash(): Project | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('share=')) return null;

    const encoded = hash.split('share=')[1];
    if (!encoded) return null;

    // Decode URL-safe base64
    const binary = atob(encoded);
    const json = decodeURIComponent(
      Array.prototype.map.call(binary, (ch: string) => {
        return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );

    const payload = JSON.parse(json);
    if (!payload.d || !Array.isArray(payload.d)) return null;

    const project: Project = {
      id: `proj_shared_${Date.now()}`,
      siteName: payload.s || 'Shared Scaffold Project',
      clientName: payload.c || 'Shared Client',
      decks: payload.d,
      ramps: payload.r || [],
      handrails: payload.h || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return project;
  } catch (err) {
    console.error('Failed to parse project from share URL:', err);
    return null;
  }
}

/**
 * Share project via Web Share API or Clipboard fallback
 */
export async function shareProject(project: Project): Promise<{ method: 'share' | 'clipboard' | 'file'; success: boolean }> {
  const shareUrl = generateProjectShareUrl(project);
  const shareTitle = `${project.siteName || 'Scaffold Deck'} - CAD Specification`;
  const shareText = `Check out this Kwikstage scaffold specification for ${project.siteName || 'Project'} (${project.clientName || 'Client'}).`;

  // Try Native Web Share API if supported
  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      });
      return { method: 'share', success: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
    }
  }

  // Fallback: Copy URL to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl);
    return { method: 'clipboard', success: true };
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return { method: 'clipboard', success: false };
  }
}
