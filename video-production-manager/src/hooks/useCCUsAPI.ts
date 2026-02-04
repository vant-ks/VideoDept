import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import type { CCU } from '@/types';

interface CreateCCUInput {
  productionId: string;
  userId?: string;
  userName?: string;
  name: string;
  note?: string;
}

interface UpdateCCUInput extends Partial<CreateCCUInput> {
  version?: number;
}

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

export function useCCUsAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserInfo = useCallback(() => {
    const userName = localStorage.getItem('user_name') || 'Anonymous';
    const userId = localStorage.getItem('user_id') || 'anonymous';
    return { userId, userName };
  }, []);

  const fetchCCUs = useCallback(async (productionId: string): Promise<CCU[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<CCU[]>(`/ccus/production/${productionId}`);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch CCUs';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCCU = useCallback(async (input: CreateCCUInput): Promise<CCU> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        note: input.note,
        userId,
        userName,
      };
      const data = await apiClient.post<CCU>('/ccus', requestData);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create CCU';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const updateCCU = useCallback(async (
    id: string,
    input: UpdateCCUInput
  ): Promise<CCU | ConflictError> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        note: input.note,
        version: input.version,
        userId,
        userName,
      };
      const data = await apiClient.put<CCU>(`/ccus/${id}`, requestData);
      return data;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflict detected
        const conflictData: ConflictError = err.response.data;
        return conflictData;
      }
      const message = err.response?.data?.error || 'Failed to update CCU';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const deleteCCU = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/ccus/${id}`, {
        data: { userId, userName }
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete CCU';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  return {
    isLoading,
    error,
    fetchCCUs,
    createCCU,
    updateCCU,
    deleteCCU,
  };
}
