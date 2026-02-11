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
import { apiClient } from '@/services';
import { getCurrentUserId } from '@/utils/userUtils';
import { logger, LogContext } from '@/utils/logger';
import { useWebSocket, useProductionRoom } from './useWebSocket';

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
  syncWithAPI: () => Promise<void>;
  
  // Change Tracking
  recordChange: (action: 'create' | 'update' | 'delete', entityType: string, entityId: string, changes: any) => void;
  flushChanges: () => Promise<void>;
  
  // Helper to update activeProject and auto-save
  updateActiveProject: (updates: Partial<VideoDepProject>) => void;
  updateProject: (project: VideoDepProject) => Promise<void>;
  
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
      // First check local cache for quick access
      const cachedProject = await projectDB.getProject(id);
      
      if (cachedProject) {
        // Load from cache immediately for fast UX (but mark as loading to prevent saves)
        set({ 
          activeProjectId: id, 
          activeProject: cachedProject,
          lastSyncTime: Date.now(),
          isLoading: true // Keep loading true until we get field_versions from API
        });
        
        // CRITICAL: Fetch fresh data from API to get field_versions AND entity data
        try {
          const production = await apiClient.getProduction(cachedProject.production.id);
          if (!production) {
            // Production no longer exists on server
            console.warn('⚠️ Production no longer exists on server, clearing stale cache');
            await projectDB.deleteProject(id);
            set({ isLoading: false, activeProject: null, activeProjectId: null });
            throw new Error('PRODUCTION_DELETED');
          }
          if (production) {
            console.log('📥 Fetching all entity data for cached production:', cachedProject.production.id);
            
            // Fetch all entity data from database in parallel
            const [
              checklistItems,
              sources,
              sends,
              cameras,
              ccus
            ] = await Promise.all([
              apiClient.getChecklistItems(cachedProject.production.id).catch(err => { console.warn('Failed to load checklist items:', err); return []; }),
              apiClient.getSources(cachedProject.production.id).catch(err => { console.warn('Failed to load sources:', err); return []; }),
              apiClient.getSends(cachedProject.production.id).catch(err => { console.warn('Failed to load sends:', err); return []; }),
              apiClient.get(`/cameras/production/${cachedProject.production.id}`).catch(err => { console.warn('Failed to load cameras:', err); return []; }),
              apiClient.get(`/ccus/production/${cachedProject.production.id}`).catch(err => { console.warn('Failed to load CCUs:', err); return []; })
            ]);
            
            console.log('📦 Loaded entity data:', {
              checklistItems: checklistItems.length,
              sources: sources.length,
              sends: sends.length,
              cameras: cameras.length,
              ccus: ccus.length
            });
            
            // Update cached project with fresh data including field_versions AND entities
            const freshProject = {
              ...cachedProject,
              version: production.version,
              production: {
                ...cachedProject.production,
                id: production.id,
                client: production.client,
                showName: production.showName || production.name,
                venue: production.venue,
                room: production.room,
                loadIn: production.loadIn,
                loadOut: production.loadOut,
                showInfoUrl: production.showInfoUrl,
                status: production.status,
                fieldVersions: production.fieldVersions // CRITICAL: Load field versions from server
              },
              sources: sources || [],
              sends: sends || [],
              checklist: (checklistItems || []).map((item: any) => ({
                id: item.id,
                category: item.category || 'NOTES',
                item: item.title, // Display text
                title: item.title, // Database field
                completed: item.completed || false,
                completedAt: item.completedAt, // API already sends camelCase
                moreInfo: item.moreInfo,
                completionNote: item.completionNote,
                daysBeforeShow: item.daysBeforeShow, // CRITICAL: API sends camelCase
                dueDate: item.dueDate,
                completionDate: item.completionDate,
                assignedTo: item.assignedTo,
                reference: item.reference
              })),
              cameras: cameras || [],
              ccus: ccus || []
            };
            
            await projectDB.updateProject(id, freshProject);
            set({ 
              activeProject: freshProject as any,
              isLoading: false // Now we're ready
            });
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
            const isLocal = apiUrl.includes('localhost');
            console.log(`✅ Loaded latest version from ${isLocal ? 'local' : 'Railway'} database`);
            console.log('📦 Field versions loaded:', production.field_versions);
          } else {
            // No production found on server, use cached version
            set({ isLoading: false });
            console.warn('⚠️ Using cached version, production not found on server');
          }
        } catch (refreshError: any) {
          // If production was deleted (404), clear the stale cache
          if (refreshError?.response?.status === 404 || refreshError?.message?.includes('404')) {
            console.warn('⚠️ Production no longer exists on server, clearing stale cache');
            await projectDB.deleteProject(id);
            set({ isLoading: false, activeProject: null, activeProjectId: null });
            throw new Error('PRODUCTION_DELETED');
          }
          console.warn('⚠️ Using cached version, could not refresh from database:', refreshError);
          set({ isLoading: false });
        }
      } else {
        // No cached version - fetch from API and create local cache
        console.log('📥 Production not cached locally, fetching from API...');
        try {
          const production = await apiClient.getProduction(id);
          if (!production) {
            throw new Error('Production not found on server');
          }
          
          console.log('📥 Fetching all entity data for production:', production.id);
          
          // Fetch all entity data from database in parallel
          const [
            checklistItems,
            sources,
            sends,
            cameras,
            ccus
          ] = await Promise.all([
            apiClient.getChecklistItems(production.id).catch(err => { console.warn('Failed to load checklist items:', err); return []; }),
            apiClient.getSources(production.id).catch(err => { console.warn('Failed to load sources:', err); return []; }),
            apiClient.getSends(production.id).catch(err => { console.warn('Failed to load sends:', err); return []; }),
            apiClient.get(`/cameras/production/${production.id}`).catch(err => { console.warn('Failed to load cameras:', err); return []; }),
            apiClient.get(`/ccus/production/${production.id}`).catch(err => { console.warn('Failed to load CCUs:', err); return []; })
          ]);
          
          console.log('📦 Loaded entity data:', {
            checklistItems: checklistItems.length,
            sources: sources.length,
            sends: sends.length,
            cameras: cameras.length,
            ccus: ccus.length
          });
          
          // Create a minimal project structure from API data
          const newProject: VideoDepProject = {
            id,
            version: production.version,
            created: Date.now(),
            modified: Date.now(),
            production: {
              id: production.id,
              client: production.client,
              showName: production.showName || production.name,
              venue: production.venue || '',
              room: production.room || '',
              loadIn: production.loadIn || new Date().toISOString().split('T')[0],
              loadOut: production.loadOut || new Date().toISOString().split('T')[0],
              showInfoUrl: production.showInfoUrl,
              status: production.status,
              fieldVersions: production.fieldVersions // Load field versions
            },
            sources: sources || [],
            sends: sends || [],
            checklist: (checklistItems || []).map((item: any) => ({
              id: item.id,
              category: item.category || 'NOTES',
              item: item.title, // Display text
              title: item.title, // Database field
              completed: item.completed || false,
              completedAt: item.completedAt, // API already sends camelCase
              moreInfo: item.moreInfo,
              completionNote: item.completionNote,
              daysBeforeShow: item.daysBeforeShow, // CRITICAL: API sends camelCase
              dueDate: item.dueDate,
              completionDate: item.completionDate,
              assignedTo: item.assignedTo,
              reference: item.reference
            })),
            cameras: cameras || [],
            ccus: ccus || [],
            ledScreens: [],
            projectionScreens: [],
            computers: [],
            mediaServers: [],
            mediaServerLayers: [],
            videoSwitchers: [],
            routers: [],
            serverAllocations: [],
            ipAddresses: [],
            cableSnakes: [],
            presets: [],
            usedEquipmentIds: []
          };
          
          // Save to local cache
          await projectDB.createProject(newProject as any);
          
          set({ 
            activeProjectId: id,
            activeProject: newProject as any,
            isLoading: false,
            lastSyncTime: Date.now()
          });
          
          console.log('✅ Production fetched from API and cached locally');
          console.log('📦 Field versions loaded:', production.field_versions);
        } catch (apiError: any) {
          console.error('❌ Failed to fetch production from API:', apiError);
          if (apiError?.response?.status === 404) {
            throw new Error('PRODUCTION_DELETED');
          }
          throw new Error('Production not found. Please ensure it exists on the server.');
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Create New Project
  createProject: async (projectData) => {
    const id = uuidv4();
    const startTime = Date.now();
    
    const project: VideoDepProject = {
      ...projectData,
      version: 1,
      created: Date.now(),
      modified: Date.now(),
    };
    
    logger.info(LogContext.UI, 'Creating new production', {
      name: project.production?.showName || project.production?.name,
      client: project.production?.client
    });
    
    // Add ID to production if not present
    if (!project.production.id) {
      project.production.id = uuidv4();
    }

    try {
      // PRIMARY: Save to API database first
      // Send camelCase - API will transform to snake_case
      const productionData = {
        id: project.production.id,
        name: project.production.showName || project.production.name,
        client: project.production.client,
        venue: project.production.venue,
        room: project.production.room,
        loadIn: project.production.loadIn,
        loadOut: project.production.loadOut,
        status: project.production.status || 'PLANNING',
      };
      
      logger.debug(LogContext.API, 'Sending production to API', {
        productionId: productionData.id,
        name: productionData.name,
        client: productionData.client
      });
      
      await apiClient.createProduction(productionData);
      
      // Save checklist items to database
      if (project.checklist && project.checklist.length > 0) {
        logger.debug(LogContext.API, 'Saving checklist items to database', {
          productionId: productionData.id,
          count: project.checklist.length
        });
        
        for (const item of project.checklist) {
          try {
            // CRITICAL: Build object from scratch - don't spread item (may have snake_case props)
            await apiClient.createChecklistItem(productionData.id, {
              id: item.id,
              productionId: productionData.id,
              title: item.title || item.item,
              category: item.category,
              completed: item.completed || false,
              moreInfo: item.moreInfo,
              completionNote: item.completionNote,
              assignedTo: item.assignedTo,
              dueDate: item.dueDate,
              completionDate: item.completionDate,
              completedAt: item.completedAt,
              reference: item.reference,
              daysBeforeShow: item.daysBeforeShow
            });
          } catch (error) {
            logger.error(LogContext.API, 'Failed to save checklist item', error as Error, {
              productionId: productionData.id,
              itemId: item.id
            });
          }
        }
      }
      
      const duration = Date.now() - startTime;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
      const isLocal = apiUrl.includes('localhost');
      
      logger.info(LogContext.API, `Production saved to ${isLocal ? 'local' : 'Railway'} database`, {
        productionId: productionData.id,
        duration
      });
      
      // SECONDARY: Cache locally for offline access
      try {
        const fullProject = { ...project, id, modified: Date.now(), created: Date.now() };
        await projectDB.createProject(fullProject as any);
        logger.debug(LogContext.STORAGE, 'Production cached locally', { productionId: productionData.id });
      } catch (cacheError) {
        logger.error(LogContext.STORAGE, 'Failed to cache locally (non-critical)', cacheError as Error);
      }
      
      set({ 
        activeProjectId: id, 
        activeProject: { ...project, id } as any 
      });
      
      logger.info(LogContext.UI, 'Production created successfully', {
        productionId: productionData.id,
        totalDuration: Date.now() - startTime
      });
      
      return id;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(LogContext.API, 'Failed to save production to database', error as Error, { duration });
      throw new Error('Failed to save to database. Please check your internet connection and try again.');
    }
  },

  // Save Active Project
  saveProject: async () => {
    const { activeProjectId, activeProject } = get();
    if (!activeProjectId || !activeProject) return;

    // Wait if still loading (prevents saving with stale field_versions)
    if (get().isLoading) {
      console.warn('⏳ Still loading production data, waiting before save...');
      // Wait up to 3 seconds for load to complete
      let waitCount = 0;
      while (get().isLoading && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (get().isLoading) {
        console.error('❌ Timed out waiting for production to load');
        return;
      }
    }

    set({ isSaving: true });
    try {
      const updatedProject = {
        ...activeProject,
        modified: Date.now()
      };
      
      // Warn if field_versions are missing (should be loaded by now)
      if (!activeProject.production.fieldVersions || Object.keys(activeProject.production.fieldVersions).length === 0) {
        console.warn('⚠️ field_versions not loaded yet - this may cause conflicts');
      }
      
      // PRIMARY: Update in API database first with conflict detection
      // Send camelCase - API will transform to snake_case
      try {
        const response = await apiClient.updateProduction(activeProject.production.id, {
          name: activeProject.production.showName || activeProject.production.name,
          client: activeProject.production.client,
          venue: activeProject.production.venue,
          room: activeProject.production.room,
          loadIn: activeProject.production.loadIn,
          loadOut: activeProject.production.loadOut,
          showInfoUrl: activeProject.production.showInfoUrl,
          status: activeProject.production.status || 'PLANNING',
          version: activeProject.version || 1, // Send current version for record-level fallback
          fieldVersions: activeProject.production.fieldVersions || {} // Send ALL field versions (or empty if not yet set)
        });
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
        const isLocal = apiUrl.includes('localhost');
        console.log(`✅ Production updated in ${isLocal ? 'local' : 'Railway'} database`);
        
        // Update local state with new version and field_versions from server
        set({ 
          activeProject: {
            ...updatedProject,
            version: response.version, // Use server's record version
            production: {
              ...updatedProject.production,
              fieldVersions: response.fieldVersions // Update field versions from server
            }
          },
          isSaving: false,
          lastSyncTime: Date.now()
        });
        
        console.log('✅ Field versions updated:', response.fieldVersions);
        
      } catch (apiError: any) {
        // Handle conflict (409)
        if (apiError.response?.status === 409) {
          const conflictData = apiError.response.data;
          console.warn('⚠️ Conflict detected:', conflictData);
          
          // Check if it's field-level or record-level conflict
          const hasFieldConflicts = conflictData.conflicts && Array.isArray(conflictData.conflicts);
          
          if (hasFieldConflicts) {
            // Field-level conflicts detected
            const conflictFields = conflictData.conflicts.map((c: any) => c.fieldName).join(', ');
            const conflictDetails = conflictData.conflicts.map((c: any) => 
              `  • ${c.fieldName}: Your value "${c.clientValue}" conflicts with "${c.serverValue}"`
            ).join('\n');
            
            console.log('📋 Field-level conflicts:', conflictData.conflicts);
            
            // Present 3 options: Retry (reload fresh), Keep Yours (force), or Keep Theirs (discard)
            const userChoice = prompt(
              `⚠️ FIELD CONFLICTS DETECTED\n\n` +
              `Someone else modified these fields while you were editing:\n\n` +
              `${conflictDetails}\n\n` +
              `Conflicting fields: ${conflictFields}\n` +
              `Non-conflicting changes were saved successfully.\n\n` +
              `Choose an option:\n` +
              `  1 = Retry (reload fresh data and try again)\n` +
              `  2 = Keep Yours (force save, OVERWRITE their changes)\n` +
              `  3 = Keep Theirs (discard your changes to these fields)\n\n` +
              `Enter 1, 2, or 3:`,
              '1'
            );
            
            if (userChoice === '1') {
              // User chose to retry - reload fresh data
              await get().loadProject(activeProjectId);
              set({ isSaving: false });
              alert('✅ Reloaded latest version. Please review and save again.');
              return;
            } else if (userChoice === '2') {
              // User chose to keep theirs - force save with record-level update
              try {
                const forceResponse = await apiClient.updateProduction(activeProject.production.id, {
                  name: activeProject.production.showName || activeProject.production.name,
                  client: activeProject.production.client,
                  venue: activeProject.production.venue,
                  room: activeProject.production.room,
                  loadIn: activeProject.production.loadIn,
                  loadOut: activeProject.production.loadOut,
                  showInfoUrl: activeProject.production.showInfoUrl,
                  status: activeProject.production.status || 'PLANNING',
                  version: conflictData.currentVersion, // Use server's version
                  lastModifiedBy: getCurrentUserId()
                  // Don't send fieldVersions - forces record-level update
                });
                
                // Update local state with new version and field_versions
                const freshUpdatedProject = {
                  ...activeProject,
                  version: forceResponse.version,
                  production: {
                    ...activeProject.production,
                    fieldVersions: forceResponse.fieldVersions
                  },
                  modified: Date.now()
                };
                
                set({ 
                  activeProject: freshUpdatedProject,
                  isSaving: false,
                  lastSyncTime: Date.now()
                });
                
                // Also update IndexedDB
                await projectDB.projects.put(freshUpdatedProject);
                
                console.log('✅ Force saved (overwrote conflicting fields)');
                alert('✅ Your changes were saved (overwrote conflicting fields)');
                return;
              } catch (forceError) {
                console.error('❌ Failed to force save:', forceError);
                set({ isSaving: false });
                alert('❌ Failed to force save. Please try again.');
                return;
              }
            } else {
              // User chose option 3 or cancelled - reload their values
              await get().loadProject(activeProjectId);
              set({ isSaving: false });
              alert('✅ Reloaded latest version (your changes to conflicting fields were discarded)');
              return;
            }
          }
          
          // Record-level conflict (legacy fallback)
          const lastModified = conflictData.serverData?.updatedAt 
            ? new Date(conflictData.serverData.updatedAt).toLocaleString()
            : 'Unknown';
          
          const userChoice = prompt(
            `⚠️ CONFLICT DETECTED\n\n` +
            `Someone else modified this show while you were editing.\n\n` +
            `Server version: ${conflictData.currentVersion}\n` +
            `Your version: ${activeProject.version || 1}\n` +
            `Last modified: ${lastModified}\n\n` +
            `Choose an option:\n` +
            `  1 = Retry (reload fresh data and try again)\n` +
            `  2 = Keep Yours (force save, OVERWRITE their changes)\n` +
            `  3 = Keep Theirs (discard all your changes)\n\n` +
            `Enter 1, 2, or 3:`,
            '1'
          );
          
          if (userChoice === '1') {
            // User chose to retry - reload fresh data
            await get().loadProject(activeProjectId);
            set({ isSaving: false });
            alert('✅ Reloaded latest version. Please review and save again.');
            return;
          } else if (userChoice === '2') {
            // User chose to keep theirs - force save with server's version
            try {
              const forceResponse = await apiClient.updateProduction(activeProject.production.id, {
                name: activeProject.production.showName || activeProject.production.name,
                client: activeProject.production.client,
                status: activeProject.production.status || 'PLANNING',
                metadata: activeProject, // Store full project for sync
                version: conflictData.currentVersion, // Use server's version
                lastModifiedBy: getCurrentUserId()
              });
              
              const freshUpdatedProject = {
                ...activeProject,
                version: forceResponse.version,
                modified: Date.now()
              };
              
              set({ 
                activeProject: freshUpdatedProject,
                isSaving: false,
                lastSyncTime: Date.now()
              });
              
              // Also update IndexedDB
              await projectDB.projects.put(freshUpdatedProject);
              
              console.log('✅ Force saved (overwrote other changes)');
              alert('✅ Your changes were saved (overwrote their changes)');
              return;
            } catch (forceError) {
              console.error('❌ Failed to force save:', forceError);
              set({ isSaving: false });
              alert('❌ Failed to force save. Please try again.');
              return;
            }
          } else {
            // User chose option 3 or cancelled - reload their values
            await get().loadProject(activeProjectId);
            set({ isSaving: false });
            alert('✅ Reloaded latest version (all your changes were discarded)');
            return;
          }
          return;
        }
        
        // Other API errors
        throw apiError;
      }
      
      // SECONDARY: Update local cache
      try {
        await projectDB.updateProject(activeProjectId, updatedProject);
        console.log('✅ Local cache updated');
      } catch (cacheError) {
        console.warn('⚠️ Failed to update local cache (non-critical):', cacheError);
      }
      
    } catch (error) {
      console.error('❌ Failed to update production in database:', error);
      set({ isSaving: false });
      throw new Error('Failed to save to database. Please check your internet connection and try again.');
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
      
      // Production-level save removed - entities use event sourcing APIs
      // Only save production metadata when explicitly needed (venue, dates, etc.)
      // await get().saveProject();
    } catch (error) {
      console.error('Failed to flush changes:', error);
    }
  },

  // Delete Project
  deleteProject: async (id: string) => {
    try {
      // Get project to find production ID
      const project = await projectDB.getProject(id);
      
      if (!project?.production?.id) {
        throw new Error('Invalid project data');
      }
      
      // PRIMARY: Delete from Railway database first
      await apiClient.deleteProduction(project.production.id);
      console.log('✅ Production deleted from Railway database');
      
      // SECONDARY: Delete from local cache
      try {
        await projectDB.deleteProject(id);
        console.log('✅ Production removed from local cache');
      } catch (cacheError) {
        console.warn('⚠️ Failed to delete from local cache (non-critical):', cacheError);
      }
      
      if (get().activeProjectId === id) {
        get().closeProject();
      }
    } catch (error) {
      console.error('❌ Failed to delete production from database:', error);
      throw new Error('Failed to delete from database. Please check your internet connection and try again.');
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

  // Sync with API - pull down remote productions (API database is source of truth)
  syncWithAPI: async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
    const isLocal = apiUrl.includes('localhost');
    
    try {
      console.log(`🔄 Syncing with ${isLocal ? 'local' : 'Railway'} database...`);
      const remoteProductions = await apiClient.getProductions();
      const localProjects = await projectDB.getAllProjects();
      
      // Download new productions from API
      for (const production of remoteProductions) {
        const exists = localProjects.some(p => p.production.id === production.id);
        
        if (!exists) {
          // New production - fetch full data and cache
          try {
            // Fetch checklist items for this production
            const checklistItems = await apiClient.getChecklistItems(production.id);
            
            // Reconstruct full project structure
            const fullProject: VideoDepProject = {
              id: `proj-${production.id}`,
              version: '1.0.0',
              created: new Date(production.created_at).getTime(),
              modified: new Date(production.updatedAt).getTime(),
              production: {
                id: production.id,
                showName: production.showName,
                client: production.client,
                venue: production.venue || 'TBD',
                room: production.room || '',
                loadIn: production.loadIn ? new Date(production.loadIn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                loadOut: production.loadOut ? new Date(production.loadOut).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                status: production.status
              },
              checklist: checklistItems.map(item => ({
                id: item.id,
                title: item.title,
                completed: item.completed
              })),
              sources: [],
              sends: [],
              ledScreens: [],
              projectionScreens: [],
              computers: [],
              ccus: [],
              cameras: [],
              mediaServers: [],
              mediaServerLayers: [],
              videoSwitchers: [],
              routers: [],
              serverAllocations: [],
              ipAddresses: [],
              cableSnakes: [],
              presets: [],
              usedEquipmentIds: []
            };
            
            await projectDB.createProject(fullProject as any);
            console.log(`✅ Downloaded production: ${production.showName}`);
          } catch (error) {
            console.error(`Failed to download production ${production.showName}:`, error);
          }
        } else {
          // Existing production - check if update needed
          const localProject = localProjects.find(p => p.production.id === production.id);
          if (localProject && new Date(production.updatedAt).getTime() > localProject.modified) {
            // Update production info
            localProject.production.showName = production.showName;
            localProject.production.client = production.client;
            localProject.production.venue = production.venue || 'TBD';
            localProject.production.room = production.room || '';
            localProject.production.status = production.status;
            localProject.modified = new Date(production.updatedAt).getTime();
            
            await projectDB.updateProject(localProject.id!, localProject);
            console.log(`✅ Updated production: ${production.showName}`);
          }
        }
      }
      
      // Remove productions that were deleted from API
      for (const localProject of localProjects) {
        const existsRemotely = remoteProductions.some(p => p.id === localProject.production.id);
        if (!existsRemotely) {
          await projectDB.deleteProject(localProject.id!);
          console.log(`🗑️ Removed deleted production: ${localProject.production.showName || localProject.production.name}`);
          
          // Clear lastOpenedProjectId if it matches the deleted production
          const { lastOpenedProjectId, setLastOpenedProjectId } = await import('./usePreferencesStore').then(m => m.usePreferencesStore.getState());
          if (lastOpenedProjectId === localProject.id) {
            console.log('🧹 Clearing lastOpenedProjectId for deleted production');
            setLastOpenedProjectId(null);
          }
        }
      }
      
      console.log(`✅ Sync complete - ${isLocal ? 'Local' : 'Railway'} database is source of truth`);
    } catch (error) {
      console.error(`❌ Failed to sync with ${isLocal ? 'local' : 'Railway'} database:`, error);
      throw new Error('Failed to sync with database. Please check your internet connection.');
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
    
    // Debounced save disabled - entities use event sourcing, production metadata saves are explicit
    // setTimeout(() => {
    //   get().saveProject();
    // }, 500);
  },
  
  // Helper: Update entire project and save
  updateProject: async (project) => {
    set({ activeProject: project });
    await get().saveProject();
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
  addChecklistItem: async (item) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    // CRITICAL: Build clean object, don't spread (may have snake_case)
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      category: item.category,
      item: item.item || item.title || '',
      title: item.title || item.item || '',
      completed: false,
      moreInfo: item.moreInfo,
      completionNote: item.completionNote,
      assignedTo: item.assignedTo,
      dueDate: item.dueDate,
      completionDate: item.completionDate,
      completedAt: item.completedAt,
      reference: item.reference,
      daysBeforeShow: item.daysBeforeShow
    };
    
    // Optimistic update
    get().updateActiveProject({
      checklist: [...activeProject.checklist, newItem]
    });
    
    // Save to API - CRITICAL: Build clean object, don't spread (may have snake_case)
    try {
      await apiClient.createChecklistItem(activeProject.production.id, {
        id: newItem.id,
        productionId: activeProject.production.id,
        title: newItem.title || newItem.item,
        category: newItem.category,
        completed: newItem.completed,
        moreInfo: newItem.moreInfo,
        completionNote: newItem.completionNote,
        assignedTo: newItem.assignedTo,
        dueDate: newItem.dueDate,
        completionDate: newItem.completionDate,
        completedAt: newItem.completedAt,
        reference: newItem.reference,
        daysBeforeShow: newItem.daysBeforeShow
      });
      console.log('✅ Checklist item saved to database:', newItem.id);
    } catch (error) {
      console.error('Failed to save checklist item:', error);
      // Revert optimistic update on error
      get().updateActiveProject({
        checklist: activeProject.checklist
      });
    }
    
    get().recordChange('create', 'checklist', newItem.id, newItem);
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
  
  deleteChecklistItem: async (id) => {
    const { activeProject, activeProjectId } = get();
    if (!activeProject) return;
    
    // Optimistic update - remove from state immediately
    get().updateActiveProject({
      checklist: activeProject.checklist.filter(item => item.id !== id)
    });
    
    try {
      // Delete from database via API
      await apiClient.deleteChecklistItem(id);
      
      // Update IndexedDB cache
      if (activeProjectId) {
        const updatedProject = {
          ...activeProject,
          checklist: activeProject.checklist.filter(item => item.id !== id)
        };
        await projectDB.updateProject(activeProjectId, updatedProject);
      }
      
      get().recordChange('delete', 'checklist', id, {});
      console.log('✅ Checklist item deleted:', id);
    } catch (error) {
      console.error('❌ Failed to delete checklist item:', error);
      // Revert optimistic update on error
      const item = activeProject.checklist.find(i => i.id === id);
      if (item) {
        get().updateActiveProject({
          checklist: [...activeProject.checklist, item]
        });
      }
      throw error;
    }
  },
  
  toggleChecklistItem: async (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const item = activeProject.checklist.find(i => i.id === id);
    if (!item) return;
    
    const newCompleted = !item.completed;
    
    // Optimistic update - server will set completedAt timestamp
    get().updateActiveProject({
      checklist: activeProject.checklist.map(i =>
        i.id === id ? { ...i, completed: newCompleted, completedAt: newCompleted ? Date.now() : null } : i
      )
    });
    
    // Save to API - send ONLY completed boolean, server sets timestamp
    try {
      console.log('🔧 Toggle checklist item:', id, 'completed:', newCompleted);
      await apiClient.updateChecklistItem(id, { completed: newCompleted });
      console.log('✅ Checklist item toggled in database:', id);
    } catch (error) {
      console.error('❌ Failed to toggle checklist item:', error);
      // Revert optimistic update on error
      get().updateActiveProject({
        checklist: activeProject.checklist
      });
    }
    
    get().recordChange('update', 'checklist', id, { completed: newCompleted });
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
  addCamera: async (camera) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newCamera = { ...camera, id: camera.id || uuidv4() };
    
    // Optimistic update
    get().updateActiveProject({
      cameras: [...activeProject.cameras, newCamera]
    });
    
    // Save to API
    try {
      await apiClient.createCamera({
        ...newCamera,
        productionId: activeProject.production.id
      });
      console.log('✅ Camera saved to database:', newCamera.id);
    } catch (error) {
      console.error('Failed to save camera:', error);
      // Revert optimistic update on error
      get().updateActiveProject({
        cameras: activeProject.cameras.filter(c => c.id !== newCamera.id)
      });
      throw error;
    }
  },
  
  updateCamera: async (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const oldCamera = activeProject.cameras.find(c => c.id === id);
    
    // Optimistic update
    get().updateActiveProject({
      cameras: activeProject.cameras.map(c => c.id === id ? { ...c, ...updates } : c)
    });
    
    // Save to API
    try {
      await apiClient.updateCamera(id, {
        ...updates,
        productionId: activeProject.production.id
      });
      console.log('✅ Camera updated in database:', id);
    } catch (error) {
      console.error('Failed to update camera:', error);
      // Revert optimistic update on error
      if (oldCamera) {
        get().updateActiveProject({
          cameras: activeProject.cameras.map(c => c.id === id ? oldCamera : c)
        });
      }
      throw error;
    }
  },
  
  deleteCamera: async (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const oldCamera = activeProject.cameras.find(c => c.id === id);
    
    // Optimistic update
    get().updateActiveProject({
      cameras: activeProject.cameras.filter(c => c.id !== id)
    });
    
    // Delete from API
    try {
      await apiClient.deleteCamera(id);
      console.log('✅ Camera deleted from database:', id);
    } catch (error) {
      console.error('Failed to delete camera:', error);
      // Revert optimistic update on error
      if (oldCamera) {
        get().updateActiveProject({
          cameras: [...activeProject.cameras, oldCamera]
        });
      }
      throw error;
    }
  },
  
  // ===== CCU CRUD =====
  addCCU: async (ccu) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const newCCU = { ...ccu, id: ccu.id || uuidv4() };
    
    // Optimistic update
    get().updateActiveProject({
      ccus: [...activeProject.ccus, newCCU]
    });
    
    // Save to API
    try {
      await apiClient.createCCU({
        ...newCCU,
        productionId: activeProject.production.id
      });
      console.log('✅ CCU saved to database:', newCCU.id);
    } catch (error) {
      console.error('Failed to save CCU:', error);
      // Revert optimistic update on error
      get().updateActiveProject({
        ccus: activeProject.ccus.filter(c => c.id !== newCCU.id)
      });
      throw error;
    }
  },
  
  updateCCU: async (id, updates) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const oldCCU = activeProject.ccus.find(c => c.id === id);
    
    // Optimistic update
    get().updateActiveProject({
      ccus: activeProject.ccus.map(c => c.id === id ? { ...c, ...updates } : c)
    });
    
    // Save to API
    try {
      await apiClient.updateCCU(id, {
        ...updates,
        productionId: activeProject.production.id
      });
      console.log('✅ CCU updated in database:', id);
    } catch (error) {
      console.error('Failed to update CCU:', error);
      // Revert optimistic update on error
      if (oldCCU) {
        get().updateActiveProject({
          ccus: activeProject.ccus.map(c => c.id === id ? oldCCU : c)
        });
      }
      throw error;
    }
  },
  
  deleteCCU: async (id) => {
    const { activeProject } = get();
    if (!activeProject) return;
    
    const oldCCU = activeProject.ccus.find(c => c.id === id);
    
    // Optimistic update
    get().updateActiveProject({
      ccus: activeProject.ccus.filter(c => c.id !== id)
    });
    
    // Delete from API
    try {
      await apiClient.deleteCCU(id);
      console.log('✅ CCU deleted from database:', id);
    } catch (error) {
      console.error('Failed to delete CCU:', error);
      // Revert optimistic update on error
      if (oldCCU) {
        get().updateActiveProject({
          ccus: [...activeProject.ccus, oldCCU]
        });
      }
      throw error;
    }
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

// Auto-save disabled - entities are now managed via event sourcing APIs
// Production-level saves only happen when explicitly saving production metadata
// setInterval(() => {
//   const store = useProjectStore.getState();
//   if (store.activeProject && !store.isSaving) {
//     store.saveProject();
//   }
// }, 30000);

// Listen for WebSocket version updates from other clients
if (typeof window !== 'undefined') {
  window.addEventListener('production:version-updated', ((event: CustomEvent) => {
    const { productionId, version } = event.detail;
    const store = useProjectStore.getState();
    
    if (store.activeProject && store.activeProject.production.id === productionId) {
      console.log(`📡 Syncing version from ${store.activeProject.version} to ${version}`);
      // Update version and trigger re-render
      useProjectStore.setState((state) => ({
        activeProject: state.activeProject ? {
          ...state.activeProject,
          version
        } : null
      }));
    }
  }) as EventListener);
}
