import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/utils/helpers';

interface ConnectionStatusIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  showLabel = true,
  className 
}) => {
  const { status, isConnected } = useWebSocket();

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      label: 'Connected',
      description: 'Real-time sync active',
      pulse: false,
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      label: 'Disconnected',
      description: 'No connection - changes not syncing',
      pulse: false,
    },
    connecting: {
      icon: RefreshCw,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      label: 'Connecting',
      description: 'Establishing connection...',
      pulse: true,
    },
    reconnecting: {
      icon: RefreshCw,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      label: 'Reconnecting',
      description: 'Attempting to reconnect...',
      pulse: true,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div 
      className={cn("flex items-center gap-2 group relative", className)}
      title={config.description}
    >
      {/* Status indicator with icon */}
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all",
        config.bgColor,
        config.color
      )}>
        <Icon 
          className={cn(
            "w-4 h-4",
            config.pulse && "animate-spin"
          )} 
        />
        {showLabel && (
          <span className="text-xs font-medium">
            {config.label}
          </span>
        )}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-av-gray-700 border border-av-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <p className="text-xs text-av-text-primary">{config.description}</p>
      </div>
    </div>
  );
};

// Prominent banner for offline state
export const OfflineWarning: React.FC = () => {
  const { isConnected, status } = useWebSocket();

  // Only show when actually disconnected (not during initial connection or reconnecting)
  const showWarning = !isConnected && status === 'disconnected';

  if (!showWarning) return null;

  return (
    <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2">
      <div className="flex items-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            You are offline
          </p>
          <p className="text-xs text-red-300/80">
            Changes will not be synced until connection is restored
          </p>
        </div>
      </div>
    </div>
  );
};
