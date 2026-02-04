import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface Connection {
  id: string;
  productionId: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface ConnectionInput {
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

export function useConnectionAPI() {
  const fetchConnections = useCallback(async (productionId: string): Promise<Connection[]> => {
    try {
      return await apiClient.get<Connection[]>(`/connections/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching connections:', error);
      throw error;
    }
  }, []);

  const createConnection = useCallback(async (input: ConnectionInput): Promise<Connection> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<Connection>('/connections', requestData);
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  }, []);

  const updateConnection = useCallback(async (
    id: string,
    updates: Partial<ConnectionInput>
  ): Promise<Connection | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<Connection>(`/connections/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating connection:', error);
      throw error;
    }
  }, []);

  const deleteConnection = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/connections/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting connection:', error);
      throw error;
    }
  }, []);

  return {
    fetch${Connection}s,
    create${Connection},
    update${Connection},
    delete${Connection}
  };
}
