import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="card p-12 text-center">
      <Icon className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-av-text mb-2">{title}</h3>
      <p className="text-av-text-muted mb-4">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};
