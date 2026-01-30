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

export function use${Stream}API() {
  const fetch${Stream}s = useCallback(async (productionId: string): Promise<Stream[]> => {
    try {
      return await apiClient.get<Stream[]>(`/streams/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching streams:', error);
      throw error;
    }
  }, []);

  const create${Stream} = useCallback(async (input: StreamInput): Promise<Stream> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<Stream>('/streams', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  }, []);

  const update${Stream} = useCallback(async (
    id: string,
    updates: Partial<StreamInput>
  ): Promise<Stream | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<Stream>(`/streams/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating stream:', error);
      throw error;
    }
  }, []);

  const delete${Stream} = useCallback(async (id: string): Promise<void> => {
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
    fetch${Stream}s,
    create${Stream},
    update${Stream},
    delete${Stream}
  };
}
