import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import type { Send } from '@/types';

interface CreateSendInput {
  id?: string;
  productionId: string;
  userId?: string;
  userName?: string;
  name: string;
  type: string;
  hRes: number;
  vRes: number;
  rate: number;
  note?: string;
  equipmentUuid?: string;
  secondaryDevice?: string;
  outputConnector?: string;
}

interface UpdateSendInput extends Partial<CreateSendInput> {
  version?: number;
  equipmentUuid?: string;
  secondaryDevice?: string;
  outputConnector?: string;
}

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

export function useSendsAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserInfo = useCallback(() => {
    const userName = localStorage.getItem('user_name') || 'Anonymous';
    const userId = localStorage.getItem('user_id') || 'anonymous';
    return { userId, userName };
  }, []);

  const fetchSends = useCallback(async (productionId: string): Promise<Send[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Send[]>(`/sends/production/${productionId}`);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch sends';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSend = useCallback(async (input: CreateSendInput): Promise<Send> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        id: input.id,
        productionId: input.productionId,
        name: input.name,
        type: input.type,
        hRes: input.hRes,
        vRes: input.vRes,
        rate: input.rate,
        note: input.note,
        equipmentUuid: input.equipmentUuid,
        secondaryDevice: input.secondaryDevice,
        outputConnector: input.outputConnector,
        userId,
        userName,
      };
      const data = await apiClient.post<Send>('/sends', requestData);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create send';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const updateSend = useCallback(async (
    id: string,
    input: UpdateSendInput
  ): Promise<Send | ConflictError> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        type: input.type,
        hRes: input.hRes,
        vRes: input.vRes,
        rate: input.rate,
        note: input.note,
        equipmentUuid: input.equipmentUuid,
        secondaryDevice: input.secondaryDevice,
        outputConnector: input.outputConnector,
        version: input.version,
        userId,
        userName,
      };
      const data = await apiClient.put<Send>(`/sends/${id}`, requestData);
      return data;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflict detected
        const conflictData: ConflictError = err.response.data;
        return conflictData;
      }
      const message = err.response?.data?.error || 'Failed to update send';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const deleteSend = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/sends/${id}`, {
        data: { userId, userName }
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete send';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  return {
    isLoading,
    error,
    fetchSends,
    createSend,
    updateSend,
    deleteSend,
  };
}
