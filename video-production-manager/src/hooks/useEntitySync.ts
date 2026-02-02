import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import LogService from '@/services/logService';

/**
 * Generic entity sync hook
 * Subscribes to WebSocket updates for any entity type and handles auto-merge
 */

export interface EntitySyncOptions<T> {
  entityType: string; // e.g., 'camera', 'source', 'send', 'checklist-item'
  productionId?: string;
  currentData?: T | null;
  onUpdate: (updatedData: T) => void;
  enabled?: boolean;
}

export function useEntitySync<T extends { id: string; version?: number; lastModifiedBy?: string }>({
  entityType,
  productionId,
  currentData,
  onUpdate,
  enabled = true
}: EntitySyncOptions<T>) {
  const { subscribe, isConnected } = useWebSocket();
  const lastProcessedVersion = useRef<number | undefined>();

  useEffect(() => {
    if (!enabled || !productionId || !isConnected) return;

    const updateEvent = `${entityType}:updated`;
    const createEvent = `${entityType}:created`;
    const deleteEvent = `${entityType}:deleted`;

    LogService.logDebug('sync', `Subscribing to ${entityType} sync events for production ${productionId}`);

    // Subscribe to update events
    const unsubscribeUpdate = subscribe<T>(updateEvent, (incomingData) => {
      console.log(`📨 Received ${updateEvent}`, {
        id: incomingData.id,
        version: incomingData.version,
        lastModifiedBy: incomingData.lastModifiedBy
      });

      // Only process if this is new data
      if (!currentData || incomingData.id !== currentData.id) {
        LogService.logDebug('sync', `Ignoring ${updateEvent} - different entity`);
        return;
      }

      // Check version to prevent duplicate updates
      const currentVersion = currentData.version || 0;
      const incomingVersion = incomingData.version || 0;

      console.log(`📊 Version check for ${entityType}:`, {
        current: currentVersion,
        incoming: incomingVersion,
        lastProcessed: lastProcessedVersion.current
      });

      // Skip if we already processed this version
      if (lastProcessedVersion.current === incomingVersion) {
        console.log(`⏭️  Skipping ${entityType} update - already processed version ${incomingVersion}`);
        return;
      }

      // Skip if incoming version is not newer
      if (incomingVersion <= currentVersion) {
        console.log(`⏭️  Skipping ${entityType} update - version not newer (${incomingVersion} <= ${currentVersion})`);
        return;
      }

      // Apply update
      console.log(`🔀 Auto-merging ${entityType} update:`, {
        incomingVersion,
        lastModifiedBy: incomingData.lastModifiedBy
      });

      lastProcessedVersion.current = incomingVersion;
      onUpdate(incomingData);

      console.log(`✅ Auto-merged ${entityType} update`, {
        version: incomingVersion
      });
    });

    // Subscribe to create events (for list views)
    const unsubscribeCreate = subscribe<T>(createEvent, (newData) => {
      console.log(`📨 Received ${createEvent}`, { id: newData.id });
      // Handled by parent component typically
    });

    // Subscribe to delete events
    const unsubscribeDelete = subscribe<{ id: string }>(deleteEvent, (data) => {
      console.log(`📨 Received ${deleteEvent}`, { id: data.id });
      // Handled by parent component typically
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeCreate();
      unsubscribeDelete();
    };
  }, [entityType, productionId, currentData, onUpdate, enabled, isConnected, subscribe]);
}

/**
 * Hook specifically for checklist item sync
 */
export function useChecklistItemSync(
  productionId: string | undefined,
  currentItem: any | null,
  onUpdate: (item: any) => void
) {
  return useEntitySync({
    entityType: 'checklist-item',
    productionId,
    currentData: currentItem,
    onUpdate,
    enabled: !!productionId && !!currentItem
  });
}

/**
 * Hook specifically for camera sync
 */
export function useCameraSync(
  productionId: string | undefined,
  currentCamera: any | null,
  onUpdate: (camera: any) => void
) {
  return useEntitySync({
    entityType: 'camera',
    productionId,
    currentData: currentCamera,
    onUpdate,
    enabled: !!productionId && !!currentCamera
  });
}

/**
 * Hook specifically for source sync
 */
export function useSourceSync(
  productionId: string | undefined,
  currentSource: any | null,
  onUpdate: (source: any) => void
) {
  return useEntitySync({
    entityType: 'source',
    productionId,
    currentData: currentSource,
    onUpdate,
    enabled: !!productionId && !!currentSource
  });
}

/**
 * Hook specifically for send sync
 */
export function useSendSync(
  productionId: string | undefined,
  currentSend: any | null,
  onUpdate: (send: any) => void
) {
  return useEntitySync({
    entityType: 'send',
    productionId,
    currentData: currentSend,
    onUpdate,
    enabled: !!productionId && !!currentSend
  });
}

/**
 * Hook specifically for connection sync
 */
export function useConnectionSync(
  productionId: string | undefined,
  currentConnection: any | null,
  onUpdate: (connection: any) => void
) {
  return useEntitySync({
    entityType: 'connection',
    productionId,
    currentData: currentConnection,
    onUpdate,
    enabled: !!productionId && !!currentConnection
  });
}

/**
 * Hook specifically for CCU sync
 */
export function useCCUSync(
  productionId: string | undefined,
  currentCCU: any | null,
  onUpdate: (ccu: any) => void
) {
  return useEntitySync({
    entityType: 'ccu',
    productionId,
    currentData: currentCCU,
    onUpdate,
    enabled: !!productionId && !!currentCCU
  });
}

/**
 * Hook specifically for IP address sync
 */
export function useIPAddressSync(
  productionId: string | undefined,
  currentIP: any | null,
  onUpdate: (ip: any) => void
) {
  return useEntitySync({
    entityType: 'ip-address',
    productionId,
    currentData: currentIP,
    onUpdate,
    enabled: !!productionId && !!currentIP
  });
}
