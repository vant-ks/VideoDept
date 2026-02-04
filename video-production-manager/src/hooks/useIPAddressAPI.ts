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

export function useIPAddressAPI() {
  const fetchIPAddresses = useCallback(async (productionId: string): Promise<IPAddress[]> => {
    try {
      return await apiClient.get<IPAddress[]>(`/ip-addresses/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching ip-addresses:', error);
      throw error;
    }
  }, []);

  const createIPAddress = useCallback(async (input: IPAddressInput): Promise<IPAddress> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<IPAddress>('/ip-addresses', requestData);
    } catch (error) {
      console.error('Error creating ipAddress:', error);
      throw error;
    }
  }, []);

  const updateIPAddress = useCallback(async (
    id: string,
    updates: Partial<IPAddressInput>
  ): Promise<IPAddress | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<IPAddress>(`/ip-addresses/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating ipAddress:', error);
      throw error;
    }
  }, []);

  const deleteIPAddress = useCallback(async (id: string): Promise<void> => {
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
    fetchIPAddresses,
    createIPAddress,
    updateIPAddress,
    deleteIPAddress
  };
}
