import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface VisionSwitcher {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface VisionSwitcherInput {
  productionId: string;
  name: string;
  version?: number;
  // Add other fields as needed
}

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

function getUserInfo() {
  return {
    userId: localStorage.getItem('user_id') || 'anonymous',
    userName: localStorage.getItem('user_name') || 'Anonymous User'
  };
}

export function useVisionSwitcherAPI() {
  const fetchVisionSwitchers = useCallback(async (productionId: string): Promise<VisionSwitcher[]> => {
    try {
      return await apiClient.get<VisionSwitcher[]>(`/vision-switchers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching vision-switchers:', error);
      throw error;
    }
  }, []);

  const createVisionSwitcher = useCallback(async (input: VisionSwitcherInput): Promise<VisionSwitcher> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<VisionSwitcher>('/vision-switchers', requestData);
    } catch (error) {
      console.error('Error creating visionSwitcher:', error);
      throw error;
    }
  }, []);

  const updateVisionSwitcher = useCallback(async (
    id: string,
    updates: Partial<VisionSwitcherInput>
  ): Promise<VisionSwitcher | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<VisionSwitcher>(`/vision-switchers/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating visionSwitcher:', error);
      throw error;
    }
  }, []);

  const deleteVisionSwitcher = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/vision-switchers/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting visionSwitcher:', error);
      throw error;
    }
  }, []);

  return {
    fetchVisionSwitchers,
    createVisionSwitcher,
    updateVisionSwitcher,
    deleteVisionSwitcher
  };
}
