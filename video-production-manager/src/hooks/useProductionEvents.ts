import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

interface EntityEvent {
  entityType: 'source' | 'send' | 'camera' | 'ccu';
  entity?: any;
  entityId?: string;
  changes?: any;
  userId: string;
  userName: string;
}

interface UseProductionEventsOptions {
  productionId: string | undefined;
  onEntityCreated?: (event: EntityEvent) => void;
  onEntityUpdated?: (event: EntityEvent) => void;
  onEntityDeleted?: (event: EntityEvent) => void;
}

export function useProductionEvents(options: UseProductionEventsOptions) {
  const { productionId, onEntityCreated, onEntityUpdated, onEntityDeleted } = options;

  const connectSocket = useCallback(() => {
    if (!productionId) return;

    // Get API URL from environment or localStorage
    const apiUrl = localStorage.getItem('api_server_url') || 
                   import.meta.env.VITE_API_URL || 
                   'http://localhost:3010';

    // Create socket if it doesn't exist or if it's disconnected
    if (!socket || !socket.connected) {
      // Disconnect old socket if it exists
      if (socket) {
        socket.disconnect();
      }
      
      socket = io(apiUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('🔌 Connected to production events');
        
        // Join production room after connection
        const userId = localStorage.getItem('user_id') || 'anonymous';
        const userName = localStorage.getItem('user_name') || 'Anonymous';
        socket?.emit('production:join', { productionId, userId, userName });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from production events');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    } else {
      // Socket already connected, just join the room
      const userId = localStorage.getItem('user_id') || 'anonymous';
      const userName = localStorage.getItem('user_name') || 'Anonymous';
      socket.emit('production:join', { productionId, userId, userName });
    }

    // Set up event listeners
    if (onEntityCreated) {
      socket.on('entity:created', onEntityCreated);
    }
    if (onEntityUpdated) {
      socket.on('entity:updated', onEntityUpdated);
    }
    if (onEntityDeleted) {
      socket.on('entity:deleted', onEntityDeleted);
    }

    return () => {
      // Clean up listeners
      socket?.off('entity:created', onEntityCreated);
      socket?.off('entity:updated', onEntityUpdated);
      socket?.off('entity:deleted', onEntityDeleted);
      
      // Leave production room
      socket?.emit('production:leave', { productionId, userId });
    };
  }, [productionId, onEntityCreated, onEntityUpdated, onEntityDeleted]);

  useEffect(() => {
    const cleanup = connectSocket();
    return () => {
      cleanup?.();
    };
  }, [connectSocket]);

  return { socket };
}
