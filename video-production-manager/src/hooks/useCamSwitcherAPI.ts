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

export function useCamSwitcherAPI() {
  const fetchCamSwitchers = useCallback(async (productionId: string): Promise<CamSwitcher[]> => {
    try {
      return await apiClient.get<CamSwitcher[]>(`/cam-switchers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching cam-switchers:', error);
      throw error;
    }
  }, []);

  const createCamSwitcher = useCallback(async (input: CamSwitcherInput): Promise<CamSwitcher> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<CamSwitcher>('/cam-switchers', requestData);
    } catch (error) {
      console.error('Error creating camSwitcher:', error);
      throw error;
    }
  }, []);

  const updateCamSwitcher = useCallback(async (
    id: string,
    updates: Partial<CamSwitcherInput>
  ): Promise<CamSwitcher | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<CamSwitcher>(`/cam-switchers/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating camSwitcher:', error);
      throw error;
    }
  }, []);

  const deleteCamSwitcher = useCallback(async (id: string): Promise<void> => {
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
    fetchCamSwitchers,
    createCamSwitcher,
    updateCamSwitcher,
    deleteCamSwitcher
  };
}
