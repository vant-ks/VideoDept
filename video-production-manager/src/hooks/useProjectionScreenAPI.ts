import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface ProjectionScreen {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface ProjectionScreenInput {
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
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<ProjectionScreen>('/projection-screens', requestData);
    } catch (error) {
      console.error('Error creating projectionScreen:', error);
      throw error;
    }
  }, []);

  const updateProjectionScreen = useCallback(async (
    id: string,
    updates: Partial<ProjectionScreenInput>
  ): Promise<ProjectionScreen | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<ProjectionScreen>(`/projection-screens/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating projectionScreen:', error);
      throw error;
    }
  }, []);

  const deleteProjectionScreen = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/projection-screens/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting projectionScreen:', error);
      throw error;
    }
  }, []);

  return {
    fetch${ProjectionScreen}s,
    create${ProjectionScreen},
    update${ProjectionScreen},
    delete${ProjectionScreen}
  };
}
