import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton socket instance
let socket: Socket | null = null;
let connectionCount = 0;
let isInitialized = false;

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

// Shared state that persists across hook instances
const connectionState = {
  isConnected: false,
  status: 'disconnected' as ConnectionStatus,
  subscribers: new Set<(state: { isConnected: boolean; status: ConnectionStatus }) => void>(),
};

function notifySubscribers() {
  connectionState.subscribers.forEach(cb => cb({
    isConnected: connectionState.isConnected,
    status: connectionState.status
  }));
}

/**
 * Initialize socket connection (called once globally)
 */
function initializeSocket() {
  if (isInitialized) return;
  isInitialized = true;

  const apiUrl = localStorage.getItem('api_server_url') || 
                 import.meta.env.VITE_API_URL || 
                 'http://localhost:3010';
  const wsUrl = apiUrl.replace(/\/api\/?$/, '');

  console.log('🔌 Initializing WebSocket connection:', wsUrl);
  connectionState.status = 'connecting';
  notifySubscribers();

  socket = io(wsUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
    connectionState.isConnected = true;
    connectionState.status = 'connected';
    notifySubscribers();
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
    connectionState.isConnected = false;
    connectionState.status = 'disconnected';
    notifySubscribers();
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
    connectionState.isConnected = true;
    connectionState.status = 'connected';
    notifySubscribers();
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
    connectionState.status = 'reconnecting';
    notifySubscribers();
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ WebSocket reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ WebSocket reconnection failed');
    connectionState.status = 'disconnected';
    notifySubscribers();
  });

  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error);
    connectionState.status = 'disconnected';
    notifySubscribers();
  });
}

/**
 * Centralized WebSocket hook with connection management
 * Provides a single shared socket connection across the app
 */
export function useWebSocket(options: WebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, onConnect, onDisconnect, onReconnect } = options;
  
  const [isConnected, setIsConnected] = useState(connectionState.isConnected);
  const [status, setStatus] = useState<ConnectionStatus>(connectionState.status);
  const eventHandlersRef = useRef<Map<string, Function>>(new Map());
  const connectCallbacksRef = useRef({ onConnect, onDisconnect, onReconnect });

  // Update callback refs when they change
  useEffect(() => {
    connectCallbacksRef.current = { onConnect, onDisconnect, onReconnect };
  }, [onConnect, onDisconnect, onReconnect]);

  // Subscribe to connection state changes
  useEffect(() => {
    const updateState = (state: { isConnected: boolean; status: ConnectionStatus }) => {
      setIsConnected(state.isConnected);
      setStatus(state.status);
      
      // Call appropriate callback
      if (state.isConnected && connectCallbacksRef.current.onConnect) {
        connectCallbacksRef.current.onConnect();
      } else if (!state.isConnected && connectCallbacksRef.current.onDisconnect) {
        connectCallbacksRef.current.onDisconnect();
      }
    };

    connectionState.subscribers.add(updateState);
    
    return () => {
      connectionState.subscribers.delete(updateState);
    };
  }, []);

  const connect = useCallback(() => {
    if (!isInitialized) {
      initializeSocket();
    }
    connectionCount++;
  }, []);

  const disconnect = useCallback(() => {
    connectionCount--;
    
    // Only disconnect if no components are using the socket
    if (connectionCount <= 0) {
      console.log('🔌 Disconnecting WebSocket');
      socket?.disconnect();
      isInitialized = false;
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
    
    // Store handler reference
    const key = `${event}-${Date.now()}`;
    eventHandlersRef.current.set(key, handler);
    
    // Add listener
    socket.on(event, handler);

    // Return unsubscribe function
    return () => {
      console.log(`📡 Unsubscribing from event: ${event}`);
      socket?.off(event, handler);
      eventHandlersRef.current.delete(key);
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
  }, []); // Empty deps - connect/disconnect are stable

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
  const lastProductionIdRef = useRef<string>();

  useEffect(() => {
    if (!productionId || !isConnected) return;

    // Don't rejoin if already in this room
    if (hasJoinedRef.current && lastProductionIdRef.current === productionId) {
      return;
    }

    const userId = localStorage.getItem('user_id') || 'anonymous';
    const userName = localStorage.getItem('user_name') || 'Anonymous';

    console.log(`🚪 Joining production room: ${productionId}`);
    emit('production:join', { productionId, userId, userName });
    hasJoinedRef.current = true;
    lastProductionIdRef.current = productionId;

    return () => {
      console.log(`🚪 Leaving production room: ${productionId}`);
      emit('production:leave', { productionId, userId });
      hasJoinedRef.current = false;
      lastProductionIdRef.current = undefined;
    };
  }, [productionId, isConnected, emit]);
}
