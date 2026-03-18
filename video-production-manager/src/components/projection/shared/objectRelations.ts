/**
 * objectRelations.ts — 3D geometry utilities for all projection objects.
 *
 * World coordinate convention (meters):
 *   X  — horizontal: + = Stage Right, − = Stage Left
 *   Y  — depth:      + = Upstage,     − = Downstage/Audience
 *   Z  — height:     + = Up from floor
 *   Origin = floor at Downstage Center (DSC)
 *
 * These functions are pure (no side effects) and can be called from any view
 * or the inspector panel to compute derived values without duplicating math.
 */

import type { ProjectionSurface, ProjectorPosition, SurfaceMatte } from '@/hooks/useProjectionSurfaceAPI';

// ── Primitive types ────────────────────────────────────────────────────────────
export interface Point3D { x: number; y: number; z: number; }
export interface Box3D {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}
export interface LensShift {
  /** Positive = projector below screen center (needs upward shift) */
  vertical: number;
  /** Positive = projector to the left (needs rightward shift) */
  horizontal: number;
}
export interface CoverageResult {
  /** Physical image width produced by this projector at throw distance */
  projCoverageM: number;
  screenWidthM: number;
  /** projCoverage / screenWidth */
  coverageFraction: number;
  isSufficient: boolean;
}
export interface ProjectorRelative {
  /** Horizontal offset from screen center, + = SR */
  horizM: number;
  /** Vertical offset from screen center, + = above */
  vertM: number;
  /** Throw distance on Y axis */
  throwM: number;
  /** True 3D straight-line lens → screen center */
  actualDistM: number;
}
export interface PositionDerivedStats {
  actualThrow3D: number;
  horizThrow: number;
  lensShift: LensShift;
  coverage?: CoverageResult;
  relative: ProjectorRelative;
  lensPt: Point3D;
  screenCenter: Point3D;
}

// ── Screen geometry ────────────────────────────────────────────────────────────
/** Z of screen bottom edge (floor to bottom of image) */
export function screenBottomZ(surf: ProjectionSurface): number {
  return surf.distFloorM ?? 0;
}

/** Z of screen top edge */
export function screenTopZ(surf: ProjectionSurface): number {
  return (surf.distFloorM ?? 0) + (surf.heightM ?? 2.25);
}

/** Z of screen center */
export function screenCenterZ(surf: ProjectionSurface): number {
  return screenBottomZ(surf) + (surf.heightM ?? 2.25) / 2;
}

/** 3D world position of screen image-area center */
export function screenCenter3D(surf: ProjectionSurface): Point3D {
  return {
    x: surf.posDsXM ?? 0,
    y: surf.posDsYM ?? 0,
    z: screenCenterZ(surf),
  };
}

/**
 * 4 corners of a screen face in 3D world space.
 * Order: [bottom-left, bottom-right, top-right, top-left]
 */
export function screenCorners3D(surf: ProjectionSurface): [Point3D, Point3D, Point3D, Point3D] {
  const x = surf.posDsXM ?? 0;
  const y = surf.posDsYM ?? 0;
  const hw = (surf.widthM ?? 4) / 2;
  const z0 = screenBottomZ(surf);
  const z1 = screenTopZ(surf);
  return [
    { x: x - hw, y, z: z0 },
    { x: x + hw, y, z: z0 },
    { x: x + hw, y, z: z1 },
    { x: x - hw, y, z: z1 },
  ];
}

/** Axis-aligned 3D bounding box of a surface */
export function surfaceBBox(surf: ProjectionSurface): Box3D {
  const [bl, br, tr] = screenCorners3D(surf);
  return {
    minX: bl.x, maxX: br.x,
    minY: surf.posDsYM ?? 0,
    maxY: surf.posDsYM ?? 0,
    minZ: bl.z,   maxZ: tr.z,
  };
}

// ── Projector position geometry ────────────────────────────────────────────────
/**
 * Default mount height when not set on a position.
 * Defaults to screen center height (typical for center-rigged setups).
 */
export function defaultMountHeight(surf: ProjectionSurface): number {
  return screenCenterZ(surf);
}

/**
 * 3D world position of a projector's lens.
 *
 * Front projection: projector is on the audience side → Y = screenY − throwDist
 * Rear  projection: projector is behind screen      → Y = screenY + throwDist
 */
export function projectorLens3D(pos: ProjectorPosition, surf: ProjectionSurface): Point3D {
  const isRear = surf.surfaceType === 'REAR';
  const td = pos.throwDistM ?? 0;
  const screenY = surf.posDsYM ?? 0;
  return {
    x: (surf.posDsXM ?? 0) + (pos.horizOffsetM ?? 0),
    y: isRear ? screenY + td : screenY - td,
    z: (pos as any).mountHeightM ?? defaultMountHeight(surf),
  };
}

// ── Distance helpers ──────────────────────────────────────────────────────────
export function dist3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

export function dist2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/**
 * True 3D distance from lens to screen center (accounts for vertical/horiz offsets).
 */
export function actualThrow3D(pos: ProjectorPosition, surf: ProjectionSurface): number {
  return dist3D(projectorLens3D(pos, surf), screenCenter3D(surf));
}

// ── Lens shift ────────────────────────────────────────────────────────────────
/**
 * Vertical lens shift ratio required to center the image on the screen.
 *
 * Convention: positive = lens is below screen center (needs upward shift).
 * Standard formula: V_shift = (screenCenterZ − mountHeight) / throwDist
 */
export function calcVertLensShift(pos: ProjectorPosition, surf: ProjectionSurface): number {
  const td = pos.throwDistM;
  if (!td) return 0;
  const lens = projectorLens3D(pos, surf);
  const center = screenCenter3D(surf);
  return (center.z - lens.z) / td;
}

/**
 * Horizontal lens shift ratio required.
 * H_shift = horizOffset / throwDist  (positive = offset toward SR, shift toward SL)
 */
export function calcHorizLensShift(pos: ProjectorPosition): number {
  const td = pos.throwDistM;
  if (!td) return 0;
  return (pos.horizOffsetM ?? 0) / td;
}

export function calcLensShift(pos: ProjectorPosition, surf: ProjectionSurface): LensShift {
  return {
    vertical: calcVertLensShift(pos, surf),
    horizontal: calcHorizLensShift(pos),
  };
}

// ── Coverage ──────────────────────────────────────────────────────────────────
/**
 * How much of the screen a single projector covers given its throw ratio.
 * projCoverage = throwDist / throwRatio
 */
export function checkCoverage(
  pos: ProjectorPosition,
  surf: ProjectionSurface,
  throwRatio: number,
): CoverageResult {
  const td = pos.throwDistM ?? 0;
  const projCoverageM = throwRatio > 0 ? td / throwRatio : 0;
  const screenWidthM = surf.widthM ?? 0;
  const coverageFraction = screenWidthM > 0 ? projCoverageM / screenWidthM : 0;
  return { projCoverageM, screenWidthM, coverageFraction, isSufficient: coverageFraction >= 1 };
}

// ── Relative offset (for inspector) ──────────────────────────────────────────
export function projectorRelative(pos: ProjectorPosition, surf: ProjectionSurface): ProjectorRelative {
  const lens = projectorLens3D(pos, surf);
  const center = screenCenter3D(surf);
  return {
    horizM: lens.x - center.x,
    vertM:  lens.z - center.z,
    throwM: Math.abs(lens.y - (surf.posDsYM ?? 0)),
    actualDistM: dist3D(lens, center),
  };
}

// ── Full derived stats for inspector ─────────────────────────────────────────
export function derivePositionStats(
  pos: ProjectorPosition,
  surf: ProjectionSurface,
  throwRatio?: number,
): PositionDerivedStats {
  return {
    actualThrow3D: actualThrow3D(pos, surf),
    horizThrow: pos.throwDistM ?? 0,
    lensShift: calcLensShift(pos, surf),
    coverage: throwRatio !== undefined ? checkCoverage(pos, surf, throwRatio) : undefined,
    relative: projectorRelative(pos, surf),
    lensPt: projectorLens3D(pos, surf),
    screenCenter: screenCenter3D(surf),
  };
}

// ── Matte helpers ─────────────────────────────────────────────────────────────
/**
 * Convert a SurfaceMatte (image-space X/Y from image top-left) to 3D world center.
 *
 * Image convention: xM = distance from image left, yM = distance from image top.
 * World convention: X = room horizontal, Z = room height (Y-inverted from image).
 */
export function matteCenter3D(surf: ProjectionSurface, matte: SurfaceMatte): Point3D {
  const leftEdgeX = (surf.posDsXM ?? 0) - (surf.widthM ?? 0) / 2;
  const topEdgeZ  = screenTopZ(surf);
  return {
    x: leftEdgeX + matte.xM + matte.widthM / 2,
    y: surf.posDsYM ?? 0,
    z: topEdgeZ - matte.yM - matte.heightM / 2,
  };
}

/**
 * Convert a world X,Z drag delta back into image-space matte offsets.
 * Returns updated matte xM/yM clamped to the surface face.
 */
export function applyMatteDrag(
  surf: ProjectionSurface,
  matte: SurfaceMatte,
  dWorldX: number,
  dWorldZ: number,
): Partial<SurfaceMatte> {
  const surfW = surf.widthM ?? 0;
  const surfH = surf.heightM ?? 0;
  const newX = Math.max(0, Math.min(surfW - matte.widthM, matte.xM + dWorldX));
  // Image Y is inverted from world Z
  const newY = Math.max(0, Math.min(surfH - matte.heightM, matte.yM - dWorldZ));
  return { xM: newX, yM: newY };
}

// ── Floor intersection ────────────────────────────────────────────────────────
/**
 * Intersect a ray from `lens` through `edgePt` with the Z = 0 floor plane.
 * Returns null if the ray goes up or is parallel to the floor.
 */
export function coneFloorIntersect(lens: Point3D, edgePt: Point3D): Point3D | null {
  if (lens.z <= 0) return null;
  const dz = edgePt.z - lens.z;
  if (dz >= 0) return null;
  const tParam = -lens.z / dz;
  return {
    x: lens.x + tParam * (edgePt.x - lens.x),
    y: lens.y + tParam * (edgePt.y - lens.y),
    z: 0,
  };
}

// ── Helpers for view bboxes ───────────────────────────────────────────────────
/**
 * Combined bounding box for all surfaces in the floor plan (top view).
 * Returns null if no surfaces.
 */
export function surfacesFloorBBox(
  surfaces: ProjectionSurface[],
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (!surfaces.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of surfaces) {
    const hw = (s.widthM ?? 0) / 2;
    const y  = s.posDsYM ?? 0;
    if ((s.posDsXM ?? 0) - hw < minX) minX = (s.posDsXM ?? 0) - hw;
    if ((s.posDsXM ?? 0) + hw > maxX) maxX = (s.posDsXM ?? 0) + hw;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Combined bounding box for all surfaces in the side view (Y-Z plane).
 */
export function surfacesSideBBox(
  surfaces: ProjectionSurface[],
): { minY: number; maxY: number; minZ: number; maxZ: number } | null {
  if (!surfaces.length) return null;
  let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of surfaces) {
    const y = s.posDsYM ?? 0;
    const z0 = screenBottomZ(s);
    const z1 = screenTopZ(s);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z0 < minZ) minZ = z0;
    if (z1 > maxZ) maxZ = z1;
  }
  return { minY, maxY, minZ, maxZ };
}
