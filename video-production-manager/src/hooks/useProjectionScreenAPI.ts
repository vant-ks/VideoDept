import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface ProjectionScreen {
  uuid: string;
  id: string;
  productionId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  hRes?: number;
  vRes?: number;
  rate?: number;
  note?: string;
  equipmentUuid?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isDeleted: boolean;
}

export interface ProjectionScreenInput {
  productionId: string;
  id?: string;
  name: string;
  manufacturer?: string;
  model?: string;
  hRes?: number;
  vRes?: number;
  rate?: number;
  note?: string;
  equipmentUuid?: string;
  version?: number;
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

export function useProjectionScreenAPI() {
  const fetchProjectionScreens = useCallback(async (productionId: string): Promise<ProjectionScreen[]> => {
    try {
      return await apiClient.get<ProjectionScreen[]>(`/projection-screens/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching projection-screens:', error);
      throw error;
    }
  }, []);

  const createProjectionScreen = useCallback(async (input: ProjectionScreenInput): Promise<ProjectionScreen> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<ProjectionScreen>('/projection-screens', { ...input, userId, userName });
    } catch (error) {
      console.error('Error creating projectionScreen:', error);
      throw error;
    }
  }, []);

  const updateProjectionScreen = useCallback(async (
    uuid: string,
    updates: Partial<ProjectionScreenInput>
  ): Promise<ProjectionScreen | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<ProjectionScreen>(`/projection-screens/${uuid}`, { ...updates, userId, userName });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating projectionScreen:', error);
      throw error;
    }
  }, []);

  const deleteProjectionScreen = useCallback(async (uuid: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/projection-screens/${uuid}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting projectionScreen:', error);
      throw error;
    }
  }, []);

  return {
    fetchProjectionScreens,
    createProjectionScreen,
    updateProjectionScreen,
    deleteProjectionScreen
  };
}
