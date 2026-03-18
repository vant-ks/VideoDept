/**
 * Shared types for the multi-view projection layout system.
 *
 * World coordinate convention (all distances in meters):
 *   X  — horizontal: + = Stage Right, − = Stage Left
 *   Y  — depth:      + = Upstage from DSC, − = Downstage/Audience
 *   Z  — height:     + = Up from floor
 *   Origin = floor level at Downstage Center (DSC)
 */

import type { VenueData } from '@/hooks/useVenueStore';
import type {
  ProjectionSurface,
  ProjectorPosition,
  SurfaceMatte,
} from '@/hooks/useProjectionSurfaceAPI';
import type { ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import type { LEDScreen } from '@/hooks/useLEDScreenAPI';

// ── Selected-entity union ─────────────────────────────────────────────────────
/**
 * Describes whichever venue object is currently selected across all views.
 * null = nothing selected.
 */
export type SelectedEntity =
  | { kind: 'surface';  surfaceUuid: string }
  | { kind: 'position'; surfaceUuid: string; positionId: string }
  | { kind: 'matte';    surfaceUuid: string; matteId: string }
  | { kind: 'ledwall';  uuid: string }
  | null;

// ── Panel IDs ─────────────────────────────────────────────────────────────────
export type ViewId = 'top' | 'side' | 'front' | 'blend';

// ── Shared canvas props ───────────────────────────────────────────────────────
/**
 * Props common to all four SVG view canvases.
 * Changes flow back up through patch callbacks; local UI state (hover,
 * drag) is entirely contained within each canvas.
 */
export interface ViewCanvasProps {
  venueData: VenueData;
  surfaces: ProjectionSurface[];
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  ledWalls: LEDScreen[];
  /** Current snap increment in inches (shared across all views) */
  snapInches: number;
  selected: SelectedEntity;
  onSelect: (e: SelectedEntity) => void;
  /** Patch any field on a ProjectionSurface */
  onSurfacePatch: (uuid: string, patch: Partial<ProjectionSurface>) => void;
  /** Patch any field on a ProjectorPosition (within a surface's assignments) */
  onPositionPatch: (surfaceUuid: string, posId: string, patch: Partial<ProjectorPosition>) => void;
  /** Move an LED wall in the floor plan */
  onLEDWallPatch: (uuid: string, xM: number, yM: number) => void;
  /** Patch a matte's image-space position/size */
  onMattePatch?: (surfaceUuid: string, matteId: string, patch: Partial<SurfaceMatte>) => void;
}
