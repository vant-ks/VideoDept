import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface Stream {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface StreamInput {
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

export function useStreamAPI() {
  const fetchStreams = useCallback(async (productionId: string): Promise<Stream[]> => {
    try {
      return await apiClient.get<Stream[]>(`/streams/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching streams:', error);
      throw error;
    }
  }, []);

  const createStream = useCallback(async (input: StreamInput): Promise<Stream> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<Stream>('/streams', requestData);
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  }, []);

  const updateStream = useCallback(async (
    id: string,
    updates: Partial<StreamInput>
  ): Promise<Stream | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<Stream>(`/streams/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating stream:', error);
      throw error;
    }
  }, []);

  const deleteStream = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/streams/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting stream:', error);
      throw error;
    }
  }, []);

  return {
    fetchStreams,
    createStream,
    updateStream,
    deleteStream
  };
}
