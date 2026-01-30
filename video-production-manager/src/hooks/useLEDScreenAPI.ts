import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface LEDScreen {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface LEDScreenInput {
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

export function use${LEDScreen}API() {
  const fetch${LEDScreen}s = useCallback(async (productionId: string): Promise<LEDScreen[]> => {
    try {
      return await apiClient.get<LEDScreen[]>(`/led-screens/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching led-screens:', error);
      throw error;
    }
  }, []);

  const create${LEDScreen} = useCallback(async (input: LEDScreenInput): Promise<LEDScreen> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<LEDScreen>('/led-screens', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating ledScreen:', error);
      throw error;
    }
  }, []);

  const update${LEDScreen} = useCallback(async (
    id: string,
    updates: Partial<LEDScreenInput>
  ): Promise<LEDScreen | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<LEDScreen>(`/led-screens/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating ledScreen:', error);
      throw error;
    }
  }, []);

  const delete${LEDScreen} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/led-screens/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting ledScreen:', error);
      throw error;
    }
  }, []);

  return {
    fetch${LEDScreen}s,
    create${LEDScreen},
    update${LEDScreen},
    delete${LEDScreen}
  };
}
