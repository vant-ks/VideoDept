import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface Record {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface RecordInput {
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

export function use${Record}API() {
  const fetch${Record}s = useCallback(async (productionId: string): Promise<Record[]> => {
    try {
      return await apiClient.get<Record[]>(`/records/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }, []);

  const create${Record} = useCallback(async (input: RecordInput): Promise<Record> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<Record>('/records', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating record:', error);
      throw error;
    }
  }, []);

  const update${Record} = useCallback(async (
    id: string,
    updates: Partial<RecordInput>
  ): Promise<Record | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<Record>(`/records/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating record:', error);
      throw error;
    }
  }, []);

  const delete${Record} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/records/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  }, []);

  return {
    fetch${Record}s,
    create${Record},
    update${Record},
    delete${Record}
  };
}
