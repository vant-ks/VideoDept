import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface RecordEntity {
  uuid: string;
  id: string;
  productionId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  format?: string;
  note?: string;
  equipmentUuid?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface RecordInput {
  id?: string;
  productionId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  format?: string;
  note?: string;
  equipmentUuid?: string;
  version?: number;
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

export function useRecordAPI() {
  const fetchRecords = useCallback(async (productionId: string): Promise<RecordEntity[]> => {
    try {
      return await apiClient.get<RecordEntity[]>(`/records/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }, []);

  const createRecord = useCallback(async (input: RecordInput): Promise<RecordEntity> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        id: input.id,
        productionId: input.productionId,
        name: input.name,
        manufacturer: input.manufacturer,
        model: input.model,
        format: input.format,
        note: input.note,
        equipmentUuid: input.equipmentUuid,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<RecordEntity>('/records', requestData);
    } catch (error) {
      console.error('Error creating record:', error);
      throw error;
    }
  }, []);

  const updateRecord = useCallback(async (
    uuid: string,
    updates: Partial<RecordInput>
  ): Promise<RecordEntity | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        name: updates.name,
        manufacturer: updates.manufacturer,
        model: updates.model,
        format: updates.format,
        note: updates.note,
        equipmentUuid: updates.equipmentUuid,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<RecordEntity>(`/records/${uuid}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating record:', error);
      throw error;
    }
  }, []);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
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
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord
  };
}
