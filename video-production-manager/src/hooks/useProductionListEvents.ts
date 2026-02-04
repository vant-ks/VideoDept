import { useEffect } from 'react';
import { io as ioClient, Socket } from 'socket.io-client';

// WebSocket connects to the root server URL, not the /api path
const getWebSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010/api';
  // Remove /api suffix if present for WebSocket connection
  return apiUrl.replace(/\/api\/?$/, '');
};

const WS_URL = getWebSocketUrl();

// Singleton socket instance
let socket: Socket | null = null;

interface ProductionListEventsOptions {
  onProductionCreated?: (production: any) => void;
  onProductionUpdated?: (production: any) => void;
  onProductionDeleted?: (productionId: string) => void;
}

/**
 * Hook to subscribe to production-level events (CREATE/UPDATE/DELETE)
 * Use this on the Projects/Shows list page to show new productions in real-time
 */
export const useProductionListEvents = (options: ProductionListEventsOptions) => {
  const { onProductionCreated, onProductionUpdated, onProductionDeleted } = options;

  useEffect(() => {
    // Get user info from localStorage
    const userId = localStorage.getItem('user_id') || 'anonymous';
    const userName = localStorage.getItem('user_name') || 'Anonymous User';

    // Create socket if it doesn't exist or if it's disconnected
    if (!socket || !socket.connected) {
      // Disconnect old socket if it exists
      if (socket) {
        socket.disconnect();
      }
      
      console.log('🔌 Connecting to WebSocket for production list...', WS_URL);
      socket = ioClient(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('🔌 Connected to WebSocket (production list)');
        // Join room after connection
        socket?.emit('production-list:join', { userId, userName });
        console.log('📋 Joined production list room');
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket (production list)');
      });
    } else {
      // Socket already connected, join immediately
      socket.emit('production-list:join', { userId, userName });
      console.log('📋 Joined production list room');
    }

    // Set up event listeners
    const handleProductionCreated = (event: any) => {
      console.log('🔔 Production created:', event);
      if (onProductionCreated) {
        onProductionCreated(event.production);
      }
    };

    const handleProductionUpdated = (event: any) => {
      console.log('🔔 Production updated:', event);
      if (onProductionUpdated) {
        onProductionUpdated(event.production);
      }
    };

    const handleProductionDeleted = (event: any) => {
      console.log('🔔 Production deleted:', event);
      if (onProductionDeleted) {
        onProductionDeleted(event.productionId);
      }
    };

    socket.on('production:created', handleProductionCreated);
    socket.on('production:updated', handleProductionUpdated);
    socket.on('production:deleted', handleProductionDeleted);

    // Cleanup
    return () => {
      console.log('📋 Leaving production list room');
      socket?.emit('production-list:leave', { userId });
      socket?.off('production:created', handleProductionCreated);
      socket?.off('production:updated', handleProductionUpdated);
      socket?.off('production:deleted', handleProductionDeleted);
    };
  }, [onProductionCreated, onProductionUpdated, onProductionDeleted]);
};
