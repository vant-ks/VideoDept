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

export function useLEDScreenAPI() {
  const fetchLEDScreens = useCallback(async (productionId: string): Promise<LEDScreen[]> => {
    try {
      return await apiClient.get<LEDScreen[]>(`/led-screens/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching led-screens:', error);
      throw error;
    }
  }, []);

  const createLEDScreen = useCallback(async (input: LEDScreenInput): Promise<LEDScreen> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<LEDScreen>('/led-screens', requestData);
    } catch (error) {
      console.error('Error creating ledScreen:', error);
      throw error;
    }
  }, []);

  const updateLEDScreen = useCallback(async (
    id: string,
    updates: Partial<LEDScreenInput>
  ): Promise<LEDScreen | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<LEDScreen>(`/led-screens/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating ledScreen:', error);
      throw error;
    }
  }, []);

  const deleteLEDScreen = useCallback(async (id: string): Promise<void> => {
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
    fetchLEDScreens,
    createLEDScreen,
    updateLEDScreen,
    deleteLEDScreen
  };
}
