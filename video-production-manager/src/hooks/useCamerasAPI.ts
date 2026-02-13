import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import type { Camera } from '@/types';

interface CreateCameraInput {
  id?: string; // Optional custom ID (e.g., "CAM 1")
  productionId: string;
  userId?: string;
  userName?: string;
  name: string;
  manufacturer?: string;
  model?: string;
  formatMode?: string;
  lensType?: string;
  maxZoom?: number;
  shootingDistance?: number;
  calculatedZoom?: number;
  hasTripod?: boolean;
  hasShortTripod?: boolean;
  hasDolly?: boolean;
  hasJib?: boolean;
  ccuId?: string;
  smpteCableLength?: number;
  note?: string;
}

interface UpdateCameraInput extends Partial<CreateCameraInput> {
  version?: number;
}

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

export function useCamerasAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserInfo = useCallback(() => {
    const userName = localStorage.getItem('user_name') || 'Anonymous';
    const userId = localStorage.getItem('user_id') || 'anonymous';
    return { userId, userName };
  }, []);

  const fetchCameras = useCallback(async (productionId: string): Promise<Camera[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Camera[]>(`/cameras/production/${productionId}`);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch cameras';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCamera = useCallback(async (input: CreateCameraInput): Promise<Camera> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        id: input.id,
        productionId: input.productionId,
        name: input.name,
        manufacturer: input.manufacturer,
        model: input.model,
        formatMode: input.formatMode,
        lensType: input.lensType,
        maxZoom: input.maxZoom,
        shootingDistance: input.shootingDistance,
        calculatedZoom: input.calculatedZoom,
        hasTripod: input.hasTripod,
        hasShortTripod: input.hasShortTripod,
        hasDolly: input.hasDolly,
        hasJib: input.hasJib,
        ccuId: input.ccuId,
        smpteCableLength: input.smpteCableLength,
        note: input.note,
        userId,
        userName,
      };
      const data = await apiClient.post<Camera>('/cameras', requestData);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create camera';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const updateCamera = useCallback(async (
    id: string,
    input: UpdateCameraInput
  ): Promise<Camera | ConflictError> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        manufacturer: input.manufacturer,
        model: input.model,
        formatMode: input.formatMode,
        lensType: input.lensType,
        maxZoom: input.maxZoom,
        shootingDistance: input.shootingDistance,
        calculatedZoom: input.calculatedZoom,
        hasTripod: input.hasTripod,
        hasShortTripod: input.hasShortTripod,
        hasDolly: input.hasDolly,
        hasJib: input.hasJib,
        ccuId: input.ccuId,
        smpteCableLength: input.smpteCableLength,
        note: input.note,
        version: input.version,
        userId,
        userName,
      };
      const data = await apiClient.put<Camera>(`/cameras/${id}`, requestData);
      return data;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflict detected
        const conflictData: ConflictError = err.response.data;
        return conflictData;
      }
      const message = err.response?.data?.error || 'Failed to update camera';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const deleteCamera = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/cameras/${id}`, {
        data: { userId, userName }
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete camera';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  return {
    isLoading,
    error,
    fetchCameras,
    createCamera,
    updateCamera,
    deleteCamera,
  };
}
