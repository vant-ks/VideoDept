import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProjectStore } from './useProjectStore';
import type { 
  Production, 
  Source,
  SourceType,
  Send, 
  LEDScreen,
  ProjectionScreen, 
  IPAddress, 
  ChecklistItem,
  TimestampedEntry,
  VideoSwitcher,
  ServerAllocation,
  CCU,
  Camera,
  MediaServer,
  MediaServerLayer,
  EquipmentSpec
} from '@/types';
import { 
  sampleProduction, 
  sampleSources, 
  sampleSends, 
  sampleLEDScreen,
  sampleIPAddresses,
  sampleChecklist,
  defaultChecklistItems as importedDefaultChecklistItems,
  sampleVideoSwitcher,
  sampleServerAllocation
} from '@/data/sampleData';
import { defaultEquipmentSpecs } from '@/data/equipmentData';
import { SourceService, SendService, LogService } from '@/services';
import { apiClient } from '@/services/apiClient';

interface ProductionStore {
  // Data
  production: Production | null;
  sources: Source[];
  sends: Send[];
  ccus: CCU[];
  cameras: Camera[];
  mediaServers: MediaServer[];
  mediaServerLayers: MediaServerLayer[];
  ledScreens: LEDScreen[];
  projectionScreens: ProjectionScreen[];
  ipAddresses: IPAddress[];
  checklist: ChecklistItem[];
  defaultChecklistItems: Omit<ChecklistItem, 'id' | 'completed'>[];
  videoSwitchers: VideoSwitcher[];
  serverAllocations: ServerAllocation[];
  connectorTypes: string[];
  sourceTypes: string[];
  frameRates: string[];
  resolutions: string[];
  equipmentSpecs: EquipmentSpec[];
  
  // API State
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // UI State
  activeTab: string;
  searchQuery: string;
  theme: 'light' | 'dark';
  accentColor: string;
  collapsedCategories: string[];
  
  // API Actions
  checkServerConnection: () => Promise<boolean>;
  syncWithServer: () => Promise<void>;
  setError: (error: string | null) => void;
  
  // Actions
  setProduction: (production: Production) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  toggleCategoryCollapsed: (category: string) => void;
  setCollapsedCategories: (categories: string[]) => void;
  
  // Connector Type Actions
  addConnectorType: (type: string) => void;
  removeConnectorType: (type: string) => void;
  reorderConnectorTypes: (types: string[]) => void;
  
  // Source Type Actions
  addSourceType: (type: string) => void;
  removeSourceType: (type: string) => void;
  reorderSourceTypes: (types: string[]) => void;
  
  // Frame Rate Actions
  addFrameRate: (rate: string) => void;
  removeFrameRate: (rate: string) => void;
  reorderFrameRates: (rates: string[]) => void;
  
  // Resolution Actions
  addResolution: (resolution: string) => void;
  removeResolution: (resolution: string) => void;
  reorderResolutions: (resolutions: string[]) => void;
  
  // Equipment Spec Actions
  addEquipmentSpec: (spec: EquipmentSpec) => void | Promise<void>;
  updateEquipmentSpec: (id: string, updates: Partial<EquipmentSpec>) => void | Promise<void>;
  removeEquipmentSpec: (id: string) => void | Promise<void>;
  
  // Media Server Actions
  addMediaServerPair: (platform: string, outputs: any[], note?: string) => void;
  updateMediaServer: (id: string, server: Partial<MediaServer>) => void;
  deleteMediaServerPair: (pairNumber: number) => void;
  
  // Media Server Layer Actions
  addMediaServerLayer: (layer: MediaServerLayer) => void;
  updateMediaServerLayer: (id: string, layer: Partial<MediaServerLayer>) => void;
  deleteMediaServerLayer: (id: string) => void;
  
  // Source Actions
  addSource: (source: Source) => void;
  updateSource: (id: string, source: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  duplicateSource: (id: string) => void;
  bulkDeleteSources: (ids: string[]) => void;
  
  // Send Actions
  addSend: (send: Send) => void;
  updateSend: (id: string, send: Partial<Send>) => void;
  deleteSend: (id: string) => void;
  duplicateSend: (id: string) => void;
  bulkDeleteSends: (ids: string[]) => void;
  
  // CCU Actions
  addCCU: (ccu: CCU) => void;
  updateCCU: (id: string, ccu: Partial<CCU>) => void;
  deleteCCU: (id: string) => void;
  
  // Camera Actions
  addCamera: (camera: Camera) => void;
  updateCamera: (id: string, camera: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  
  // ProjectionScreen Actions
  addProjectionScreen: (screen: ProjectionScreen) => void;
  updateProjectionScreen: (id: string, screen: Partial<ProjectionScreen>) => void;
  deleteProjectionScreen: (id: string) => void;
  duplicateProjectionScreen: (id: string) => void;
  
  // Checklist Actions
  toggleChecklistItem: (id: string) => void;
  updateChecklistItem: (id: string, item: Partial<ChecklistItem>) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'completed'>) => void;
  deleteChecklistItem: (id: string) => void;
  addDefaultChecklistItem: (item: Omit<ChecklistItem, 'id' | 'completed'>) => void;
  updateDefaultChecklistItem: (index: number, item: Omit<ChecklistItem, 'id' | 'completed'>) => void;
  deleteDefaultChecklistItem: (index: number) => void;
  
  // IP Address Actions
  addIPAddress: (ip: IPAddress) => void;
  updateIPAddress: (ip: string, data: Partial<IPAddress>) => void;
  deleteIPAddress: (ip: string) => void;
  
  // Reset
  resetToSampleData: () => void;
}

export const useProductionStore = create<ProductionStore>()(
  persist(
    (set) => ({
      // Initial Data
      production: sampleProduction,
      sources: sampleSources,
      sends: sampleSends,
      ccus: [],
      cameras: [],
      mediaServers: [],
      mediaServerLayers: [],
      ledScreens: [sampleLEDScreen],
      projectionScreens: [],
      ipAddresses: sampleIPAddresses,
      checklist: sampleChecklist,
      defaultChecklistItems: importedDefaultChecklistItems,
      videoSwitchers: [sampleVideoSwitcher],
      serverAllocations: [sampleServerAllocation],
      connectorTypes: [
        'HDMI',
        'SDI',
        'DP',
        'FIBER',
        'NDI',
        'USB-C'
      ],
      sourceTypes: [
        'LAPTOP',
        'CAM',
        'SERVER',
        'PLAYBACK',
        'GRAPHICS',
        'PTZ',
        'ROBO',
        'OTHER'
      ],
      frameRates: [
        '59.94',
        '60',
        '50',
        '29.97',
        '30',
        '25',
        '24',
        '23.98'
      ],
      resolutions: [
        '1920 x 1080',
        '1920 x 1200',
        '3840 x 2160',
        '4096 x 2160',
        '1280 x 720'
      ],
      equipmentSpecs: defaultEquipmentSpecs,
      
      // API State
      isLoading: false,
      error: null,
      isConnected: false,
      
      // UI State
      activeTab: 'dashboard',
      searchQuery: '',
      theme: 'dark',
      accentColor: '#0969da',
      collapsedCategories: Array.from(new Set(sampleChecklist.map(item => item.category))),
      
      // Actions
      setProduction: (production) => set({ production }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTheme: (theme) => {
        LogService.logDebug('theme', `Theme changed to: ${theme}`);
        set({ theme });
      },
      setAccentColor: (color) => {
        LogService.logDebug('theme', `Accent color changed to: ${color}`);
        set({ accentColor: color });
      },
      toggleCategoryCollapsed: (category) => {
        set(state => {
          const isCollapsed = state.collapsedCategories.includes(category);
          return {
            collapsedCategories: isCollapsed
              ? state.collapsedCategories.filter(c => c !== category)
              : [...state.collapsedCategories, category]
          };
        });
      },
      setCollapsedCategories: (categories) => {
        set({ collapsedCategories: categories });
      },
      
      // Connector Type Actions
      addConnectorType: (type) => {
        LogService.logSettingsChange('add', 'connectorType', `Added connector type: ${type}`, type);
        set(state => ({
          connectorTypes: [...state.connectorTypes, type]
        }));
      },
      removeConnectorType: (type) => {
        LogService.logSettingsChange('delete', 'connectorType', `Removed connector type: ${type}`, type);
        set(state => ({
          connectorTypes: state.connectorTypes.filter(t => t !== type)
        }));
      },
      reorderConnectorTypes: (types) => {
        LogService.logSettingsChange('reorder', 'connectorType', 'Reordered connector types');
        set({ connectorTypes: types });
      },
      
      // Source Type Actions
      addSourceType: (type) => {
        LogService.logSettingsChange('add', 'sourceType', `Added source type: ${type}`, type);
        set((state) => ({
          sourceTypes: [...state.sourceTypes, type]
        }));
      },
      removeSourceType: (type) => {
        LogService.logSettingsChange('delete', 'sourceType', `Removed source type: ${type}`, type);
        set((state) => ({
          sourceTypes: state.sourceTypes.filter(t => t !== type)
        }));
      },
      reorderSourceTypes: (types) => {
        LogService.logSettingsChange('reorder', 'sourceType', 'Reordered source types');
        set({ sourceTypes: types });
      },
      
      // Frame Rate Actions
      addFrameRate: (rate) => {
        LogService.logSettingsChange('add', 'frameRate', `Added frame rate: ${rate}`, rate);
        set(state => ({
          frameRates: [...state.frameRates, rate]
        }));
      },
      removeFrameRate: (rate) => {
        LogService.logSettingsChange('delete', 'frameRate', `Removed frame rate: ${rate}`, rate);
        set(state => ({
          frameRates: state.frameRates.filter(r => r !== rate)
        }));
      },
      reorderFrameRates: (rates) => {
        LogService.logSettingsChange('reorder', 'frameRate', 'Reordered frame rates');
        set({ frameRates: rates });
      },
      
      // Resolution Actions
      addResolution: (resolution) => {
        LogService.logSettingsChange('add', 'resolution', `Added resolution: ${resolution}`, resolution);
        set(state => ({
          resolutions: [...state.resolutions, resolution]
        }));
      },
      removeResolution: (resolution) => {
        LogService.logSettingsChange('delete', 'resolution', `Removed resolution: ${resolution}`, resolution);
        set(state => ({
          resolutions: state.resolutions.filter(r => r !== resolution)
        }));
      },
      reorderResolutions: (resolutions) => {
        LogService.logSettingsChange('reorder', 'resolution', 'Reordered resolutions');
        set({ resolutions: resolutions });
      },
      
      // API Actions
      checkServerConnection: async () => {
        LogService.logDebug('api', 'Checking server connection...');
        try {
          const connected = await apiClient.checkHealth();
          set({ isConnected: connected, error: null });
          LogService.logDebug('api', `Server connection check: ${connected ? 'connected' : 'disconnected'}`);
          return connected;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          LogService.logDebug('api', `Server connection failed: ${errorMsg}`);
          set({ isConnected: false, error: 'Server connection failed' });
          return false;
        }
      },
      
      syncWithServer: async () => {
        const state = useProductionStore.getState();
        if (!state.isConnected) {
          LogService.logDebug('sync', 'Not connected to server, skipping sync');
          console.log('Not connected to server, skipping sync');
          return;
        }
        
        LogService.logDebug('sync', 'Starting data sync with server...');
        set({ isLoading: true, error: null });
        
        try {
          // Fetch data from API
          const [equipment, settings] = await Promise.all([
            apiClient.getEquipment(),
            apiClient.getSettings()
          ]);
          
          LogService.logDebug('sync', `Sync completed: ${(equipment as any)?.length || 0} equipment items, settings updated`);
          
          // Update store with API data
          set({ 
            equipmentSpecs: (equipment || []) as EquipmentSpec[],
            connectorTypes: (settings as any)?.connectorTypes || state.connectorTypes,
            sourceTypes: (settings as any)?.sourceTypes || state.sourceTypes,
            frameRates: (settings as any)?.frameRates || state.frameRates,
            resolutions: (settings as any)?.resolutions || state.resolutions,
            isLoading: false
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          LogService.logDebug('sync', `Sync failed: ${errorMsg}`);
          console.error('Sync failed:', error);
          set({ 
            isLoading: false, 
            error: 'Failed to sync with server'
          });
        }
      },
      
      setError: (error) => set({ error }),
      
      // Equipment Spec Actions
      addEquipmentSpec: async (spec) => {
        LogService.logEquipmentChange('add', spec.id, `${spec.category}`, `Added equipment: ${spec.category}`);
        LogService.logDebug('equipment', `Adding equipment spec: ${spec.category}`, spec.id);
        
        // Optimistically update UI
        set((state) => ({
          equipmentSpecs: [...state.equipmentSpecs, spec]
        }));
        
        // Sync to server if connected
        const state = useProductionStore.getState();
        if (state.isConnected) {
          try {
            await apiClient.createEquipment(spec);
          } catch (error) {
            console.error('Failed to sync equipment to server:', error);
            set({ error: 'Failed to save to server' });
          }
        }
      },
      updateEquipmentSpec: async (id, updates) => {
        const state = useProductionStore.getState();
        const spec = state.equipmentSpecs.find(s => s.id === id);
        if (spec) {
          const changes = Object.entries(updates).map(([field, newValue]) => ({
            field,
            oldValue: (spec as any)[field],
            newValue
          }));
          LogService.logEquipmentChange('update', id, `${spec.category}`, `Updated equipment: ${spec.category}`, changes);
        }
        
        // Optimistically update UI
        set((state) => ({
          equipmentSpecs: state.equipmentSpecs.map(spec => 
            spec.id === id ? { ...spec, ...updates } : spec
          )
        }));
        
        // Sync to server if connected
        if (state.isConnected && spec) {
          try {
            await apiClient.updateEquipment(id, { ...spec, ...updates });
          } catch (error) {
            console.error('Failed to sync equipment to server:', error);
            set({ error: 'Failed to save to server' });
          }
        }
      },
      removeEquipmentSpec: async (id) => {
        const state = useProductionStore.getState();
        const spec = state.equipmentSpecs.find(s => s.id === id);
        if (spec) {
          LogService.logEquipmentChange('delete', id, `${spec.category}`, `Removed equipment: ${spec.category}`);
        }
        
        // Optimistically update UI
        set((state) => ({
          equipmentSpecs: state.equipmentSpecs.filter(spec => spec.id !== id)
        }));
        
        // Sync to server if connected
        if (state.isConnected) {
          try {
            await apiClient.deleteEquipment(id);
          } catch (error) {
            console.error('Failed to delete equipment from server:', error);
            set({ error: 'Failed to delete from server' });
          }
        }
      },
      
      // Source Actions
      addSource: (source) => set((state) => ({ 
        sources: [...state.sources, source] 
      })),
      updateSource: (id, updates) => set((state) => ({
        sources: state.sources.map(s => 
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      deleteSource: (id) => set((state) => ({
        sources: state.sources.filter(s => s.id !== id)
      })),
      duplicateSource: (id) => set((state) => {
        const source = state.sources.find(s => s.id === id);
        if (!source) return state;
        
        const newId = SourceService.generateId(state.sources);
        const duplicated = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
        };
        
        return {
          sources: [...state.sources, duplicated]
        };
      }),
      bulkDeleteSources: (ids) => set((state) => ({
        sources: state.sources.filter(s => !ids.includes(s.id))
      })),
      
      // Send Actions
      addSend: (send) => set((state) => ({ 
        sends: [...state.sends, send] 
      })),
      updateSend: (id, updates) => set((state) => ({
        sends: state.sends.map(s => 
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      deleteSend: (id) => set((state) => ({
        sends: state.sends.filter(s => s.id !== id)
      })),
      duplicateSend: (id) => set((state) => {
        const send = state.sends.find(s => s.id === id);
        if (!send) return state;
        
        const newId = SendService.generateId(state.sends);
        const duplicated = {
          ...send,
          id: newId,
          name: `${send.name} (Copy)`,
        };
        
        return {
          sends: [...state.sends, duplicated]
        };
      }),
      bulkDeleteSends: (ids) => set((state) => ({
        sends: state.sends.filter(s => !ids.includes(s.id))
      })),
      
      // CCU Actions
      addCCU: (ccu) => set((state) => ({
        ccus: [...state.ccus, ccu]
      })),
      updateCCU: (id, updates) => set((state) => ({
        ccus: state.ccus.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCCU: (id) => set((state) => ({
        ccus: state.ccus.filter(c => c.id !== id)
      })),
      
      // Camera Actions
      addCamera: (camera) => set((state) => ({
        cameras: [...state.cameras, camera]
      })),
      updateCamera: (id, updates) => set((state) => ({
        cameras: state.cameras.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCamera: (id) => set((state) => ({
        cameras: state.cameras.filter(c => c.id !== id)
      })),
      
      // Media Server Actions
      addMediaServerPair: (platform, outputs, note) => set((state) => {
        // Find the next pair number
        const existingPairs = state.mediaServers.map(s => s.pairNumber);
        const nextPairNumber = existingPairs.length > 0 ? Math.max(...existingPairs) + 1 : 1;
        
        const mainServer: MediaServer = {
          id: `${nextPairNumber}A`,
          name: `Media ${nextPairNumber}A`,
          pairNumber: nextPairNumber,
          isBackup: false,
          platform,
          outputs: outputs.map((o, i) => ({ ...o, id: `${nextPairNumber}A-OUT${i + 1}`, name: `MEDIA ${nextPairNumber}A.${i + 1}` })),
          note
        };
        
        const backupServer: MediaServer = {
          id: `${nextPairNumber}B`,
          name: `Media ${nextPairNumber}B`,
          pairNumber: nextPairNumber,
          isBackup: true,
          platform,
          outputs: outputs.map((o, i) => ({ ...o, id: `${nextPairNumber}B-OUT${i + 1}`, name: `MEDIA ${nextPairNumber}B.${i + 1}` })),
          note
        };
        
        return {
          mediaServers: [...state.mediaServers, mainServer, backupServer]
        };
      }),
      updateMediaServer: (id, updates) => set((state) => ({
        mediaServers: state.mediaServers.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      deleteMediaServerPair: (pairNumber) => set((state) => ({
        mediaServers: state.mediaServers.filter(s => s.pairNumber !== pairNumber)
      })),
      
      // Media Server Layer Actions
      addMediaServerLayer: (layer) => set((state) => ({
        mediaServerLayers: [...state.mediaServerLayers, layer]
      })),
      updateMediaServerLayer: (id, updates) => set((state) => ({
        mediaServerLayers: state.mediaServerLayers.map(l => l.id === id ? { ...l, ...updates } : l)
      })),
      deleteMediaServerLayer: (id) => set((state) => ({
        mediaServerLayers: state.mediaServerLayers.filter(l => l.id !== id)
      })),
      
      // ProjectionScreen Actions
      addProjectionScreen: (screen) => {
        LogService.logEquipmentChange('add', screen.id, screen.name, `Added projection screen: ${screen.name}`);
        set((state) => ({
          projectionScreens: [...state.projectionScreens, screen]
        }));
      },
      updateProjectionScreen: (id, updates) => {
        LogService.logEquipmentChange('update', id, 'ProjectionScreen', `Updated projection screen: ${id}`);
        set((state) => ({
          projectionScreens: state.projectionScreens.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
      },
      deleteProjectionScreen: (id) => {
        LogService.logEquipmentChange('delete', id, 'ProjectionScreen', `Deleted projection screen: ${id}`);
        set((state) => ({
          projectionScreens: state.projectionScreens.filter(s => s.id !== id)
        }));
      },
      duplicateProjectionScreen: (id) => {
        set((state) => {
          const screen = state.projectionScreens.find(s => s.id === id);
          if (!screen) return state;
          
          const newScreen = { 
            ...screen, 
            id: `${Date.now()}`,
            name: `${screen.name} (Copy)`
          };
          LogService.logEquipmentChange('add', newScreen.id, newScreen.name, `Duplicated projection screen: ${screen.name}`);
          return {
            projectionScreens: [...state.projectionScreens, newScreen]
          };
        });
      },
      
      // Checklist Actions
      toggleChecklistItem: (id) => set((state) => ({
        checklist: state.checklist.map(item => {
          if (item.id === id) {
            return {
              ...item,
              completed: !item.completed,
              completedAt: !item.completed ? Date.now() : item.completedAt
            };
          }
          return item;
        })
      })),
      updateChecklistItem: (id, updates) => set((state) => ({
        checklist: state.checklist.map(item => {
          if (item.id === id) {
            const updatedItem = { ...item, ...updates };
            
            // If moreInfo is provided as a string (legacy), convert to timestamped entry
            if (typeof updates.moreInfo === 'string' && (updates.moreInfo as string).trim()) {
              const newEntry: TimestampedEntry = {
                id: `entry-${Date.now()}`,
                text: (updates.moreInfo as string).trim(),
                timestamp: Date.now(),
                type: 'info'
              };
              updatedItem.moreInfo = [...(item.moreInfo || []), newEntry];
            }
            
            // If completionNote is provided as a string (legacy), convert to timestamped entry
            if (typeof updates.completionNote === 'string' && (updates.completionNote as string).trim()) {
              const newEntry: TimestampedEntry = {
                id: `entry-${Date.now()}`,
                text: (updates.completionNote as string).trim(),
                timestamp: Date.now(),
                type: 'completion'
              };
              updatedItem.completionNote = [...(item.completionNote || []), newEntry];
            }
            
            return updatedItem;
          }
          return item;
        })
      })),
      addChecklistItem: (item) => set((state) => {
        const newItem: ChecklistItem = {
          ...item,
          id: `chk-${Date.now()}`,
          completed: false,
          moreInfo: item.moreInfo && (typeof item.moreInfo === 'string' && (item.moreInfo as string).trim())
            ? [{
                id: `entry-${Date.now()}`,
                text: item.moreInfo as string,
                timestamp: Date.now(),
                type: 'info' as const
              }]
            : (Array.isArray(item.moreInfo) ? item.moreInfo : undefined),
          completionNote: undefined
        };
        LogService.logGeneralChange('add', 'checklist', item.item, `Added checklist item: ${item.item}`);
        return {
          checklist: [...state.checklist, newItem]
        };
      }),
      deleteChecklistItem: (id) => set((state) => {
        const item = state.checklist.find(i => i.id === id);
        if (item) {
          LogService.logGeneralChange('delete', 'checklist', item.item, `Deleted checklist item: ${item.item}`);
        }
        return {
          checklist: state.checklist.filter(i => i.id !== id)
        };
      }),
      addDefaultChecklistItem: (item) => set((state) => ({
        defaultChecklistItems: [...state.defaultChecklistItems, item]
      })),
      updateDefaultChecklistItem: (index, item) => set((state) => ({
        defaultChecklistItems: state.defaultChecklistItems.map((defaultItem, i) =>
          i === index ? item : defaultItem
        )
      })),
      deleteDefaultChecklistItem: (index) => set((state) => ({
        defaultChecklistItems: state.defaultChecklistItems.filter((_, i) => i !== index)
      })),
      
      // IP Address Actions
      addIPAddress: (ip) => set((state) => ({
        ipAddresses: [...state.ipAddresses, ip]
      })),
      updateIPAddress: (ip, updates) => set((state) => ({
        ipAddresses: state.ipAddresses.map(addr =>
          addr.ip === ip ? { ...addr, ...updates } : addr
        )
      })),
      deleteIPAddress: (ip) => set((state) => ({
        ipAddresses: state.ipAddresses.filter(addr => addr.ip !== ip)
      })),
      
      // Reset
      resetToSampleData: () => set({
        production: sampleProduction,
        sources: sampleSources,
        sends: sampleSends,
        ledScreens: [sampleLEDScreen],
        ipAddresses: sampleIPAddresses,
        checklist: sampleChecklist,
        videoSwitchers: [sampleVideoSwitcher],
        serverAllocations: [sampleServerAllocation],
      }),
    }),
    {
      name: 'video-production-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migration: Convert uppercase source types to capital case
          const typeMapping: Record<string, string> = {
            'LAPTOP': 'Laptop',
            'CAM': 'Camera',
            'SERVER': 'Server',
            'PLAYBACK': 'Playback',
            'GRAPHICS': 'Graphics',
            'PTZ': 'PTZ',
            'ROBO': 'Robo',
            'MEDIA_SERVER': 'Media Server',
            'OTHER': 'Other'
          };
          
          // Update sourceTypes array
          if (state.sourceTypes) {
            state.sourceTypes = state.sourceTypes.map(type => typeMapping[type] || type);
          }
          
          // Update source types on existing sources
          if (state.sources) {
            state.sources = state.sources.map(source => ({
              ...source,
              type: (typeMapping[source.type] || source.type) as SourceType
            }));
          }

          // Migration: Update to new categorized source types if using old defaults
          const oldDefaults = ['Laptop', 'Camera', 'Server', 'Playback', 'Graphics', 'PTZ', 'Robo', 'Media Server', 'Other'];
          const newDefaults = [
            'Laptop - PC MISC',
            'Laptop - PC GFX',
            'Laptop - PC WIDE',
            'Laptop - MAC MISC',
            'Laptop - MAC GFX',
            'Desktop - PC MISC',
            'Desktop - PC GFX',
            'Desktop - PC SERVER',
            'Desktop - MAC MISC',
            'Desktop - MAC GFX',
            'Desktop - MAC SERVER'
          ];
          
          // Check if user has the old defaults (or subset)
          if (state.sourceTypes) {
            const hasOldDefaults = oldDefaults.some(oldType => state.sourceTypes.includes(oldType));
            if (hasOldDefaults) {
              // Replace with new defaults
              state.sourceTypes = newDefaults;
            }
          }
        }
      },
    }
  )
);

// Selectors
export const useSourcesByType = (type: string) => 
  useProductionStore((state) => 
    state.sources.filter(s => s.type === type)
  );

export const useSendsByType = (type: string) =>
  useProductionStore((state) =>
    state.sends.filter(s => s.type === type)
  );

export const useChecklistByCategory = (category: string) =>
  useProductionStore((state) =>
    state.checklist.filter(item => item.category === category)
  );

export const useIPsByCategory = (category: string) =>
  useProductionStore((state) =>
    state.ipAddresses.filter(ip => ip.category === category)
  );

export const useChecklistProgress = () => {
  // Try new store first (activeProject), fallback to old store
  const activeProject = useProjectStore((state) => state.activeProject);
  const oldChecklist = useProductionStore((state) => state.checklist);
  
  const checklist = activeProject?.checklist || oldChecklist;
  const total = checklist.length;
  const completed = checklist.filter(item => item.completed).length;
  
  return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
};

// Initialize connection on app startup
export const initializeStore = async () => {
  const store = useProductionStore.getState();
  const connected = await store.checkServerConnection();
  if (connected) {
    await store.syncWithServer();
  }
};
