import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface CableSnake {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface CableSnakeInput {
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

export function use${CableSnake}API() {
  const fetch${CableSnake}s = useCallback(async (productionId: string): Promise<CableSnake[]> => {
    try {
      return await apiClient.get<CableSnake[]>(`/cable-snakes/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching cable-snakes:', error);
      throw error;
    }
  }, []);

  const create${CableSnake} = useCallback(async (input: CableSnakeInput): Promise<CableSnake> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<CableSnake>('/cable-snakes', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating cableSnake:', error);
      throw error;
    }
  }, []);

  const update${CableSnake} = useCallback(async (
    id: string,
    updates: Partial<CableSnakeInput>
  ): Promise<CableSnake | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<CableSnake>(`/cable-snakes/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating cableSnake:', error);
      throw error;
    }
  }, []);

  const delete${CableSnake} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/cable-snakes/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting cableSnake:', error);
      throw error;
    }
  }, []);

  return {
    fetch${CableSnake}s,
    create${CableSnake},
    update${CableSnake},
    delete${CableSnake}
  };
}
