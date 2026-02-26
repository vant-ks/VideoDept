import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface ChecklistItem {
  uuid: string;
  id: string;
  productionId: string;
  title: string;
  completed: boolean;
  category?: string;
  moreInfo?: any;
  assignedTo?: string;
  daysBeforeShow?: number;
  dueDate?: Date | string;
  completionDate?: Date | string;
  completionNote?: any;
  reference?: string;
  sortOrder?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  version: number;
  lastModifiedBy?: string;
}

export interface ChecklistItemInput {
  id: string; // Required: user-facing identifier (e.g., "chk-1234567890")
  productionId: string;
  title: string;
  completed?: boolean;
  category?: string;
  moreInfo?: any;
  assignedTo?: string;
  daysBeforeShow?: number;
  dueDate?: Date | string;
  completionNote?: any;
  reference?: string;
  sortOrder?: number;
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

export function useChecklistAPI() {
  const fetchChecklistItems = useCallback(async (productionId: string): Promise<ChecklistItem[]> => {
    try {
      return await apiClient.get<ChecklistItem[]>(`/checklist-items/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      throw error;
    }
  }, []);

  const createChecklistItem = useCallback(async (input: ChecklistItemInput): Promise<ChecklistItem> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        ...input,
        userId,
        userName,
        lastModifiedBy: userName
      };
      return await apiClient.post<ChecklistItem>('/checklist-items', requestData);
    } catch (error) {
      console.error('Error creating checklist item:', error);
      throw error;
    }
  }, []);

  const updateChecklistItem = useCallback(async (
    uuid: string,
    updates: Partial<ChecklistItemInput> & { version?: number }
  ): Promise<ChecklistItem | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        ...updates,
        userId,
        userName,
        lastModifiedBy: userName
      };
      return await apiClient.put<ChecklistItem>(`/checklist-items/${uuid}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating checklist item:', error);
      throw error;
    }
  }, []);

  const deleteChecklistItem = useCallback(async (uuid: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/checklist-items/${uuid}?userId=${userId}&userName=${userName}`);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      throw error;
    }
  }, []);

  const toggleChecklistItem = useCallback(async (
    uuid: string,
    completed: boolean,
    version: number
  ): Promise<ChecklistItem | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        completed,
        version,
        completionDate: completed ? new Date().toISOString() : null,
        userId,
        userName,
        lastModifiedBy: userName
      };
      return await apiClient.put<ChecklistItem>(`/checklist-items/${uuid}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error toggling checklist item:', error);
      throw error;
    }
  }, []);

  return {
    fetchChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem
  };
}
