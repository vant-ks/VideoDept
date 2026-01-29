import React from 'react';
import { cn, getConnectorBgColor } from '@/utils/helpers';

// Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  className, 
  hover = false, 
  children, 
  ...props 
}) => (
  <div 
    className={cn(hover ? 'card-hover' : 'card', className)} 
    {...props}
  >
    {children}
  </div>
);

// Badge Component
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'sdi' | 'hdmi' | 'dp' | 'fiber' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}) => {
  const variants: Record<string, string> = {
    default: 'bg-av-surface-light text-av-text-muted border border-av-border',
    sdi: 'badge-sdi',
    hdmi: 'badge-hdmi',
    dp: 'badge-dp',
    fiber: 'badge-fiber',
    success: 'bg-av-accent/20 text-av-accent border border-av-accent/30',
    warning: 'bg-av-warning/20 text-av-warning border border-av-warning/30',
    danger: 'bg-av-danger/20 text-av-danger border border-av-danger/30',
  };

  return (
    <span className={cn('badge', variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

// Connector Badge (auto-colored based on connector type)
interface ConnectorBadgeProps {
  connector: string;
  className?: string;
}

export const ConnectorBadge: React.FC<ConnectorBadgeProps> = ({ 
  connector, 
  className 
}) => (
  <span className={cn('badge border', getConnectorBgColor(connector), className)}>
    {connector}
  </span>
);

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  className, 
  children, 
  ...props 
}) => {
  const variants: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn bg-av-danger/20 text-av-danger border border-av-danger/30 hover:bg-av-danger/30',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button 
      className={cn(variants[variant], sizes[size], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  className, 
  ...props 
}) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-av-text-muted">
        {label}
      </label>
    )}
    <input 
      className={cn('input-field w-full', error && 'border-av-danger', className)} 
      {...props} 
    />
    {error && (
      <p className="text-sm text-av-danger">{error}</p>
    )}
  </div>
);

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  options, 
  className, 
  ...props 
}) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-av-text-muted">
        {label}
      </label>
    )}
    <select className={cn('input-field w-full', className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Progress Bar
interface ProgressBarProps {
  value?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  variant?: 'default' | 'indeterminate';
  progress?: number; // Alias for value for backward compatibility
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  progress,
  max = 100, 
  label,
  showPercentage = true,
  className,
  variant = 'default'
}) => {
  const actualValue = progress ?? value ?? 0;
  const percentage = Math.min((actualValue / max) * 100, 100);
  
  if (variant === 'indeterminate') {
    return (
      <div className={cn('space-y-1', className)}>
        {label && (
          <div className="flex justify-between text-sm">
            <span className="text-av-text-muted">{label}</span>
          </div>
        )}
        <div className="h-2 bg-av-surface-light rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-av-accent to-av-info rounded-full absolute"
            style={{ 
              width: '30%',
              animation: 'progress-slide 1.5s ease-in-out infinite'
            }}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-av-text-muted">{label}</span>}
          {showPercentage && (
            <span className="text-av-accent">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-av-surface-light rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-av-accent to-av-info rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Signal Indicator
interface SignalIndicatorProps {
  active?: boolean;
  className?: string;
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({ 
  active = false, 
  className 
}) => (
  <span className={cn(
    active ? 'signal-active' : 'signal-inactive',
    className
  )} />
);

// Stat Card
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon,
  trend,
  className 
}) => (
  <Card className={cn('p-4', className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-av-text-muted mb-1">{label}</p>
        <p className="text-2xl font-bold text-av-text">{value}</p>
        {trend && (
          <p className={cn(
            'text-xs mt-1',
            trend.value >= 0 ? 'text-av-accent' : 'text-av-danger'
          )}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
      {icon && (
        <div className="text-av-text-muted">{icon}</div>
      )}
    </div>
  </Card>
);

// Table Components
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table: React.FC<TableProps> = ({ className, children, ...props }) => (
  <div className="overflow-x-auto">
    <table className={cn('w-full', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ 
  children, 
  ...props 
}) => (
  <thead {...props}>{children}</thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ 
  children, 
  ...props 
}) => (
  <tbody {...props}>{children}</tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ 
  className, 
  children, 
  ...props 
}) => (
  <tr className={cn('table-row', className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ 
  className, 
  children, 
  ...props 
}) => (
  <th className={cn('table-header text-left', className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ 
  className, 
  children, 
  ...props 
}) => (
  <td className={cn('table-cell', className)} {...props}>
    {children}
  </td>
);

// Export EmptyState component
export { EmptyState } from '../EmptyState';
