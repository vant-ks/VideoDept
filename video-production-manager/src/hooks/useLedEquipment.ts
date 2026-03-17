/**
 * useLedEquipment.ts — Integration Seam for LED Wall Planner
 * ============================================================
 * Bridges the LED Planner to VideoDept's equipment library.
 * Priority: LED_TILE / LED_PROCESSOR items from the equipment library.
 * Fallback: BUILTIN_PANELS / BUILTIN_PROCESSORS when library is empty.
 *
 * Ported from imports/_unpack/led_visualizer/useLedEquipment.ts
 */

import { useMemo } from 'react';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';

// ── Spec interfaces ─────────────────────────────────────────────────────────

export interface LedPanelSpec {
  id: string;
  manufacturer: string;
  model: string;
  pixelPitchMm: number;
  panelWidthMm: number;
  panelHeightMm: number;
  pixelsH: number;
  pixelsV: number;
  weightKg: number;
  powerMaxW: number;
  powerAvgW: number;
  maxChainPanels: number;
  refreshHz?: number;
  brightnessNits?: number;
  scanType?: string;
}

export interface LedProcessorSpec {
  id: string;
  manufacturer: string;
  model: string;
  maxPixels: number;
  ethernetOutputs: number;
  maxPixelsPerPort: number;
  maxWidth: number;
  maxHeight: number;
  hasGenlock?: boolean;
  supportsHdr?: boolean;
}

// ── Built-in fallbacks (from LedWallPlanner.jsx PANELS dict) ─────────────────

const BUILTIN_PANELS: LedPanelSpec[] = [
  { id: 'roe-bp2v2', manufacturer: 'ROE', model: 'Black Pearl BP2V2', pixelPitchMm: 2.84, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 176, pixelsV: 176, weightKg: 7.5, powerMaxW: 210, powerAvgW: 70, maxChainPanels: 16 },
  { id: 'roe-bm3', manufacturer: 'ROE', model: 'Black Marble BM3', pixelPitchMm: 3.47, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 144, pixelsV: 144, weightKg: 8.0, powerMaxW: 180, powerAvgW: 60, maxChainPanels: 20 },
  { id: 'roe-cb5', manufacturer: 'ROE', model: 'Carbon CB5', pixelPitchMm: 5.77, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 96, pixelsV: 96, weightKg: 6.8, powerMaxW: 150, powerAvgW: 50, maxChainPanels: 24 },
  { id: 'roe-dm26', manufacturer: 'ROE', model: 'Diamond DM2.6', pixelPitchMm: 2.6, panelWidthMm: 600, panelHeightMm: 337.5, pixelsH: 230, pixelsV: 130, weightKg: 7.8, powerMaxW: 240, powerAvgW: 80, maxChainPanels: 12 },
  { id: 'absen-pl25', manufacturer: 'Absen', model: 'PL2.5 Pro', pixelPitchMm: 2.5, panelWidthMm: 600, panelHeightMm: 337.5, pixelsH: 240, pixelsV: 135, weightKg: 8.2, powerMaxW: 220, powerAvgW: 75, maxChainPanels: 14 },
  { id: 'absen-a27', manufacturer: 'Absen', model: 'A27 Plus', pixelPitchMm: 2.7, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 184, pixelsV: 184, weightKg: 7.0, powerMaxW: 195, powerAvgW: 65, maxChainPanels: 16 },
  { id: 'uni-upad26', manufacturer: 'Unilumin', model: 'UPAD III 2.6', pixelPitchMm: 2.6, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 192, pixelsV: 192, weightKg: 7.0, powerMaxW: 200, powerAvgW: 67, maxChainPanels: 14 },
  { id: 'uni-upad39', manufacturer: 'Unilumin', model: 'UPAD III 3.9', pixelPitchMm: 3.9, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 128, pixelsV: 128, weightKg: 6.8, powerMaxW: 170, powerAvgW: 57, maxChainPanels: 20 },
  { id: 'gen-26-500', manufacturer: 'Generic', model: '2.6mm 500×500', pixelPitchMm: 2.6, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 192, pixelsV: 192, weightKg: 7.0, powerMaxW: 200, powerAvgW: 67, maxChainPanels: 16 },
  { id: 'gen-39-500', manufacturer: 'Generic', model: '3.9mm 500×500', pixelPitchMm: 3.9, panelWidthMm: 500, panelHeightMm: 500, pixelsH: 128, pixelsV: 128, weightKg: 6.5, powerMaxW: 170, powerAvgW: 57, maxChainPanels: 20 },
];

const BUILTIN_PROCESSORS: LedProcessorSpec[] = [
  { id: 'novastar-mx40-pro', manufacturer: 'Novastar', model: 'MX40 Pro', maxPixels: 2600000, ethernetOutputs: 4, maxPixelsPerPort: 650000, maxWidth: 8192, maxHeight: 8192 },
  { id: 'novastar-cx40-pro', manufacturer: 'Novastar', model: 'CX40 Pro', maxPixels: 2600000, ethernetOutputs: 4, maxPixelsPerPort: 650000, maxWidth: 8192, maxHeight: 8192 },
  { id: 'novastar-mctrl4k', manufacturer: 'Novastar', model: 'MCTRL4K', maxPixels: 4150000, ethernetOutputs: 16, maxPixelsPerPort: 260000, maxWidth: 4096, maxHeight: 2160 },
  { id: 'brompton-sx40', manufacturer: 'Brompton', model: 'Tessera SX40', maxPixels: 2400000, ethernetOutputs: 4, maxPixelsPerPort: 600000, maxWidth: 8192, maxHeight: 8192 },
];

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLedEquipment() {
  const { equipmentSpecs } = useEquipmentLibrary();

  const libraryPanels = useMemo((): LedPanelSpec[] => {
    const tiles = equipmentSpecs.filter(s => s.category === 'led-tile');
    if (tiles.length === 0) return [];
    return tiles.map(eq => {
      const s = (eq.specs ?? {}) as Record<string, any>;
      return {
        id: eq.uuid ?? eq.id,
        manufacturer: eq.manufacturer,
        model: eq.model,
        pixelPitchMm: Number(s.pixelPitch ?? 0),
        panelWidthMm: Number(s.panelWidthMm ?? 500),
        panelHeightMm: Number(s.panelHeightMm ?? 500),
        pixelsH: Number(s.pixelsH ?? 0),
        pixelsV: Number(s.pixelsV ?? 0),
        weightKg: Number(s.weightKg ?? 0),
        powerMaxW: Number(s.powerMaxW ?? 0),
        powerAvgW: Number(s.powerAvgW ?? 0),
        maxChainPanels: Number(s.maxChainLength ?? 16),
        refreshHz: s.refreshRateHz !== undefined ? Number(s.refreshRateHz) : undefined,
        brightnessNits: s.brightnessNits !== undefined ? Number(s.brightnessNits) : undefined,
        scanType: s.scanType,
      };
    });
  }, [equipmentSpecs]);

  const libraryProcessors = useMemo((): LedProcessorSpec[] => {
    const procs = equipmentSpecs.filter(s => s.category === 'led-processor');
    if (procs.length === 0) return [];
    return procs.map(eq => {
      const s = (eq.specs ?? {}) as Record<string, any>;
      return {
        id: eq.uuid ?? eq.id,
        manufacturer: eq.manufacturer,
        model: eq.model,
        maxPixels: Number(s.maxPixels ?? 0),
        ethernetOutputs: Number(s.ethernetOutputs ?? 4),
        maxPixelsPerPort: Number(s.maxPixelsPerPort ?? 650000),
        maxWidth: Number(s.maxWidth ?? 8192),
        maxHeight: Number(s.maxHeight ?? 8192),
        hasGenlock: s.hasGenlock,
        supportsHdr: s.supportsHdr,
      };
    });
  }, [equipmentSpecs]);

  // Priority: library items first, then built-in fallback
  const panels = libraryPanels.length > 0 ? libraryPanels : BUILTIN_PANELS;
  const processors = libraryProcessors.length > 0 ? libraryProcessors : BUILTIN_PROCESSORS;

  const getPanelById = (id: string) => panels.find(p => p.id === id) ?? null;
  const getProcessorById = (id: string) => processors.find(p => p.id === id) ?? null;

  return { panels, processors, getPanelById, getProcessorById, BUILTIN_PANELS };
}

export default useLedEquipment;
