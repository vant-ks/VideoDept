import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface Router {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface RouterInput {
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

export function useRouterAPI() {
  const fetchRouters = useCallback(async (productionId: string): Promise<Router[]> => {
    try {
      return await apiClient.get<Router[]>(`/routers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching routers:', error);
      throw error;
    }
  }, []);

  const createRouter = useCallback(async (input: RouterInput): Promise<Router> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<Router>('/routers', requestData);
    } catch (error) {
      console.error('Error creating router:', error);
      throw error;
    }
  }, []);

  const updateRouter = useCallback(async (
    id: string,
    updates: Partial<RouterInput>
  ): Promise<Router | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<Router>(`/routers/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating router:', error);
      throw error;
    }
  }, []);

  const deleteRouter = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/routers/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting router:', error);
      throw error;
    }
  }, []);

  return {
    fetchRouters,
    createRouter,
    updateRouter,
    deleteRouter
  };
}
