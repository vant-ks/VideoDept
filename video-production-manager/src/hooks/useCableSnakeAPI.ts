import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface CableSnake {
  uuid: string;
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

export function useCableSnakeAPI() {
  const fetchCableSnakes = useCallback(async (productionId: string): Promise<CableSnake[]> => {
    try {
      return await apiClient.get<CableSnake[]>(`/cable-snakes/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching cable-snakes:', error);
      throw error;
    }
  }, []);

  const createCableSnake = useCallback(async (input: CableSnakeInput): Promise<CableSnake> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<CableSnake>('/cable-snakes', requestData);
    } catch (error) {
      console.error('Error creating cableSnake:', error);
      throw error;
    }
  }, []);

  const updateCableSnake = useCallback(async (
    id: string,
    updates: Partial<CableSnakeInput>
  ): Promise<CableSnake | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<CableSnake>(`/cable-snakes/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating cableSnake:', error);
      throw error;
    }
  }, []);

  const deleteCableSnake = useCallback(async (id: string): Promise<void> => {
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
    fetchCableSnakes,
    createCableSnake,
    updateCableSnake,
    deleteCableSnake
  };
}
