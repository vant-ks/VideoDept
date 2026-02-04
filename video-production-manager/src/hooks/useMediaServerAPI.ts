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

export function useMediaServerAPI() {
  const fetchMediaServers = useCallback(async (productionId: string): Promise<MediaServer[]> => {
    try {
      return await apiClient.get<MediaServer[]>(`/media-servers/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching media-servers:', error);
      throw error;
    }
  }, []);

  const createMediaServer = useCallback(async (input: MediaServerInput): Promise<MediaServer> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<MediaServer>('/media-servers', requestData);
    } catch (error) {
      console.error('Error creating mediaServer:', error);
      throw error;
    }
  }, []);

  const updateMediaServer = useCallback(async (
    id: string,
    updates: Partial<MediaServerInput>
  ): Promise<MediaServer | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<MediaServer>(`/media-servers/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating mediaServer:', error);
      throw error;
    }
  }, []);

  const deleteMediaServer = useCallback(async (id: string): Promise<void> => {
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
    fetchMediaServers,
    createMediaServer,
    updateMediaServer,
    deleteMediaServer
  };
}
