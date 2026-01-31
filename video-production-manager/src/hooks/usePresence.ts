/**
 * Real-time presence tracking with Socket.io
 * Shows who is currently viewing/editing a production
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/services';
import { getCurrentUser, getUserColor, getUserInitials, type UserInfo } from '@/utils/userUtils';

interface ActiveUser extends UserInfo {
  lastSeen: number;
}

export function usePresence(productionId: string | undefined) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isCleaningUpRef = useRef(false);
  
  useEffect(() => {
    if (!productionId) {
      setActiveUsers([]);
      return;
    }
    
    isCleaningUpRef.current = false;
    
    // Connect to Socket.io (create new socket per mount)
    const wsUrl = apiClient.getWebSocketURL();
    console.log('🔌 Connecting to presence WebSocket...', wsUrl);
    
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socketRef.current = socket;
    
    const currentUser = getCurrentUser();
    
    socket.on('connect', () => {
      // Don't join if we're already cleaning up (React StrictMode)
      if (isCleaningUpRef.current) {
        console.log('🔌 Connected but cleaning up, not joining room');
        return;
      }
      
      console.log('🔌 Connected to WebSocket');
      setIsConnected(true);
      
      // Join production room
      socket.emit('production:join', {
        productionId,
        userId: currentUser.id,
        userName: currentUser.name
      });
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
      setIsConnected(false);
    });
    
    // Listen for presence updates
    socket.on('presence:update', (users: Array<{ userId: string; userName: string }>) => {
      const activeUsersList: ActiveUser[] = users.map(user => ({
        id: user.userId,
        name: user.userName,
        initials: getUserInitials(user.userName),
        color: getUserColor(user.userId),
        lastSeen: Date.now()
      }));
      
      setActiveUsers(activeUsersList);
      console.log(`👥 ${activeUsersList.length} user(s) active in production`);
    });
    
    // Listen for real-time changes from other users
    socket.on('production:change', ({ userId, userName, changeType, data }) => {
      if (userId !== currentUser.id) {
        console.log(`📝 ${userName} made a change: ${changeType}`);
        // You can add toast notifications here
        // toast.info(`${userName} ${getChangeMessage(changeType)}`);
      }
    });
    
    // Cleanup on unmount
    return () => {
      isCleaningUpRef.current = true;
      
      if (socketRef.current) {
        socketRef.current.emit('production:leave', { 
          productionId, 
          userId: currentUser.id 
        });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [productionId]);
  
  // Function to broadcast changes to other users
  const broadcastChange = (changeType: string, data: any) => {
    if (socketRef.current && productionId) {
      const currentUser = getCurrentUser();
      socketRef.current.emit('production:change', {
        productionId,
        userId: currentUser.id,
        changeType,
        data
      });
    }
  };
  
  return { activeUsers, isConnected, broadcastChange };
}

// Helper to generate user-friendly messages
function getChangeMessage(changeType: string): string {
  const messages: Record<string, string> = {
    'source:added': 'added a source',
    'source:updated': 'updated a source',
    'source:deleted': 'deleted a source',
    'send:added': 'added a send',
    'send:updated': 'updated a send',
    'send:deleted': 'deleted a send',
    'production:updated': 'updated production details',
  };
  return messages[changeType] || 'made a change';
}
