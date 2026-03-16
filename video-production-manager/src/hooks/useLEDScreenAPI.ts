import { useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface TileCell {
  type: 'TILE' | 'VOID';
  tileSpecUuid?: string;        // equipment_specs UUID (LED_TILE category)
  variant?: 'STANDARD' | 'R_CORNER' | 'L_CORNER' | 'HALF_H' | 'HALF_V' | 'QUARTER';
  rotation?: 0 | 90 | 180 | 270;
  chainId?: number | null;      // reserved for future wiring diagram tool
  chainOrder?: number | null;
  portId?: number | null;
}

export interface TileGrid {
  cols: number;
  rows: number;
  cells: TileCell[][];           // [row][col], row 0 = bottom of wall
}

export interface LEDScreen {
  uuid: string;
  id: string;
  productionId: string;
  name: string;
  sortOrder: number;             // 0–11, slot position
  processorUuid?: string | null; // → equipment_specs (LED_PROCESSOR)
  posDsXM?: number | null;       // room position X (for Layout canvas)
  posDsYM?: number | null;       // room position Y
  rotationDeg?: number | null;
  tileGrid?: TileGrid | null;    // assembled tile layout
  equipmentUuid?: string | null; // primary/dominant tile spec UUID
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isDeleted: boolean;
}

export interface LEDScreenInput {
  productionId: string;
  name: string;
  sortOrder?: number;
  processorUuid?: string | null;
  posDsXM?: number | null;
  posDsYM?: number | null;
  rotationDeg?: number | null;
  tileGrid?: TileGrid | null;
  equipmentUuid?: string | null;
  note?: string | null;
  version?: number;
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

export function useLEDScreenAPI() {
  const fetchLEDScreens = useCallback(async (productionId: string): Promise<LEDScreen[]> => {
    try {
      return await apiClient.get<LEDScreen[]>(`/led-screens/production/${productionId}`);
    } catch (error) {
      console.error('Error fetching led-screens:', error);
      throw error;
    }
  }, []);

  const createLEDScreen = useCallback(async (input: LEDScreenInput): Promise<LEDScreen> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: input.productionId,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
        processorUuid: input.processorUuid,
        posDsXM: input.posDsXM,
        posDsYM: input.posDsYM,
        rotationDeg: input.rotationDeg ?? 0,
        tileGrid: input.tileGrid,
        equipmentUuid: input.equipmentUuid,
        note: input.note,
        version: input.version,
        userId,
        userName
      };
      return await apiClient.post<LEDScreen>('/led-screens', requestData);
    } catch (error) {
      console.error('Error creating ledScreen:', error);
      throw error;
    }
  }, []);

  const updateLEDScreen = useCallback(async (
    id: string,
    updates: Partial<LEDScreenInput>
  ): Promise<LEDScreen | ConflictError> => {
    try {
      const { userId, userName } = getUserInfo();
      const requestData = {
        productionId: updates.productionId,
        name: updates.name,
        sortOrder: updates.sortOrder,
        processorUuid: updates.processorUuid,
        posDsXM: updates.posDsXM,
        posDsYM: updates.posDsYM,
        rotationDeg: updates.rotationDeg,
        tileGrid: updates.tileGrid,
        equipmentUuid: updates.equipmentUuid,
        note: updates.note,
        version: updates.version,
        userId,
        userName
      };
      return await apiClient.put<LEDScreen>(`/led-screens/${id}`, requestData);
    } catch (error: any) {
      if (error.response?.status === 409) {
        return error.response.data as ConflictError;
      }
      console.error('Error updating ledScreen:', error);
      throw error;
    }
  }, []);

  const deleteLEDScreen = useCallback(async (id: string): Promise<void> => {
    try {
      const { userId, userName } = getUserInfo();
      await apiClient.delete(`/led-screens/${id}`, {
        data: { userId, userName }
      });
    } catch (error) {
      console.error('Error deleting ledScreen:', error);
      throw error;
    }
  }, []);

  return {
    fetchLEDScreens,
    createLEDScreen,
    updateLEDScreen,
    deleteLEDScreen
  };
}
