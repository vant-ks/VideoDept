import React from 'react';
import { 
  MonitorPlay, 
  Send, 
  Projector, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { Card, StatCard, ProgressBar, Badge, ConnectorBadge } from '@/components/ui';
import { useProductionStore, useChecklistProgress } from '@/hooks/useStore';
import { cn, formatResolution } from '@/utils/helpers';

export const Dashboard: React.FC = () => {
  const { production, sources, sends, checklist, ledScreens } = useProductionStore();
  const { total, completed, percentage } = useChecklistProgress();

  const sourcesByType = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    sources.forEach(s => {
      grouped[s.type] = (grouped[s.type] || 0) + 1;
    });
    return grouped;
  }, [sources]);

  const upcomingTasks = checklist
    .filter(item => !item.completed && item.daysBeforeShow && item.daysBeforeShow <= 14)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Production Header */}
      {production && (
        <Card className="p-6 bg-gradient-to-r from-av-surface to-av-surface-light">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-av-text mb-1">
                {production.showName}
              </h2>
              <p className="text-av-text-muted">
                {production.client} • {production.venue} • {production.room}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-av-text-muted mb-1">Load In</p>
                <p className="text-av-accent">{production.loadIn}</p>
              </div>
              <div className="w-px h-8 bg-av-border" />
              <div className="text-center">
                <p className="text-av-text-muted mb-1">Load Out</p>
                <p className="text-av-accent">{production.loadOut}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sources"
          value={sources.length}
          icon={<MonitorPlay className="w-5 h-5" />}
        />
        <StatCard
          label="Total Sends"
          value={sends.length}
          icon={<Send className="w-5 h-5" />}
        />
        <StatCard
          label="LED Screens"
          value={ledScreens.length}
          icon={<Projector className="w-5 h-5" />}
        />
        <StatCard
          label="Tasks Complete"
          value={`${completed}/${total}`}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist Progress */}
          <Card className="p-6">
            <h3 className="text-lg font-display font-semibold text-av-text mb-4">
              Production Progress
            </h3>
            <ProgressBar value={percentage} label="Overall Completion" />
            
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-av-surface-light rounded-lg">
                <p className="text-2xl font-bold text-av-accent">{completed}</p>
                <p className="text-xs text-av-text-muted">Completed</p>
              </div>
              <div className="text-center p-3 bg-av-surface-light rounded-lg">
                <p className="text-2xl font-bold text-av-warning">
                  {checklist.filter(i => !i.completed && i.daysBeforeShow && i.daysBeforeShow <= 7).length}
                </p>
                <p className="text-xs text-av-text-muted">Due Soon</p>
              </div>
              <div className="text-center p-3 bg-av-surface-light rounded-lg">
                <p className="text-2xl font-bold text-av-text-muted">{total - completed}</p>
                <p className="text-xs text-av-text-muted">Remaining</p>
              </div>
            </div>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-semibold text-av-text">
                Upcoming Tasks
              </h3>
              <Badge variant="warning">
                <Clock className="w-3 h-3 mr-1" />
                Due within 14 days
              </Badge>
            </div>
            
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task, index) => (
                  <div 
                    key={task.id}
                    className={cn(
                      'flex items-center justify-between p-3 bg-av-surface-light rounded-lg',
                      'animate-slide-up',
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-av-warning" />
                      <span className="text-sm text-av-text">{task.item}</span>
                    </div>
                    <Badge variant="warning">{task.daysBeforeShow} days</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-av-text-muted text-center py-4">
                No urgent tasks
              </p>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Sources by Type */}
          <Card className="p-6">
            <h3 className="text-lg font-display font-semibold text-av-text mb-4">
              Sources by Type
            </h3>
            <div className="space-y-3">
              {Object.entries(sourcesByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-av-text-muted">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-av-surface-light rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-av-accent rounded-full"
                        style={{ width: `${(count / sources.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-av-text w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Signal Types */}
          <Card className="p-6">
            <h3 className="text-lg font-display font-semibold text-av-text mb-4">
              Signal Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {['HDMI', 'SDI', 'DP', 'FIBER'].map(connector => {
                const count = sources.filter(s => s.outputs?.some(o => o.connector === connector)).length;
                return (
                  <div key={connector} className="flex items-center gap-2">
                    <ConnectorBadge connector={connector} />
                    <span className="text-sm text-av-text-muted">×{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* LED Screen Info */}
          {ledScreens[0] && (
            <Card className="p-6">
              <h3 className="text-lg font-display font-semibold text-av-text mb-4">
                Main LED Screen
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Resolution</span>
                  <span className="font-mono text-av-text">
                    {formatResolution(ledScreens[0].pixels.width, ledScreens[0].pixels.height)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Total Pixels</span>
                  <span className="font-mono text-av-text">
                    {ledScreens[0].totalPixels.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Tile Model</span>
                  <span className="font-mono text-av-text text-right text-xs">
                    {ledScreens[0].tileModel}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Modules</span>
                  <span className="font-mono text-av-text">
                    {ledScreens[0].totalModules.full} full
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* System Status */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-av-accent" />
              <h3 className="text-lg font-display font-semibold text-av-text">
                System Status
              </h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Data Loaded', status: true },
                { label: 'All Sources Defined', status: sources.length > 0 },
                { label: 'All Sends Defined', status: sends.length > 0 },
                { label: 'LED Config Complete', status: ledScreens.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-av-text-muted">{item.label}</span>
                  <span className={cn(
                    'signal-indicator',
                    item.status ? 'signal-active' : 'signal-inactive'
                  )} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
