import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface ChecklistItem {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface ChecklistItemInput {
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

export function useChecklistItemAPI() {
  const fetchChecklistItems = useCallback(async (productionId: string): Promise<ChecklistItem[]> => {
    try {
      return await apiClient.get<ChecklistItem[]>(`/checklist-items/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching checklist-items:', error);
      throw error;
    }
  }, []);

  const createChecklistItem = useCallback(async (input: ChecklistItemInput): Promise<ChecklistItem> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<ChecklistItem>('/checklist-items', requestData);
    } catch (error) {
      console.error('Error creating checklistItem:', error);
      throw error;
    }
  }, []);

  const updateChecklistItem = useCallback(async (
    id: string,
    updates: Partial<ChecklistItemInput>
  ): Promise<ChecklistItem | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<ChecklistItem>(`/checklist-items/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating checklistItem:', error);
      throw error;
    }
  }, []);

  const deleteChecklistItem = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/checklist-items/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting checklistItem:', error);
      throw error;
    }
  }, []);

  return {
    fetchChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem
  };
}
