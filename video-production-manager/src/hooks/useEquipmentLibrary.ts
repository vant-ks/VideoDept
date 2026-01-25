/**
 * Equipment Library Store
 * Central equipment database (synced from cloud in production)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EquipmentSpec } from '@/types';

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
  
  // Actions
  setEquipmentSpecs: (specs: EquipmentSpec[]) => void;
  addCustomEquipment: (spec: EquipmentSpec) => void;
  removeCustomEquipment: (id: string) => void;
  updateLibrary: (data: Partial<EquipmentLibraryState>) => void;
  setConnectorTypes: (types: string[]) => void;
  setSourceTypes: (types: string[]) => void;
  setFrameRates: (rates: string[]) => void;
  setResolutions: (resolutions: string[]) => void;
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
    'NDI'
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
    (set) => ({
      ...defaultEquipmentData,

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
    }),
    {
      name: 'equipment-library',
    }
  )
);
