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

  useEffect(() => {
    if (!productionId) return;

    // Get user info for joining/leaving production room
    const userId = localStorage.getItem('user_id') || 'anonymous';
    const userName = localStorage.getItem('user_name') || 'Anonymous';

    // Get API URL from environment or localStorage
    // WebSocket connects to root server URL, not /api path
    let apiUrl = localStorage.getItem('api_server_url') || 
                 import.meta.env.VITE_API_URL || 
                 'http://localhost:3010';
    
    // Remove /api suffix if present for WebSocket connection
    apiUrl = apiUrl.replace(/\/api\/?$/, '');

    // Create socket if it doesn't exist or if it's disconnected
    if (!socket || !socket.connected) {
      // Properly cleanup old socket first
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
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
        socket?.emit('production:join', { productionId, userId, userName });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from production events');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    } else {
      // Socket already connected, join immediately
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

    // Cleanup function
    return () => {
      // Clean up listeners
      socket?.off('entity:created', onEntityCreated);
      socket?.off('entity:updated', onEntityUpdated);
      socket?.off('entity:deleted', onEntityDeleted);
      
      // Leave production room
      socket?.emit('production:leave', { productionId, userId });
    };
  }, [productionId, onEntityCreated, onEntityUpdated, onEntityDeleted]);

  return { socket };
}
