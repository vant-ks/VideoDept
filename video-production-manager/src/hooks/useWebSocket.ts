import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton socket instance
let socket: Socket | null = null;
let connectionCount = 0;

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

interface WebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  status: ConnectionStatus;
  subscribe: <T = any>(event: string, handler: (data: T) => void) => () => void;
  emit: (event: string, data?: any) => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Centralized WebSocket hook with connection management
 * Provides a single shared socket connection across the app
 */
export function useWebSocket(options: WebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, onConnect, onDisconnect, onReconnect } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const eventHandlersRef = useRef<Map<string, Function>>(new Map());

  const getWebSocketUrl = useCallback(() => {
    const apiUrl = localStorage.getItem('api_server_url') || 
                   import.meta.env.VITE_API_URL || 
                   'http://localhost:3010';
    // Remove /api suffix if present for WebSocket connection
    return apiUrl.replace(/\/api\/?$/, '');
  }, []);

  const connect = useCallback(() => {
    if (socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    setStatus('connecting');

    if (!socket) {
      socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setStatus('connected');
        onConnect?.();
        
        // Re-subscribe to all events after reconnection
        eventHandlersRef.current.forEach((handler, event) => {
          socket?.on(event, handler as any);
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setIsConnected(false);
        setStatus('disconnected');
        onDisconnect?.();
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
        setStatus('connected');
        onReconnect?.();
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
        setStatus('reconnecting');
      });

      socket.on('reconnect_error', (error) => {
        console.error('❌ WebSocket reconnection error:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed');
        setStatus('disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setStatus('disconnected');
      });
    } else {
      socket.connect();
    }

    connectionCount++;
  }, [getWebSocketUrl, onConnect, onDisconnect, onReconnect]);

  const disconnect = useCallback(() => {
    connectionCount--;
    
    // Only disconnect if no components are using the socket
    if (connectionCount <= 0) {
      console.log('🔌 Disconnecting WebSocket');
      socket?.disconnect();
      connectionCount = 0;
    }
  }, []);

  /**
   * Subscribe to a WebSocket event
   * Returns unsubscribe function
   */
  const subscribe = useCallback(<T = any>(event: string, handler: (data: T) => void) => {
    if (!socket) {
      console.warn('Cannot subscribe - socket not initialized');
      return () => {};
    }

    console.log(`📡 Subscribing to event: ${event}`);
    
    // Store handler reference for reconnection
    eventHandlersRef.current.set(event, handler);
    
    // Add listener
    socket.on(event, handler);

    // Return unsubscribe function
    return () => {
      console.log(`📡 Unsubscribing from event: ${event}`);
      socket?.off(event, handler);
      eventHandlersRef.current.delete(event);
    };
  }, []);

  /**
   * Emit a WebSocket event
   */
  const emit = useCallback((event: string, data?: any) => {
    if (!socket?.connected) {
      console.warn('Cannot emit - socket not connected');
      return;
    }

    console.log(`📤 Emitting event: ${event}`, data);
    socket.emit(event, data);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket,
    isConnected,
    status,
    subscribe,
    emit,
    connect,
    disconnect,
  };
}

/**
 * Hook for joining a specific production room
 */
export function useProductionRoom(productionId: string | undefined) {
  const { isConnected, emit } = useWebSocket();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!productionId || !isConnected || hasJoinedRef.current) return;

    const userId = localStorage.getItem('user_id') || 'anonymous';
    const userName = localStorage.getItem('user_name') || 'Anonymous';

    console.log(`🚪 Joining production room: ${productionId}`);
    emit('production:join', { productionId, userId, userName });
    hasJoinedRef.current = true;

    return () => {
      console.log(`🚪 Leaving production room: ${productionId}`);
      emit('production:leave', { productionId, userId });
      hasJoinedRef.current = false;
    };
  }, [productionId, isConnected, emit]);
}
