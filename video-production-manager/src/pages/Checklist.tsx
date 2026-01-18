import React from 'react';
import { CheckSquare, Square, Clock, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/components/ui';
import { useProductionStore, useChecklistProgress } from '@/hooks/useStore';
import { cn } from '@/utils/helpers';

const categoryLabels: Record<string, string> = {
  'PRE_PRODUCTION': 'Pre-Production',
  'SCREENS': 'Screens',
  'SWITCH': 'Switch',
  'IMAG': 'IMAG',
  'MEDIA_SERVERS': 'Media Servers',
  'SOURCES': 'Sources',
  'DESTINATIONS': 'Destinations',
  'DISPLAYS': 'Displays',
  'OUTSIDE_VENDORS': 'Outside Vendors',
  'DOCUMENTATION': 'Documentation',
  'NOTES': 'Notes',
};

export const Checklist: React.FC = () => {
  const { checklist, toggleChecklistItem } = useProductionStore();
  const { total, completed, percentage } = useChecklistProgress();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [showCompleted, setShowCompleted] = React.useState(true);

  const categories = React.useMemo(() => {
    const cats = new Set(checklist.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [checklist]);

  const filteredChecklist = React.useMemo(() => {
    return checklist.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesCompleted = showCompleted || !item.completed;
      return matchesCategory && matchesCompleted;
    });
  }, [checklist, selectedCategory, showCompleted]);

  const groupedChecklist = React.useMemo(() => {
    const groups: Record<string, typeof checklist> = {};
    filteredChecklist.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredChecklist]);

  const getCategoryProgress = (category: string) => {
    const items = checklist.filter(item => item.category === category);
    const completedItems = items.filter(item => item.completed);
    return {
      total: items.length,
      completed: completedItems.length,
      percentage: items.length > 0 ? (completedItems.length / items.length) * 100 : 0,
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-av-text">Production Checklist</h2>
          <p className="text-sm text-av-text-muted">
            Track pre-production and setup tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              showCompleted
                ? 'bg-av-accent/20 text-av-accent'
                : 'bg-av-surface-light text-av-text-muted'
            )}
          >
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold text-av-text">Overall Progress</h3>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-av-accent" />
            <span className="text-av-accent">{completed}/{total}</span>
          </div>
        </div>
        <ProgressBar value={percentage} showPercentage={false} />
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-av-accent">{completed}</p>
            <p className="text-xs text-av-text-muted">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-av-warning">
              {checklist.filter(i => !i.completed && i.daysBeforeShow && i.daysBeforeShow <= 7).length}
            </p>
            <p className="text-xs text-av-text-muted">Due Soon</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-av-text-muted">{total - completed}</p>
            <p className="text-xs text-av-text-muted">Remaining</p>
          </div>
        </div>
      </Card>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => {
          const progress = cat !== 'all' ? getCategoryProgress(cat) : null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                selectedCategory === cat
                  ? 'bg-av-accent/20 text-av-accent border border-av-accent/30'
                  : 'bg-av-surface text-av-text-muted hover:text-av-text border border-av-border'
              )}
            >
              {cat === 'all' ? 'All Categories' : categoryLabels[cat] || cat}
              {progress && (
                <span className="text-xs opacity-70">
                  ({progress.completed}/{progress.total})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist Items */}
      <div className="space-y-6">
        {Object.entries(groupedChecklist).map(([category, items]) => (
          <Card key={category} className="overflow-hidden">
            <div className="px-4 py-3 bg-av-surface-light border-b border-av-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-av-text">
                {categoryLabels[category] || category}
              </h3>
              <div className="flex items-center gap-2">
                <ProgressBar 
                  value={getCategoryProgress(category).percentage} 
                  showPercentage={false}
                  className="w-24"
                />
                <span className="text-xs text-av-text-muted">
                  {getCategoryProgress(category).completed}/{getCategoryProgress(category).total}
                </span>
              </div>
            </div>
            <div className="divide-y divide-av-border">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 hover:bg-av-surface-light/50 transition-colors cursor-pointer animate-slide-up',
                    item.completed && 'opacity-60'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  <button className="flex-shrink-0">
                    {item.completed ? (
                      <CheckSquare className="w-5 h-5 text-av-accent" />
                    ) : (
                      <Square className="w-5 h-5 text-av-text-muted hover:text-av-accent transition-colors" />
                    )}
                  </button>
                  <span className={cn(
                    'flex-1 text-sm',
                    item.completed ? 'text-av-text-muted line-through' : 'text-av-text'
                  )}>
                    {item.item}
                  </span>
                  {item.daysBeforeShow && !item.completed && (
                    <Badge 
                      variant={item.daysBeforeShow <= 7 ? 'danger' : item.daysBeforeShow <= 14 ? 'warning' : 'default'}
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      {item.daysBeforeShow}d
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(groupedChecklist).length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-av-accent mx-auto mb-4" />
          <h3 className="text-lg font-medium text-av-text mb-2">All caught up!</h3>
          <p className="text-sm text-av-text-muted">
            {showCompleted ? 'No tasks in this category' : 'All tasks are completed'}
          </p>
        </Card>
      )}
    </div>
  );
};
