import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface IPAddress {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface IPAddressInput {
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

export function use${IPAddress}API() {
  const fetch${IPAddress}s = useCallback(async (productionId: string): Promise<IPAddress[]> => {
    try {
      return await apiClient.get<IPAddress[]>(`/ip-addresses/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching ip-addresses:', error);
      throw error;
    }
  }, []);

  const create${IPAddress} = useCallback(async (input: IPAddressInput): Promise<IPAddress> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.post<IPAddress>('/ip-addresses', {
        ...input,
        userId,
        userName
      });
    } catch (error) {
      console.error('Error creating ipAddress:', error);
      throw error;
    }
  }, []);

  const update${IPAddress} = useCallback(async (
    id: string,
    updates: Partial<IPAddressInput>
  ): Promise<IPAddress | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      return await apiClient.put<IPAddress>(`/ip-addresses/${id}`, {
        ...updates,
        userId,
        userName
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating ipAddress:', error);
      throw error;
    }
  }, []);

  const delete${IPAddress} = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/ip-addresses/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting ipAddress:', error);
      throw error;
    }
  }, []);

  return {
    fetch${IPAddress}s,
    create${IPAddress},
    update${IPAddress},
    delete${IPAddress}
  };
}
