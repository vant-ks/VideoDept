/**
 * Active Users Presence Indicator
 * Shows who is currently viewing/editing in real-time (Google Docs style)
 */

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePresence } from '@/hooks/usePresence';

interface PresenceIndicatorProps {
  productionId?: string;
  className?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  productionId,
  className
}) => {
  const { activeUsers, isConnected } = usePresence(productionId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (activeUsers.length === 0) {
    return null;
  }

  const displayUsers = activeUsers.slice(0, 3);
  const overflowCount = Math.max(0, activeUsers.length - 3);

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 px-3 py-2 bg-av-surface border border-av-border rounded-lg',
        className
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Users Icon */}
      <Users className="w-4 h-4 text-av-text-muted flex-shrink-0" />

      {/* Avatar Stack */}
      <div className="flex items-center -space-x-2">
        {displayUsers.map((user, index) => (
          <div
            key={user.id}
            className="relative group"
            style={{ zIndex: displayUsers.length - index }}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-av-background flex items-center justify-center text-xs font-semibold text-white shadow-sm transition-transform hover:scale-110 hover:z-50"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.initials}
            </div>
          </div>
        ))}
        
        {overflowCount > 0 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-av-background bg-av-surface-light flex items-center justify-center text-xs font-semibold text-av-text-muted"
            title={`${overflowCount} more user${overflowCount > 1 ? 's' : ''}`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      {/* Count Text */}
      <span className="text-xs text-av-text-muted">
        {activeUsers.length} active
      </span>

      {/* Expanded Tooltip */}
      {isExpanded && activeUsers.length > 1 && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-av-surface border border-av-border rounded-lg shadow-xl z-50 min-w-[200px]">
          <div className="text-xs font-semibold text-av-text mb-2">
            Active in this show
          </div>
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.initials}
                </div>
                <span className="text-sm text-av-text">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
