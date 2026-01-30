import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface MediaServer {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface MediaServerInput {
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

export function use${MediaServer}API() {
  const fetch${MediaServer}s = useCallback(async (productionId: string): Promise<MediaServer[]> => {
    try {
      return await apiClient.get<MediaServer[]>(`/media-servers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching media-servers:', error);
      throw error;
    }
  }, []);

  const create${MediaServer} = useCallback(async (input: MediaServerInput): Promise<MediaServer> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<MediaServer>('/media-servers', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating mediaServer:', error);
      throw error;
    }
  }, []);

  const update${MediaServer} = useCallback(async (
    id: string,
    updates: Partial<MediaServerInput>
  ): Promise<MediaServer | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<MediaServer>(`/media-servers/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating mediaServer:', error);
      throw error;
    }
  }, []);

  const delete${MediaServer} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/media-servers/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting mediaServer:', error);
      throw error;
    }
  }, []);

  return {
    fetch${MediaServer}s,
    create${MediaServer},
    update${MediaServer},
    delete${MediaServer}
  };
}
