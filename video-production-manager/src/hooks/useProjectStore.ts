/**
 * Project Store
 * Manages active project data with IndexedDB persistence and change tracking
 * 
 * This store wraps project-specific data and syncs with IndexedDB.
 * For now, it delegates to the existing useProductionStore for compatibility.
 * Future: Gradually migrate all project data here.
 */

import { create } from 'zustand';
import type { 
  VideoDepProject, 
  ChangeRecord, 
  Source, 
  Send, 
  ChecklistItem,
  Computer,
  Camera,
  CCU,
  LEDScreen,
  ProjectionScreen,
  MediaServer,
  MediaServerLayer,
  IPAddress,
  VideoSwitcher,
  Router,
  ServerAllocation,
  CableSnake,
  Preset
} from '@/types';
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
  
  // Project Management Actions
  loadProject: (id: string) => Promise<void>;
  createProject: (project: Omit<VideoDepProject, 'version' | 'created' | 'modified'>) => Promise<string>;
  saveProject: () => Promise<void>;
  closeProject: () => void;
  deleteProject: (id: string) => Promise<void>;
  listProjects: () => Promise<VideoDepProject[]>;
  
  // Change Tracking
  recordChange: (action: 'create' | 'update' | 'delete', entityType: string, entityId: string, changes: any) => void;
  flushChanges: () => Promise<void>;
  
  // Helper to update activeProject and auto-save
  updateActiveProject: (updates: Partial<VideoDepProject>) => void;
  
  // Source CRUD
  addSource: (source: Source) => void;
  updateSource: (id: string, updates: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  duplicateSource: (id: string) => void;
  
  // Send CRUD
  addSend: (send: Send) => void;
  updateSend: (id: string, updates: Partial<Send>) => void;
  deleteSend: (id: string) => void;
  duplicateSend: (id: string) => void;
  
  // Checklist CRUD
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'completed'>) => void;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => void;
  deleteChecklistItem: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  
  // Computer CRUD
  addComputer: (computer: Computer) => void;
  updateComputer: (id: string, updates: Partial<Computer>) => void;
  deleteComputer: (id: string) => void;
  
  // Camera CRUD
  addCamera: (camera: Camera) => void;
  updateCamera: (id: string, updates: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  
  // CCU CRUD
  addCCU: (ccu: CCU) => void;
  updateCCU: (id: string, updates: Partial<CCU>) => void;
  deleteCCU: (id: string) => void;
  
  // LED Screen CRUD
  addLEDScreen: (screen: LEDScreen) => void;
  updateLEDScreen: (id: string, updates: Partial<LEDScreen>) => void;
  deleteLEDScreen: (id: string) => void;
  
  // Projection Screen CRUD
  addProjectionScreen: (screen: ProjectionScreen) => void;
  updateProjectionScreen: (id: string, updates: Partial<ProjectionScreen>) => void;
  deleteProjectionScreen: (id: string) => void;
  duplicateProjectionScreen: (id: string) => void;
  
  // Media Server CRUD
  addMediaServer: (server: MediaServer) => void;
  addMediaServerPair: (platform: string, outputs: any[], note?: string) => void;
  updateMediaServer: (id: string, updates: Partial<MediaServer>) => void;
  deleteMediaServer: (id: string) => void;
  
  // Media Server Layer CRUD
  addMediaServerLayer: (layer: MediaServerLayer) => void;
  updateMediaServerLayer: (id: string, updates: Partial<MediaServerLayer>) => void;
  deleteMediaServerLayer: (id: string) => void;
  
  // IP Address CRUD
  addIPAddress: (ip: IPAddress) => void;
  updateIPAddress: (id: string, updates: Partial<IPAddress>) => void;
  deleteIPAddress: (id: string) => void;
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
  
  // Helper: Update active project and trigger save
  updateActiveProject: (updates) => {
    const { activeProject } = get();
    if (!activeProject) {
      console.warn('No active project to update');
      return;
    }
    
    set({ 
      activeProject: { ...activeProject, ...updates } 
    });
    
    // Debounced save - will be picked up by auto-save or manual save
    setTimeout(() => {
      get().saveProject();
    }, 500);
  },
  
  // ===== SOURCE CRUD =====
  addSource: (source) => {
    const { activeProject } = get();
    if (!activeProject) {
      console.warn('No active project - cannot add source');
      return;
    }
    
    const newSource = { ...source, id: source.id || uuidv4() };
    get().updateActiveProject({
      sources: [...activeProject.sources, newSource]
    });
    get().recordChange('create', 'source', newSource.id, newSource);
    console.log('Source added to project:', newSource.id);
  },
  
  updateSource: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      sources: activeProject.sources.map(s => s.id === id ? { ...s, ...updates } : s)
    });
    get().recordChange('update', 'source', id, updates);
    console.log('Source updated:', id);
  },
  
  deleteSource: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      sources: activeProject.sources.filter(s => s.id !== id)
    });
    get().recordChange('delete', 'source', id, {});
    console.log('Source deleted:', id);
  },
  
  duplicateSource: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const source = activeProject.sources.find(s => s.id === id);
    if (!source) return;
    
    // Generate new ID following the naming rules
    const existingSources = activeProject.sources;
    const sends = activeProject.sends;
    
    // Extract base ID without number (e.g., "SRC 1" -> "SRC")
    const baseId = source.id.replace(/\s*\d+$/, '').trim();
    
    // Find highest number for this base
    let maxNum = 0;
    [...existingSources, ...sends].forEach(item => {
      const match = item.id.match(new RegExp(`^${baseId}\\s+(\\d+)$`));
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1]));
      }
    });
    
    const newId = `${baseId} ${maxNum + 1}`;
    const newSource = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`
    };
    
    get().addSource(newSource);
  },
  
  // ===== SEND CRUD =====
  addSend: (send) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newSend = { ...send, id: send.id || uuidv4() };
    get().updateActiveProject({
      sends: [...activeProject.sends, newSend]
    });
    get().recordChange('create', 'send', newSend.id, newSend);
    console.log('Send added to project:', newSend.id);
  },
  
  updateSend: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      sends: activeProject.sends.map(s => s.id === id ? { ...s, ...updates } : s)
    });
    get().recordChange('update', 'send', id, updates);
  },
  
  deleteSend: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      sends: activeProject.sends.filter(s => s.id !== id)
    });
    get().recordChange('delete', 'send', id, {});
  },
  
  duplicateSend: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const send = activeProject.sends.find(s => s.id === id);
    if (!send) return;
    
    const newSend = {
      ...send,
      id: uuidv4(),
      name: `${send.name} (Copy)`
    };
    
    get().addSend(newSend);
  },
  
  // ===== CHECKLIST CRUD =====
  addChecklistItem: (item) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newItem: ChecklistItem = {
      ...item,
      id: `chk-${Date.now()}`,
      completed: false
    };
    
    get().updateActiveProject({
      checklist: [...activeProject.checklist, newItem]
    });
    get().recordChange('create', 'checklist', newItem.id, newItem);
    console.log('Checklist item added:', newItem.id);
  },
  
  updateChecklistItem: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      checklist: activeProject.checklist.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          
          // Handle timestamped entries (convert strings to timestamped format)
          if (typeof updates.moreInfo === 'string' && (updates.moreInfo as string).trim()) {
            const newEntry = {
              id: `entry-${Date.now()}`,
              text: (updates.moreInfo as string).trim(),
              timestamp: Date.now(),
              type: 'info' as const
            };
            updatedItem.moreInfo = [...(item.moreInfo || []), newEntry];
          }
          
          if (typeof updates.completionNote === 'string' && (updates.completionNote as string).trim()) {
            const newEntry = {
              id: `entry-${Date.now()}`,
              text: (updates.completionNote as string).trim(),
              timestamp: Date.now(),
              type: 'completion' as const
            };
            updatedItem.completionNote = [...(item.completionNote || []), newEntry];
          }
          
          return updatedItem;
        }
        return item;
      })
    });
    get().recordChange('update', 'checklist', id, updates);
    console.log('Checklist item updated:', id);
  },
  
  deleteChecklistItem: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      checklist: activeProject.checklist.filter(item => item.id !== id)
    });
    get().recordChange('delete', 'checklist', id, {});
  },
  
  toggleChecklistItem: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      checklist: activeProject.checklist.map(item =>
        item.id === id
          ? { ...item, completed: !item.completed, completedAt: !item.completed ? Date.now() : item.completedAt }
          : item
      )
    });
    get().recordChange('update', 'checklist', id, { completed: 'toggled' });
    console.log('Checklist item toggled:', id);
  },
  
  // ===== COMPUTER CRUD =====
  addComputer: (computer) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newComputer = { ...computer, id: computer.id || uuidv4() };
    get().updateActiveProject({
      computers: [...activeProject.computers, newComputer]
    });
    get().recordChange('create', 'computer', newComputer.id, newComputer);
    console.log('Computer added to project:', newComputer.id);
  },
  
  updateComputer: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      computers: activeProject.computers.map(c => c.id === id ? { ...c, ...updates } : c)
    });
    get().recordChange('update', 'computer', id, updates);
    console.log('Computer updated:', id);
  },
  
  deleteComputer: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      computers: activeProject.computers.filter(c => c.id !== id)
    });
    get().recordChange('delete', 'computer', id, {});
    console.log('Computer deleted:', id);
  },
  
  // ===== CAMERA CRUD =====
  addCamera: (camera) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newCamera = { ...camera, id: camera.id || uuidv4() };
    get().updateActiveProject({
      cameras: [...activeProject.cameras, newCamera]
    });
    get().recordChange('create', 'camera', newCamera.id, newCamera);
    console.log('Camera added to project:', newCamera.id);
  },
  
  updateCamera: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      cameras: activeProject.cameras.map(c => c.id === id ? { ...c, ...updates } : c)
    });
    get().recordChange('update', 'camera', id, updates);
  },
  
  deleteCamera: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      cameras: activeProject.cameras.filter(c => c.id !== id)
    });
    get().recordChange('delete', 'camera', id, {});
  },
  
  // ===== CCU CRUD =====
  addCCU: (ccu) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newCCU = { ...ccu, id: ccu.id || uuidv4() };
    get().updateActiveProject({
      ccus: [...activeProject.ccus, newCCU]
    });
    get().recordChange('create', 'ccu', newCCU.id, newCCU);
    console.log('CCU added to project:', newCCU.id);
  },
  
  updateCCU: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      ccus: activeProject.ccus.map(c => c.id === id ? { ...c, ...updates } : c)
    });
    get().recordChange('update', 'ccu', id, updates);
  },
  
  deleteCCU: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      ccus: activeProject.ccus.filter(c => c.id !== id)
    });
    get().recordChange('delete', 'ccu', id, {});
  },
  
  // ===== LED SCREEN CRUD =====
  addLEDScreen: (screen) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newScreen = { ...screen, id: screen.id || uuidv4() };
    get().updateActiveProject({
      ledScreens: [...activeProject.ledScreens, newScreen]
    });
    get().recordChange('create', 'ledScreen', newScreen.id, newScreen);
  },
  
  updateLEDScreen: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      ledScreens: activeProject.ledScreens.map(s => s.id === id ? { ...s, ...updates } : s)
    });
    get().recordChange('update', 'ledScreen', id, updates);
  },
  
  deleteLEDScreen: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      ledScreens: activeProject.ledScreens.filter(s => s.id !== id)
    });
    get().recordChange('delete', 'ledScreen', id, {});
  },
  
  // ===== PROJECTION SCREEN CRUD =====
  addProjectionScreen: (screen) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newScreen = { ...screen, id: screen.id || uuidv4() };
    get().updateActiveProject({
      projectionScreens: [...activeProject.projectionScreens, newScreen]
    });
    get().recordChange('create', 'projectionScreen', newScreen.id, newScreen);
  },
  
  updateProjectionScreen: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      projectionScreens: activeProject.projectionScreens.map(s => s.id === id ? { ...s, ...updates } : s)
    });
    get().recordChange('update', 'projectionScreen', id, updates);
  },
  
  deleteProjectionScreen: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      projectionScreens: activeProject.projectionScreens.filter(s => s.id !== id)
    });
    get().recordChange('delete', 'projectionScreen', id, {});
  },
  
  duplicateProjectionScreen: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const screen = activeProject.projectionScreens.find(s => s.id === id);
    if (!screen) return;
    
    const newScreen = {
      ...screen,
      id: uuidv4(),
      name: `${screen.name} (Copy)`
    };
    
    get().addProjectionScreen(newScreen);
  },
  
  // ===== MEDIA SERVER CRUD =====
  addMediaServer: (server) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newServer = { ...server, id: server.id || uuidv4() };
    get().updateActiveProject({
      mediaServers: [...activeProject.mediaServers, newServer]
    });
    get().recordChange('create', 'mediaServer', newServer.id, newServer);
  },
  
  addMediaServerPair: (platform: string, outputs: any[], note?: string) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    // Find the next pair number
    const existingPairs = activeProject.mediaServers.map(s => s.pairNumber);
    const nextPairNumber = existingPairs.length > 0 ? Math.max(...existingPairs) + 1 : 1;
    
    const mainServer = {
      id: `${nextPairNumber}A`,
      name: `Media ${nextPairNumber}A`,
      pairNumber: nextPairNumber,
      isBackup: false,
      platform,
      outputs: outputs.map((o, i) => ({ ...o, id: `${nextPairNumber}A-OUT${i + 1}`, name: `MEDIA ${nextPairNumber}A.${i + 1}` })),
      note
    };
    
    const backupServer = {
      id: `${nextPairNumber}B`,
      name: `Media ${nextPairNumber}B`,
      pairNumber: nextPairNumber,
      isBackup: true,
      platform,
      outputs: outputs.map((o, i) => ({ ...o, id: `${nextPairNumber}B-OUT${i + 1}`, name: `MEDIA ${nextPairNumber}B.${i + 1}` })),
      note
    };
    
    get().updateActiveProject({
      mediaServers: [...activeProject.mediaServers, mainServer, backupServer]
    });
    get().recordChange('create', 'mediaServer', mainServer.id, mainServer);
    get().recordChange('create', 'mediaServer', backupServer.id, backupServer);
    console.log('Media server pair added:', nextPairNumber);
  },
  
  updateMediaServer: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      mediaServers: activeProject.mediaServers.map(s => s.id === id ? { ...s, ...updates } : s)
    });
    get().recordChange('update', 'mediaServer', id, updates);
  },
  
  deleteMediaServer: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      mediaServers: activeProject.mediaServers.filter(s => s.id !== id)
    });
    get().recordChange('delete', 'mediaServer', id, {});
  },
  
  // ===== MEDIA SERVER LAYER CRUD =====
  addMediaServerLayer: (layer) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newLayer = { ...layer, id: layer.id || uuidv4() };
    get().updateActiveProject({
      mediaServerLayers: [...(activeProject.mediaServerLayers || []), newLayer]
    });
    get().recordChange('create', 'mediaServerLayer', newLayer.id, newLayer);
    console.log('Media server layer added:', newLayer.id);
  },
  
  updateMediaServerLayer: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      mediaServerLayers: (activeProject.mediaServerLayers || []).map(l => l.id === id ? { ...l, ...updates } : l)
    });
    get().recordChange('update', 'mediaServerLayer', id, updates);
  },
  
  deleteMediaServerLayer: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      mediaServerLayers: (activeProject.mediaServerLayers || []).filter(l => l.id !== id)
    });
    get().recordChange('delete', 'mediaServerLayer', id, {});
  },
  
  // ===== IP ADDRESS CRUD =====
  addIPAddress: (ip) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newIP = { ...ip, id: ip.id || uuidv4() };
    get().updateActiveProject({
      ipAddresses: [...activeProject.ipAddresses, newIP]
    });
    get().recordChange('create', 'ipAddress', newIP.id, newIP);
  },
  
  updateIPAddress: (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      ipAddresses: activeProject.ipAddresses.map(ip => ip.id === id ? { ...ip, ...updates } : ip)
    });
    get().recordChange('update', 'ipAddress', id, updates);
  },
  
  deleteIPAddress: (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    get().updateActiveProject({
      ipAddresses: activeProject.ipAddresses.filter(ip => ip.id !== id)
    });
    get().recordChange('delete', 'ipAddress', id, {});
  },
}));

// Auto-save interval (every 30 seconds)
setInterval(() => {
  const store = useProjectStore.getState();
  if (store.activeProject && !store.isSaving) {
    store.saveProject();
  }
}, 30000);
