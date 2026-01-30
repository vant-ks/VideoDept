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

export function use${Router}API() {
  const fetch${Router}s = useCallback(async (productionId: string): Promise<Router[]> => {
    try {
      return await apiClient.get<Router[]>(`/routers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching routers:', error);
      throw error;
    }
  }, []);

  const create${Router} = useCallback(async (input: RouterInput): Promise<Router> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<Router>('/routers', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating router:', error);
      throw error;
    }
  }, []);

  const update${Router} = useCallback(async (
    id: string,
    updates: Partial<RouterInput>
  ): Promise<Router | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<Router>(`/routers/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating router:', error);
      throw error;
    }
  }, []);

  const delete${Router} = useCallback(async (id: string): Promise<void> => {
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
    fetch${Router}s,
    create${Router},
    update${Router},
    delete${Router}
  };
}
