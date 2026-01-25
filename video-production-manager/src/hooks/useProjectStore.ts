/**
 * Project Store
 * Manages active project data with IndexedDB persistence and change tracking
 * 
 * This store wraps project-specific data and syncs with IndexedDB.
 * For now, it delegates to the existing useProductionStore for compatibility.
 * Future: Gradually migrate all project data here.
 */

import { create } from 'zustand';
import type { VideoDepProject, ChangeRecord } from '@/types';
import { projectDB } from '@/utils/indexedDB';
import { v4 as uuidv4 } from 'uuid';

interface ProjectStoreState {
  // Active Project
  activeProjectId: string | null;
  activeProject: VideoDepProject | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSyncTime: number;
  
  // Pending Changes (for real-time sync)
  pendingChanges: ChangeRecord[];
  
  // Actions
  loadProject: (id: string) => Promise<void>;
  createProject: (project: Omit<VideoDepProject, 'version' | 'created' | 'modified'>) => Promise<string>;
  saveProject: () => Promise<void>;
  closeProject: () => void;
  
  // Change Tracking
  recordChange: (action: 'create' | 'update' | 'delete', entityType: string, entityId: string, changes: any) => void;
  flushChanges: () => Promise<void>;
  
  // Project Management
  deleteProject: (id: string) => Promise<void>;
  listProjects: () => Promise<VideoDepProject[]>;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  // Initial State
  activeProjectId: null,
  activeProject: null,
  isLoading: false,
  isSaving: false,
  lastSyncTime: 0,
  pendingChanges: [],

  // Load Project
  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const project = await projectDB.getProject(id);
      if (!project) {
        throw new Error('Project not found');
      }
      set({ 
        activeProjectId: id, 
        activeProject: project,
        lastSyncTime: Date.now(),
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Create New Project
  createProject: async (projectData) => {
    const id = uuidv4();
    const project: VideoDepProject = {
      ...projectData,
      version: '1.0.0',
      created: Date.now(),
      modified: Date.now(),
    };
    
    // Add ID to production if not present
    if (!project.production.id) {
      project.production.id = uuidv4();
    }

    try {
      await projectDB.createProject({ ...project, id } as any);
      set({ 
        activeProjectId: id, 
        activeProject: { ...project, id } as any 
      });
      return id;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  // Save Active Project
  saveProject: async () => {
    const { activeProjectId, activeProject } = get();
    if (!activeProjectId || !activeProject) return;

    set({ isSaving: true });
    try {
      await projectDB.updateProject(activeProjectId, {
        ...activeProject,
        modified: Date.now()
      });
      set({ isSaving: false, lastSyncTime: Date.now() });
    } catch (error) {
      console.error('Failed to save project:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  // Close Project
  closeProject: () => {
    set({ 
      activeProjectId: null, 
      activeProject: null,
      pendingChanges: []
    });
  },

  // Record Change (for sync)
  recordChange: (action, entityType, entityId, changes) => {
    const change: ChangeRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      action,
      entityType,
      entityId,
      changes
    };
    
    set((state) => ({
      pendingChanges: [...state.pendingChanges, change]
    }));

    // Auto-flush changes every 2 seconds (simulating real-time sync)
    setTimeout(() => {
      get().flushChanges();
    }, 2000);
  },

  // Flush Pending Changes to IndexedDB
  flushChanges: async () => {
    const { pendingChanges, activeProjectId } = get();
    if (pendingChanges.length === 0 || !activeProjectId) return;

    try {
      // Save changes to IndexedDB (simulating cloud sync)
      for (const change of pendingChanges) {
        await projectDB.recordChange({ ...change, projectId: activeProjectId } as any);
      }
      
      // Clear pending changes
      set({ pendingChanges: [] });
      
      // Save project state
      await get().saveProject();
    } catch (error) {
      console.error('Failed to flush changes:', error);
    }
  },

  // Delete Project
  deleteProject: async (id: string) => {
    try {
      await projectDB.deleteProject(id);
      if (get().activeProjectId === id) {
        get().closeProject();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  },

  // List All Projects
  listProjects: async () => {
    try {
      return await projectDB.getAllProjects();
    } catch (error) {
      console.error('Failed to list projects:', error);
      throw error;
    }
  },
}));

// Auto-save interval (every 30 seconds)
setInterval(() => {
  const store = useProjectStore.getState();
  if (store.activeProject && !store.isSaving) {
    store.saveProject();
  }
}, 30000);
