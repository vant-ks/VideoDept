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
import { useProjectStore } from '@/hooks/useProjectStore';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import { cn, formatResolution } from '@/utils/helpers';

export const Dashboard: React.FC = () => {
  // Use new stores
  const { activeProject } = useProjectStore();
  const { setActiveTab } = usePreferencesStore();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  
  const production = activeProject?.production || oldStore.production;
  const sources = activeProject?.sources || oldStore.sources;
  const sends = activeProject?.sends || oldStore.sends;
  const checklist = activeProject?.checklist || oldStore.checklist;
  const ledScreens = activeProject?.ledScreens || oldStore.ledScreens;
  
  const { total, completed, percentage } = useChecklistProgress();

  const sourcesByType = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    sources.forEach(s => {
      grouped[s.type] = (grouped[s.type] || 0) + 1;
    });
    return grouped;
  }, [sources]);

  // Separate counts for dashboard
  const computerCount = sources.filter(s => s.type === 'Computer').length;
  const serverCount = activeProject?.mediaServers?.length || oldStore.mediaServers.length;
  const cameraCount = activeProject?.cameras?.length || oldStore.cameras.length;

  const upcomingTasks = checklist
    .filter(item => !item.completed && item.daysBeforeShow && item.daysBeforeShow <= 14)
    .slice(0, 5);

  const recentlyCompleted = checklist
    .filter(item => item.completed)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  const calculateDueDate = (daysBeforeShow: number): string => {
    // Try new format first, fallback to old
    const loadInDate = production?.loadinDate || production?.loadIn;
    if (!loadInDate) return '';
    const dueDate = new Date(loadInDate);
    dueDate.setDate(dueDate.getDate() - daysBeforeShow);
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleTaskClick = (category: string) => {
    // Store the category to scroll to
    sessionStorage.setItem('scrollToCategory', category);
    // Switch to checklist tab
    setActiveTab('checklist');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Production Header */}
      {production && (
        <Card className="p-6 bg-gradient-to-r from-av-surface to-av-surface-light">
          <div className="flex items-center gap-6">
            {/* Show Info - 40% */}
            <div className="flex-[4]">
              <h2 className="text-2xl font-bold text-av-text mb-1">
                {production.showName}
              </h2>
              <p className="text-av-text-muted">
                {production.client} • {production.venue} • {production.room}
              </p>
            </div>
            
            {/* Dates - 20% */}
            <div className="flex-[2] flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-av-text-muted mb-1">Load In</p>
                <p className="text-av-accent">{production.loadinDate || production.loadIn}</p>
              </div>
              <div className="w-px h-8 bg-av-border" />
              <div className="text-center">
                <p className="text-av-text-muted mb-1">Load Out</p>
                <p className="text-av-accent">{production.loadoutDate || production.loadOut}</p>
              </div>
            </div>
            
            {/* Progress - 40% */}
            <div className="flex-[4]">
              <div className="mb-3">
                <ProgressBar value={percentage} showPercentage={false} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-av-accent">{completed}</p>
                  <p className="text-xs text-av-text-muted">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-av-warning">
                    {checklist.filter(i => !i.completed && i.daysBeforeShow && i.daysBeforeShow <= 7).length}
                  </p>
                  <p className="text-xs text-av-text-muted">Due Soon</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-av-text-muted">{total - completed}</p>
                  <p className="text-xs text-av-text-muted">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-av-accent">{Math.round(percentage)}%</p>
                  <p className="text-xs text-av-text-muted">Completion</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recently Completed Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-av-text">
                Recently Completed Tasks
              </h3>
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Last 5
              </Badge>
            </div>
            
            {recentlyCompleted.length > 0 ? (
              <div className="space-y-2">
                {recentlyCompleted.map((task, index) => {
                  const latestCompletion = task.completionNote && task.completionNote.length > 0
                    ? task.completionNote[task.completionNote.length - 1].text
                    : '';
                  const latestInfo = task.moreInfo && task.moreInfo.length > 0
                    ? task.moreInfo[task.moreInfo.length - 1].text
                    : '';
                  
                  return (
                  <div 
                    key={task.id}
                    className={cn(
                      'flex items-center gap-3 p-3 bg-av-surface-light rounded-lg hover:bg-av-surface-light/70 transition-colors cursor-pointer opacity-60',
                      'animate-slide-up',
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleTaskClick(task.category)}
                  >
                    {/* Item Description - 30% */}
                    <div className="text-sm text-av-text truncate" style={{ width: '30%' }}>
                      {task.item}
                    </div>
                    
                    {/* Completion Note - 55% */}
                    <div className="text-sm text-av-text-muted truncate" style={{ width: '55%' }}>
                      {latestCompletion || latestInfo}
                    </div>
                    
                    {/* Due Badge - 15% */}
                    <div className="flex justify-end" style={{ width: '15%' }}>
                      {task.daysBeforeShow && (
                        <Badge 
                          variant="default"
                          className="flex items-center gap-1 w-32 justify-center"
                        >
                          <Clock className="w-3 h-3" />
                          {task.daysBeforeShow}d
                          {production?.loadIn && (
                            <span className="ml-1 text-xs">({calculateDueDate(task.daysBeforeShow)})</span>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-av-text-muted text-center py-4">
                No completed tasks
              </p>
            )}
          </Card>

          {/* Upcoming Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-av-text">
                Upcoming Tasks
              </h3>
              <Badge variant="warning">
                <Clock className="w-3 h-3 mr-1" />
                Due within 14 days
              </Badge>
            </div>
            
            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map((task, index) => {
                  const latestInfo = task.moreInfo && task.moreInfo.length > 0
                    ? task.moreInfo[task.moreInfo.length - 1].text
                    : '';
                  
                  return (
                    <div 
                      key={task.id}
                      className={cn(
                        'flex items-center gap-3 p-3 bg-av-surface-light rounded-lg hover:bg-av-surface-light/70 transition-colors cursor-pointer',
                        'animate-slide-up',
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleTaskClick(task.category)}
                    >
                      {/* Item Description - 30% */}
                      <div className="text-sm text-av-text truncate" style={{ width: '30%' }}>
                        {task.item}
                      </div>
                      
                      {/* More Info - 55% */}
                      <div className="text-sm text-av-text-muted truncate" style={{ width: '55%' }}>
                        {latestInfo}
                      </div>
                      
                      {/* Due Badge - 15% */}
                      <div className="flex justify-end" style={{ width: '15%' }}>
                        {task.daysBeforeShow && (
                          <Badge 
                            variant={task.daysBeforeShow <= 7 ? 'danger' : task.daysBeforeShow <= 14 ? 'warning' : 'default'}
                            className="flex items-center gap-1 w-32 justify-center"
                          >
                            <Clock className="w-3 h-3" />
                            {task.daysBeforeShow}d
                            {production?.loadIn && (
                              <span className="ml-1 text-xs">({calculateDueDate(task.daysBeforeShow)})</span>
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
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
          {/* Sources */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-av-text mb-4">
              Sources
            </h3>
            
            {/* Device Counts */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-av-text-muted">Computers</span>
                <span className="text-lg font-semibold text-av-text">{computerCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-av-text-muted">Media Servers</span>
                <span className="text-lg font-semibold text-av-text">{serverCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-av-text-muted">Cameras</span>
                <span className="text-lg font-semibold text-av-text">{cameraCount}</span>
              </div>
            </div>

            {/* Output Connectors - Count all outputs from all sources */}
            <div className="border-t border-av-border pt-4">
              <h4 className="text-sm font-medium text-av-text-muted mb-3">Output Connectors</h4>
              <div className="flex flex-wrap gap-2">
                {['HDMI', 'SDI', 'DP', 'FIBER'].map(connector => {
                  // Count all outputs with this connector type across all sources
                  const count = sources.reduce((total, s) => {
                    return total + (s.outputs?.filter(o => o.connector === connector).length || 0);
                  }, 0);
                  return count > 0 ? (
                    <div key={connector} className="flex items-center gap-2">
                      <ConnectorBadge connector={connector} />
                      <span className="text-sm text-av-text-muted">×{count}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </Card>

          {/* LED Screen Info */}
          {ledScreens[0] && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-av-text mb-4">
                Main LED Screen
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Resolution</span>
                  <span className="text-av-text">
                    {formatResolution(ledScreens[0].pixels.width, ledScreens[0].pixels.height)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Total Pixels</span>
                  <span className="text-av-text">
                    {ledScreens[0].totalPixels.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Tile Model</span>
                  <span className="text-av-text text-right text-xs">
                    {ledScreens[0].tileModel}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-av-text-muted">Modules</span>
                  <span className="text-av-text">
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
              <h3 className="text-lg font-semibold text-av-text">
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
