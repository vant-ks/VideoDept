import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Production, 
  Source, 
  Send, 
  LEDScreen, 
  IPAddress, 
  ChecklistItem,
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
  sampleVideoSwitcher,
  sampleServerAllocation
} from '@/data/sampleData';
import { defaultEquipmentSpecs } from '@/data/equipmentData';
import { SourceService, SendService, LogService } from '@/services';

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
  ipAddresses: IPAddress[];
  checklist: ChecklistItem[];
  videoSwitchers: VideoSwitcher[];
  serverAllocations: ServerAllocation[];
  connectorTypes: string[];
  sourceTypes: string[];
  frameRates: string[];
  resolutions: string[];
  equipmentSpecs: EquipmentSpec[];
  
  // UI State
  activeTab: string;
  searchQuery: string;
  theme: 'light' | 'dark';
  accentColor: string;
  
  // Actions
  setProduction: (production: Production) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  
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
  addEquipmentSpec: (spec: EquipmentSpec) => void;
  updateEquipmentSpec: (id: string, updates: Partial<EquipmentSpec>) => void;
  removeEquipmentSpec: (id: string) => void;
  
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
  
  // Checklist Actions
  toggleChecklistItem: (id: string) => void;
  updateChecklistItem: (id: string, item: Partial<ChecklistItem>) => void;
  
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
      ipAddresses: sampleIPAddresses,
      checklist: sampleChecklist,
      videoSwitchers: [sampleVideoSwitcher],
      serverAllocations: [sampleServerAllocation],
      connectorTypes: [
        'HDMI',
        'SDI',
        'DP',
        'FIBER',
        'NDI',
        'USB-C',
      ],
      sourceTypes: [
        'Laptop',
        'Camera',
        'Server',
        'Playback',
        'Graphics',
        'PTZ',
        'Robo',
        'Media Server',
        'Other'
      ],
      frameRates: [
        '60',
        '59.94',
        '50',
        '30',
        '29.97',
        '25',
        '24',
        '23.98'
      ],
      resolutions: [
        '1080i',
        '1080p',
        '720p',
        '4K',
        '8K',
        'SD'
      ],
      equipmentSpecs: defaultEquipmentSpecs,
      
      // UI State
      activeTab: 'dashboard',
      searchQuery: '',
      theme: 'dark',
      accentColor: '#0969da',
      
      // Actions
      setProduction: (production) => set({ production }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (color) => set({ accentColor: color }),
      
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
      
      // Equipment Spec Actions
      addEquipmentSpec: (spec) => {
        LogService.logEquipmentChange('add', spec.id, `${spec.category} - ${spec.name}`, `Added equipment: ${spec.name}`);
        set((state) => ({
          equipmentSpecs: [...state.equipmentSpecs, spec]
        }));
      },
      updateEquipmentSpec: (id, updates) => {
        const state = useProductionStore.getState();
        const spec = state.equipmentSpecs.find(s => s.id === id);
        if (spec) {
          const changes = Object.entries(updates).map(([field, newValue]) => ({
            field,
            oldValue: (spec as any)[field],
            newValue
          }));
          LogService.logEquipmentChange('update', id, `${spec.category} - ${spec.name}`, `Updated equipment: ${spec.name}`, changes);
        }
        set((state) => ({
          equipmentSpecs: state.equipmentSpecs.map(spec => 
            spec.id === id ? { ...spec, ...updates } : spec
          )
        }));
      },
      removeEquipmentSpec: (id) => {
        const state = useProductionStore.getState();
        const spec = state.equipmentSpecs.find(s => s.id === id);
        if (spec) {
          LogService.logEquipmentChange('delete', id, `${spec.category} - ${spec.name}`, `Removed equipment: ${spec.name}`);
        }
        set((state) => ({
          equipmentSpecs: state.equipmentSpecs.filter(spec => spec.id !== id)
        }));
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
      
      // Checklist Actions
      toggleChecklistItem: (id) => set((state) => ({
        checklist: state.checklist.map(item =>
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      })),
      updateChecklistItem: (id, updates) => set((state) => ({
        checklist: state.checklist.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
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
          
          // Update sourceTypes
          if (state.sourceTypes) {
            state.sourceTypes = state.sourceTypes.map(type => typeMapping[type] || type);
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

export const useChecklistProgress = () =>
  useProductionStore((state) => {
    const total = state.checklist.length;
    const completed = state.checklist.filter(item => item.completed).length;
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
  });
