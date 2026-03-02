/**
 * Equipment Library Store
 * Central equipment database (synced from cloud in production)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EquipmentSpec, IOPort, EquipmentCard } from '@/types';
import { apiClient } from '@/services';

/**
 * Transform raw API/DB equipment row into frontend EquipmentSpec shape.
 * API returns snake_case + raw Prisma enums; frontend expects camelCase + lowercase strings.
 */
function transformApiEquipment(raw: any): EquipmentSpec {
  // Split flat equipment_io_ports array into inputs / outputs
  const ports: any[] = raw.equipment_io_ports ?? [];
  const sortByIndex = (a: any, b: any) => (a.port_index ?? 0) - (b.port_index ?? 0);
  const mapPort = (p: any): IOPort => ({
    id: p.id,
    type: p.io_type ?? p.type ?? '',
    label: p.label ?? undefined,
    format: p.format ?? undefined,
  });

  const inputs: IOPort[] = ports
    .filter(p => (p.port_type ?? p.portType ?? '').toUpperCase() === 'INPUT')
    .sort(sortByIndex)
    .map(mapPort);

  const outputs: IOPort[] = ports
    .filter(p => (p.port_type ?? p.portType ?? '').toUpperCase() === 'OUTPUT')
    .sort(sortByIndex)
    .map(mapPort);

  // Convert card-based I/O
  const cards: EquipmentCard[] = (raw.equipment_cards ?? []).map((card: any) => {
    const cardPorts: any[] = card.equipment_card_io ?? [];
    return {
      id: card.id,
      slotNumber: card.slot_number ?? card.slotNumber ?? 0,
      inputs: cardPorts
        .filter(p => (p.port_type ?? '').toUpperCase() === 'INPUT')
        .sort(sortByIndex)
        .map(mapPort),
      outputs: cardPorts
        .filter(p => (p.port_type ?? '').toUpperCase() === 'OUTPUT')
        .sort(sortByIndex)
        .map(mapPort),
    };
  }).sort((a: EquipmentCard, b: EquipmentCard) => a.slotNumber - b.slotNumber);

  const ioArch = (raw.io_architecture ?? raw.ioArchitecture ?? 'direct').toLowerCase();

  return {
    uuid: raw.uuid,
    id: raw.id,
    category: (raw.category ?? '').toLowerCase() as EquipmentSpec['category'],
    manufacturer: raw.manufacturer ?? '',
    model: raw.model ?? '',
    ioArchitecture: ioArch === 'card_based' || ioArch === 'card-based' ? 'card-based' : 'direct',
    inputs,
    outputs,
    cards,
    cardSlots: raw.card_slots ?? raw.cardSlots ?? undefined,
    deviceFormats: raw.device_formats ?? raw.deviceFormats ?? undefined,
    formatByIO: raw.format_by_io ?? raw.formatByIO ?? undefined,
    isSecondaryDevice: raw.is_secondary_device ?? raw.isSecondaryDevice ?? undefined,
    specs: raw.specs ?? undefined,
  };
}

interface EquipmentLibraryState {
  // Library Version
  version: string;
  lastUpdated: number;
  
  // Equipment Data
  equipmentSpecs: EquipmentSpec[];
  connectorTypes: string[];
  sourceTypes: string[];
  frameRates: string[];
  resolutions: string[];
  
  // Custom Equipment (user-added)
  customEquipment: EquipmentSpec[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFromAPI: () => Promise<void>;
  setEquipmentSpecs: (specs: EquipmentSpec[]) => void;
  addCustomEquipment: (spec: EquipmentSpec) => void;
  removeCustomEquipment: (id: string) => void;
  updateLibrary: (data: Partial<EquipmentLibraryState>) => void;
  setConnectorTypes: (types: string[]) => void;
  setSourceTypes: (types: string[]) => void;
  setFrameRates: (rates: string[]) => void;
  setResolutions: (resolutions: string[]) => void;
  // Equipment management
  updateEquipmentSpec: (id: string, spec: Partial<EquipmentSpec>) => void;
  addEquipmentSpec: (spec: EquipmentSpec) => void;
  // Connector type management
  addConnectorType: (type: string) => void;
  removeConnectorType: (type: string) => void;
  reorderConnectorTypes: (types: string[]) => void;
  // Source type management
  addSourceType: (type: string) => void;
  removeSourceType: (type: string) => void;
  reorderSourceTypes: (types: string[]) => void;
  // Frame rate management
  addFrameRate: (rate: string) => void;
  removeFrameRate: (rate: string) => void;
  reorderFrameRates: (rates: string[]) => void;
  // Resolution management
  addResolution: (resolution: string) => void;
  removeResolution: (resolution: string) => void;
  reorderResolutions: (resolutions: string[]) => void;
}

// Default equipment data
const defaultEquipmentData = {
  version: '1.0.0',
  lastUpdated: Date.now(),
  equipmentSpecs: [],
  connectorTypes: [
    'HDMI 1.4',
    'HDMI 2.0',
    'HDMI 2.1',
    '3G-SDI',
    '6G-SDI',
    '12G-SDI',
    'DisplayPort 1.2',
    'DisplayPort 1.4',
    'DisplayPort 2.0',
    'DVI-D',
    'DVI-I',
    'VGA',
    'USB-C (DP Alt Mode)',
    'USB-C (Thunderbolt 3)',
    'USB-C (Thunderbolt 4)',
    'Fiber (SMPTE)',
    'NDI',
    'Reference (BNC)',
    'Network (RJ45)',
    'Network (SFP)',
    'Network (SFP+)'
  ],
  sourceTypes: [
    'Laptop',
    'Camera',
    'Media Server',
    'Playback Device',
    'Graphics System',
    'PTZ Camera',
    'Robotic Camera',
    'Other'
  ],
  frameRates: [
    '23.98',
    '24',
    '25',
    '29.97',
    '30',
    '50',
    '59.94',
    '60',
    '120'
  ],
  resolutions: [
    '720p',
    '1080i',
    '1080p',
    '1200p',
    '1440p',
    '2K',
    '4K UHD',
    '4K DCI',
    '8K'
  ],
  customEquipment: []
};

export const useEquipmentLibrary = create<EquipmentLibraryState>()(
  persist(
    (set, get) => ({
      ...defaultEquipmentData,
      isLoading: false,
      error: null,

      // Fetch data from API
      fetchFromAPI: async () => {
        set({ isLoading: true, error: null });
        try {
          // Fetch equipment specs and transform from DB shape → EquipmentSpec shape
          const rawEquipment = await apiClient.getEquipment() as any[];
          const equipment: EquipmentSpec[] = Array.isArray(rawEquipment)
            ? rawEquipment.map(transformApiEquipment)
            : [];
          
          // Fetch settings separately
          const [connectorTypes, sourceTypes, frameRates, resolutions] = await Promise.all([
            apiClient.get<string[]>('/settings/connector-types').catch(() => get().connectorTypes),
            apiClient.get<string[]>('/settings/source-types').catch(() => get().sourceTypes),
            apiClient.get<string[]>('/settings/frame-rates').catch(() => get().frameRates),
            apiClient.get<string[]>('/settings/resolutions').catch(() => get().resolutions),
          ]);
          
          set({ 
            equipmentSpecs: equipment,
            connectorTypes: Array.isArray(connectorTypes) ? connectorTypes : get().connectorTypes,
            sourceTypes: Array.isArray(sourceTypes) ? sourceTypes : get().sourceTypes,
            frameRates: Array.isArray(frameRates) ? frameRates : get().frameRates,
            resolutions: Array.isArray(resolutions) ? resolutions : get().resolutions,
            lastUpdated: Date.now(),
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Failed to fetch equipment from API:', error);
          set({ 
            error: error.message || 'Failed to load equipment data',
            isLoading: false 
          });
        }
      },

      // Actions
      setEquipmentSpecs: (equipmentSpecs) => 
        set({ equipmentSpecs, lastUpdated: Date.now() }),
      
      addCustomEquipment: (spec) =>
        set((state) => ({
          customEquipment: [...state.customEquipment, spec],
          lastUpdated: Date.now()
        })),
      
      removeCustomEquipment: (id) =>
        set((state) => ({
          customEquipment: state.customEquipment.filter((e) => e.id !== id),
          lastUpdated: Date.now()
        })),
      
      updateLibrary: (data) =>
        set((state) => ({
          ...state,
          ...data,
          lastUpdated: Date.now()
        })),
      
      setConnectorTypes: (connectorTypes) =>
        set({ connectorTypes, lastUpdated: Date.now() }),
      
      setSourceTypes: (sourceTypes) =>
        set({ sourceTypes, lastUpdated: Date.now() }),
      
      setFrameRates: (frameRates) =>
        set({ frameRates, lastUpdated: Date.now() }),
      
      setResolutions: (resolutions) =>
        set({ resolutions, lastUpdated: Date.now() }),
      
      // Equipment management
      updateEquipmentSpec: (id, updates) =>
        set((state) => ({
          equipmentSpecs: state.equipmentSpecs.map((spec) =>
            spec.id === id ? { ...spec, ...updates } : spec
          ),
          lastUpdated: Date.now()
        })),
      
      addEquipmentSpec: (spec) =>
        set((state) => ({
          equipmentSpecs: [...state.equipmentSpecs, spec],
          lastUpdated: Date.now()
        })),
      
      // Connector type management
      addConnectorType: (type) =>
        set((state) => ({
          connectorTypes: [...state.connectorTypes, type],
          lastUpdated: Date.now()
        })),
      
      removeConnectorType: (type) =>
        set((state) => ({
          connectorTypes: state.connectorTypes.filter((t) => t !== type),
          lastUpdated: Date.now()
        })),
      
      reorderConnectorTypes: (types) =>
        set({ connectorTypes: types, lastUpdated: Date.now() }),
      
      // Source type management
      addSourceType: (type) =>
        set((state) => ({
          sourceTypes: [...state.sourceTypes, type],
          lastUpdated: Date.now()
        })),
      
      removeSourceType: (type) =>
        set((state) => ({
          sourceTypes: state.sourceTypes.filter((t) => t !== type),
          lastUpdated: Date.now()
        })),
      
      reorderSourceTypes: (types) =>
        set({ sourceTypes: types, lastUpdated: Date.now() }),
      
      // Frame rate management
      addFrameRate: (rate) =>
        set((state) => ({
          frameRates: [...state.frameRates, rate],
          lastUpdated: Date.now()
        })),
      
      removeFrameRate: (rate) =>
        set((state) => ({
          frameRates: state.frameRates.filter((r) => r !== rate),
          lastUpdated: Date.now()
        })),
      
      reorderFrameRates: (rates) =>
        set({ frameRates: rates, lastUpdated: Date.now() }),
      
      // Resolution management
      addResolution: (resolution) =>
        set((state) => ({
          resolutions: [...state.resolutions, resolution],
          lastUpdated: Date.now()
        })),
      
      removeResolution: (resolution) =>
        set((state) => ({
          resolutions: state.resolutions.filter((r) => r !== resolution),
          lastUpdated: Date.now()
        })),
      
      reorderResolutions: (resolutions) =>
        set({ resolutions, lastUpdated: Date.now() }),
    }),
    {
      name: 'equipment-library-v2',
    }
  )
);
