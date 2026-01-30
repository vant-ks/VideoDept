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

export function use${VisionSwitcher}API() {
  const fetch${VisionSwitcher}s = useCallback(async (productionId: string): Promise<VisionSwitcher[]> => {
    try {
      return await apiClient.get<VisionSwitcher[]>(`/vision-switchers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching vision-switchers:', error);
      throw error;
    }
  }, []);

  const create${VisionSwitcher} = useCallback(async (input: VisionSwitcherInput): Promise<VisionSwitcher> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<VisionSwitcher>('/vision-switchers', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating visionSwitcher:', error);
      throw error;
    }
  }, []);

  const update${VisionSwitcher} = useCallback(async (
    id: string,
    updates: Partial<VisionSwitcherInput>
  ): Promise<VisionSwitcher | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<VisionSwitcher>(`/vision-switchers/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating visionSwitcher:', error);
      throw error;
    }
  }, []);

  const delete${VisionSwitcher} = useCallback(async (id: string): Promise<void> => {
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
    fetch${VisionSwitcher}s,
    create${VisionSwitcher},
    update${VisionSwitcher},
    delete${VisionSwitcher}
  };
}
