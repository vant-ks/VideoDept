/**
 * Shared types for the multi-view projection layout system.
 *
 * World coordinate convention (all distances in meters):
 *   X  — horizontal: + = Stage Right, − = Stage Left
 *   Y  — depth:      + = Upstage from DSC, − = Downstage/Audience
 *   Z  — height:     + = Up from floor
 *   Origin = floor level at Downstage Center (DSC)
 */

import type React from 'react';
import type { VenueData } from '@/hooks/useVenueStore';
import type {
  ProjectionSurface,
  ProjectorPosition,
  SurfaceMatte,
} from '@/hooks/useProjectionSurfaceAPI';
import type { ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import type { LEDScreen } from '@/hooks/useLEDScreenAPI';

// ── Selected-entity union ─────────────────────────────────────────────────────
export type SelectedEntity =
  | { kind: 'surface';  surfaceUuid: string }
  | { kind: 'position'; surfaceUuid: string; positionId: string }
  | { kind: 'matte';    surfaceUuid: string; matteId: string }
  | { kind: 'ledwall';  uuid: string }
  | null;

// ── Panel IDs ─────────────────────────────────────────────────────────────────
export type ViewId = 'top' | 'side' | 'front' | 'blend';

// ── Inspector anchor point ────────────────────────────────────────────────────
/** Whether X/Y in the inspector reads from the center or the top-left corner */
export type AnchorPoint = 'center' | 'top-left';

// ── Per-view zoom controls (imperative handle, populated by each canvas) ──────
export interface ViewControls {
  /** Zoom in 1.5× toward the selected object, or origin if nothing selected */
  zoomIn: () => void;
  /** Zoom out ÷1.5 toward the selected object, or origin if nothing selected */
  zoomOut: () => void;
  /** Fit all visible objects into the viewport */
  fitToContent: () => void;
}

// ── Alignment operations ──────────────────────────────────────────────────────
export type AlignMode =
  | 'left' | 'centerH' | 'right'
  | 'top'  | 'centerV' | 'bottom'
  | 'distributeH' | 'distributeV';

// ── Shared canvas props ───────────────────────────────────────────────────────
export interface ViewCanvasProps {
  venueData: VenueData;
  surfaces: ProjectionSurface[];
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  ledWalls: LEDScreen[];
  /** Current snap increment in inches (shared across all views) */
  snapInches: number;
  /** Primary selection — drives inspector */
  selected: SelectedEntity;
  /**
   * Click handler. `additive=true` means Shift was held — the parent will
   * add/toggle the entity in the multi-select set instead of replacing it.
   */
  onSelect: (e: SelectedEntity, additive: boolean) => void;
  /** UUIDs of all currently multi-selected objects (surfaces + LED walls) */
  selectionSet: ReadonlySet<string>;
  /**
   * Called when a rubber-band box drag resolves. TopViewCanvas emits this;
   * other canvases may ignore it.
   */
  onBoxSelect?: (uuids: string[]) => void;
  /** Patch any field on a ProjectionSurface */
  onSurfacePatch: (uuid: string, patch: Partial<ProjectionSurface>) => void;
  /** Patch any field on a ProjectorPosition */
  onPositionPatch: (surfaceUuid: string, posId: string, patch: Partial<ProjectorPosition>) => void;
  /** Move an LED wall */
  onLEDWallPatch: (uuid: string, xM: number, yM: number) => void;
  /** Patch a matte's image-space position/size */
  onMattePatch?: (surfaceUuid: string, matteId: string, patch: Partial<SurfaceMatte>) => void;
  /** Ref populated by the canvas with zoom/fit controls for the ViewPane toolbar */
  controlsRef?: React.MutableRefObject<ViewControls | null>;
}
