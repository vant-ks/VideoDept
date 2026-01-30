import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import type { Source } from '@/types';

interface CreateSourceInput {
  productionId: string;
  userId?: string;
  userName?: string;
  type: string;
  name: string;
  hRes: number;
  vRes: number;
  rate: number;
  outputs?: string[];
  note?: string;
}

interface UpdateSourceInput extends Partial<CreateSourceInput> {
  version?: number;
}

interface ConflictError {
  error: string;
  message: string;
  currentVersion: number;
  clientVersion: number;
}

export function useSourcesAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserInfo = useCallback(() => {
    const userName = localStorage.getItem('user_name') || 'Anonymous';
    const userId = localStorage.getItem('user_id') || 'anonymous';
    return { userId, userName };
  }, []);

  const fetchSources = useCallback(async (productionId: string): Promise<Source[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Source[]>(`/sources/production/${productionId}`);
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch sources';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSource = useCallback(async (input: CreateSourceInput): Promise<Source> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const data = await apiClient.post<Source>('/sources', {
        ...input,
        userId,
        userName,
      });
      return data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create source';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const updateSource = useCallback(async (
    id: string,
    input: UpdateSourceInput
  ): Promise<Source | ConflictError> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      const data = await apiClient.put<Source>(`/sources/${id}`, {
        ...input,
        userId,
        userName,
      });
      return data;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflict detected
        const conflictData: ConflictError = err.response.data;
        return conflictData;
      }
      const message = err.response?.data?.error || 'Failed to update source';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  const deleteSource = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/sources/${id}`, {
        data: { userId, userName }
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete source';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getUserInfo]);

  return {
    isLoading,
    error,
    fetchSources,
    createSource,
    updateSource,
    deleteSource,
  };
}
