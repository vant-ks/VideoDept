import { useState, useEffect } from 'react';
import LogService, { type LogEntry } from '@/services/logService';
import { Card } from '@/components/ui';
import { Clock, Filter, Download, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'settings' | 'equipment' | 'general'>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, [filterCategory]);

  const loadLogs = () => {
    const allLogs = filterCategory === 'all' 
      ? LogService.getLogs() 
      : LogService.getLogsByCategory(filterCategory);
    setLogs(allLogs);
  };

  const handleExport = () => {
    const json = LogService.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      LogService.clearLogs();
      loadLogs();
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'settings': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'equipment': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'general': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'add': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'update': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'delete': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'reorder': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary mb-2">Activity Logs</h1>
          <p className="text-av-textSecondary">Track changes to settings and equipment</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-av-cardBg border border-av-border rounded-lg hover:border-av-borderHover transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-av-textSecondary" />
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterCategory === 'all'
                  ? 'bg-av-accent text-white'
                  : 'bg-av-cardBg border border-av-border hover:border-av-borderHover'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('settings')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterCategory === 'settings'
                  ? 'bg-av-accent text-white'
                  : 'bg-av-cardBg border border-av-border hover:border-av-borderHover'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setFilterCategory('equipment')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterCategory === 'equipment'
                  ? 'bg-av-accent text-white'
                  : 'bg-av-cardBg border border-av-border hover:border-av-borderHover'
              }`}
            >
              Equipment
            </button>
            <button
              onClick={() => setFilterCategory('general')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterCategory === 'general'
                  ? 'bg-av-accent text-white'
                  : 'bg-av-cardBg border border-av-border hover:border-av-borderHover'
              }`}
            >
              General
            </button>
          </div>
          <span className="text-av-textSecondary ml-auto">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </Card>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-av-textSecondary" />
            <p className="text-av-textSecondary">No log entries found</p>
          </Card>
        ) : (
          logs.map(log => {
            const isExpanded = expandedLogs.has(log.id);
            const hasChanges = log.changes && log.changes.length > 0;

            return (
              <Card key={log.id} className="p-4">
                <div className="flex items-start gap-4">
                  {hasChanges && (
                    <button
                      onClick={() => toggleExpanded(log.id)}
                      className="mt-1 text-av-textSecondary hover:text-av-textPrimary transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  {!hasChanges && <div className="w-5" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-md border ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-md border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm text-av-textSecondary">
                        {log.entityType}
                      </span>
                      {log.entityName && (
                        <>
                          <span className="text-av-textSecondary">·</span>
                          <span className="text-sm font-medium text-av-textPrimary">
                            {log.entityName}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <p className="text-av-textPrimary mb-2">{log.details}</p>
                    
                    {isExpanded && hasChanges && (
                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-av-border">
                        {log.changes!.map((change, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium text-av-textPrimary">
                              {change.field}:
                            </span>
                            <span className="text-red-400 line-through ml-2">
                              {JSON.stringify(change.oldValue)}
                            </span>
                            <span className="text-av-textSecondary mx-2">→</span>
                            <span className="text-green-400">
                              {JSON.stringify(change.newValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-av-textSecondary">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
