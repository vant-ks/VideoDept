import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Deck catalogue ────────────────────────────────────────────────────────────
// Standard portable staging sizes (width × depth in ft, "portrait" orientation)
export type DeckType = '1x4' | '2x4' | '2x8' | '4x4' | '4x8';

export const DECK_SIZES: Record<DeckType, { wFt: number; dFt: number }> = {
  '1x4': { wFt: 1, dFt: 4 },
  '2x4': { wFt: 2, dFt: 4 },
  '2x8': { wFt: 2, dFt: 8 },
  '4x4': { wFt: 4, dFt: 4 },
  '4x8': { wFt: 4, dFt: 8 },
};

export const LEG_HEIGHTS_IN = [8, 12, 16, 18, 24, 32, 36, 40, 48] as const;

export interface StageDeck {
  id: string;
  type: DeckType;
  /** Position of the left-downstage corner in feet. xFt > 0 = stage right of DSC. */
  xFt: number;
  /** Position of front (downstage) edge in feet from DSC. yFt > 0 = upstage. */
  yFt: number;
  /** 0 = natural orientation, 90 = rotated (swap w and d) */
  rotation: 0 | 90;
  legHeightIn: number;
}

// ── Venue data per production ─────────────────────────────────────────────────
export interface VenueData {
  roomWidthM: number;
  roomDepthM: number;
  roomHeightM: number;
  /** Where DSC sits as a fraction of room depth from the stage-wall end. e.g. 0.7 = DSC is 70% from back wall. */
  dscDepthFraction: number;
  stageDecks: StageDeck[];
}

const DEFAULT_VENUE: VenueData = {
  roomWidthM: 0,
  roomDepthM: 0,
  roomHeightM: 0,
  dscDepthFraction: 0.65,
  stageDecks: [],
};

// ── Store ─────────────────────────────────────────────────────────────────────
interface VenueStore {
  venues: Record<string, VenueData>;
  getVenue: (productionId: string) => VenueData;
  setRoom: (productionId: string, dims: Partial<Pick<VenueData, 'roomWidthM' | 'roomDepthM' | 'roomHeightM' | 'dscDepthFraction'>>) => void;
  addDeck: (productionId: string, deck: StageDeck) => void;
  updateDeck: (productionId: string, id: string, patch: Partial<StageDeck>) => void;
  removeDeck: (productionId: string, id: string) => void;
}

export const useVenueStore = create<VenueStore>()(
  persist(
    (set, get) => ({
      venues: {},

      getVenue: (productionId) =>
        get().venues[productionId] ?? DEFAULT_VENUE,

      setRoom: (productionId, dims) =>
        set(state => ({
          venues: {
            ...state.venues,
            [productionId]: { ...(state.venues[productionId] ?? DEFAULT_VENUE), ...dims },
          },
        })),

      addDeck: (productionId, deck) =>
        set(state => {
          const v = state.venues[productionId] ?? DEFAULT_VENUE;
          return {
            venues: {
              ...state.venues,
              [productionId]: { ...v, stageDecks: [...v.stageDecks, deck] },
            },
          };
        }),

      updateDeck: (productionId, id, patch) =>
        set(state => {
          const v = state.venues[productionId] ?? DEFAULT_VENUE;
          return {
            venues: {
              ...state.venues,
              [productionId]: {
                ...v,
                stageDecks: v.stageDecks.map(d => d.id === id ? { ...d, ...patch } : d),
              },
            },
          };
        }),

      removeDeck: (productionId, id) =>
        set(state => {
          const v = state.venues[productionId] ?? DEFAULT_VENUE;
          return {
            venues: {
              ...state.venues,
              [productionId]: { ...v, stageDecks: v.stageDecks.filter(d => d.id !== id) },
            },
          };
        }),
    }),
    { name: 'vd-venue-store' }
  )
);
