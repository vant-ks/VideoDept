import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export type SurfaceType = 'FRONT' | 'REAR' | 'DUAL_VISION' | 'MAPPED';

export interface SurfaceMatte {
  id: string;
  label?: string;
  xM: number;       // offset from image left edge
  yM: number;       // offset from image top edge
  widthM: number;
  heightM: number;
}

/** @deprecated — kept as legacy shape; normalizeAssignments() converts to ProjectorPosition */
export interface ProjectorAssignment {
  projectorUuid: string;
  throwDistM?: number;
  lensUuid?: string;
  horizOffsetM?: number;
  vertOffsetM?: number;
}

export interface StackedUnit {
  projectorUuid: string;
  note?: string;
}

export interface ProjectorPosition {
  id: string;
  label: string;
  horizOffsetM: number;
  throwDistM?: number;
  vertOffsetM?: number;
  lensUuid?: string;
  stackedUnits: StackedUnit[];
  blendZoneIndex?: number;
}

/** Converts legacy flat ProjectorAssignment[] or already-normalized ProjectorPosition[] to ProjectorPosition[]. */
export function normalizeAssignments(
  raw: Array<ProjectorPosition | ProjectorAssignment>
): ProjectorPosition[] {
  return raw.map((item, i) => {
    if ('stackedUnits' in item) return item as ProjectorPosition;
    const old = item as ProjectorAssignment;
    return {
      id: crypto.randomUUID(),
      label: `P${i + 1}`,
      horizOffsetM: old.horizOffsetM ?? 0,
      throwDistM: old.throwDistM,
      vertOffsetM: old.vertOffsetM,
      lensUuid: old.lensUuid,
      stackedUnits: old.projectorUuid ? [{ projectorUuid: old.projectorUuid }] : [],
      blendZoneIndex: i,
    };
  });
}

export interface ProjectionSurface {
  uuid: string;
  id: string;
  productionId: string;
  name: string;
  // Image area (meters)
  widthM?: number;
  heightM?: number;
  // Bezels per side (meters)
  bezelHM?: number;
  bezelVM?: number;
  // Surface properties
  surfaceType?: SurfaceType;
  gainFactor?: number;
  // Room position
  distFloorM?: number;   // bottom of image to floor
  posDsXM?: number;      // X from downstage center (+ = stage right)
  posDsYM?: number;      // Y from downstage center (+ = upstage)
  posDsZM?: number;      // Z height of screen center
  // Rotation (degrees)
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  // Ambient
  ambientLux?: number;
  // Structured JSON fields
  mattes?: SurfaceMatte[];
  projectorAssignments?: ProjectorPosition[];
  note?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isDeleted: boolean;
}

export type ProjectionSurfaceInput = Omit<ProjectionSurface, 'uuid' | 'createdAt' | 'updatedAt' | 'isDeleted'> & {
  productionId: string;
};

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

function getUserInfo() {
  return {
    userId: localStorage.getItem('user_id') || 'anonymous',
    userName: localStorage.getItem('user_name') || 'Anonymous User',
  };
}

export function useProjectionSurfaceAPI() {
  const fetchSurfaces = useCallback(async (productionId: string): Promise<ProjectionSurface[]> => {
    const raw = await apiClient.get<ProjectionSurface[]>(`/projection-surfaces/production/${productionId}`);
    return raw.map(s => ({
      ...s,
      projectorAssignments: normalizeAssignments((s.projectorAssignments ?? []) as any[]),
    }));
  }, []);

  const createSurface = useCallback(async (input: Omit<ProjectionSurfaceInput, 'version'>): Promise<ProjectionSurface> => {
    const { userId, userName } = getUserInfo();
    return apiClient.post<ProjectionSurface>('/projection-surfaces', { ...input, userId, userName });
  }, []);

  const updateSurface = useCallback(async (
    uuid: string,
    updates: Partial<ProjectionSurfaceInput>
  ): Promise<ProjectionSurface | ConflictError> => {
    const { userId, userName } = getUserInfo();
    try {
      return await apiClient.put<ProjectionSurface>(`/projection-surfaces/${uuid}`, { ...updates, userId, userName });
    } catch (err: any) {
      if (err?.status === 409 || err?.response?.status === 409) {
        return err?.response?.data ?? err;
      }
      throw err;
    }
  }, []);

  const deleteSurface = useCallback(async (uuid: string): Promise<void> => {
    const { userId, userName } = getUserInfo();
    await apiClient.delete(`/projection-surfaces/${uuid}`, { userId, userName });
  }, []);

  return { fetchSurfaces, createSurface, updateSurface, deleteSurface };
}
