import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface CamSwitcher {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface CamSwitcherInput {
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

export function use${CamSwitcher}API() {
  const fetch${CamSwitcher}s = useCallback(async (productionId: string): Promise<CamSwitcher[]> => {
    try {
      return await apiClient.get<CamSwitcher[]>(`/cam-switchers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching cam-switchers:', error);
      throw error;
    }
  }, []);

  const create${CamSwitcher} = useCallback(async (input: CamSwitcherInput): Promise<CamSwitcher> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<CamSwitcher>('/cam-switchers', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating camSwitcher:', error);
      throw error;
    }
  }, []);

  const update${CamSwitcher} = useCallback(async (
    id: string,
    updates: Partial<CamSwitcherInput>
  ): Promise<CamSwitcher | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<CamSwitcher>(`/cam-switchers/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating camSwitcher:', error);
      throw error;
    }
  }, []);

  const delete${CamSwitcher} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/cam-switchers/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting camSwitcher:', error);
      throw error;
    }
  }, []);

  return {
    fetch${CamSwitcher}s,
    create${CamSwitcher},
    update${CamSwitcher},
    delete${CamSwitcher}
  };
}
