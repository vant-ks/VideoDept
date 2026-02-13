import { useState, useEffect } from 'react';
import LogService, { type LogEntry } from '@/services/logService';
import { Card } from '@/components/ui';
import { Clock, Filter, Download, Trash2, ChevronDown, ChevronRight, Search, Eye, EyeOff, X } from 'lucide-react';
import { cn } from '@/utils/helpers';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'settings' | 'equipment' | 'general' | 'debug'>('all');
  const [showDebug, setShowDebug] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  useEffect(() => {
    loadLogs();
  }, [filterCategory, searchQuery, showDebug]);

  const loadLogs = () => {
    let allLogs = filterCategory === 'all' 
      ? LogService.getLogs() 
      : LogService.getLogsByCategory(filterCategory);
    
    // Filter out debug logs unless showDebug is true
    if (!showDebug) {
      allLogs = allLogs.filter(log => log.category !== 'debug');
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allLogs = allLogs.filter(log => 
        log.details.toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query) ||
        log.entityName?.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      );
    }
    
    setLogs(allLogs);
  };

  const handleExport = () => {
    const date = new Date().toISOString().split('T')[0];
    
    if (exportFormat === 'json') {
      const json = LogService.exportLogs();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production-logs-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const csvHeader = 'Timestamp,Category,Action,Entity Type,Entity Name,Details\n';
      const csvRows = logs.map(log => {
        const timestamp = new Date(log.timestamp).toISOString();
        const details = log.details.replace(/"/g, '""'); // Escape quotes
        const entityName = (log.entityName || '').replace(/"/g, '""');
        return `"${timestamp}","${log.category}","${log.action}","${log.entityType}","${entityName}","${details}"`;
      }).join('\n');
      const csv = csvHeader + csvRows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production-logs-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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
      case 'debug': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
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
          <h1 className="text-3xl font-bold text-av-textPrimary">Activity Logs</h1>
        </div>
        
        <div className="flex gap-3">
          <div className="flex gap-2 items-center">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className="px-3 py-2 bg-av-cardBg border border-av-border rounded-lg text-black text-sm focus:outline-none focus:border-av-borderHover transition-colors"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-av-cardBg border border-av-border rounded-lg hover:border-av-borderHover transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-av-textSecondary" />
          
          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
            className="w-40 px-4 py-2 bg-av-cardBg border border-av-border rounded-lg text-black focus:outline-none focus:border-av-borderHover transition-colors"
          >
            <option value="all">All</option>
            <option value="settings">Settings</option>
            <option value="equipment">Equipment</option>
            <option value="general">General</option>
            <option value="debug">Debug</option>
          </select>
          
          {/* Search Box */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-10 py-2 bg-av-cardBg border border-av-border rounded-lg text-black placeholder:text-av-textSecondary focus:outline-none focus:border-av-borderHover transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-av-surface rounded transition-colors text-black/50 hover:text-black"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Debug Toggle - Eye Icon */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showDebug
                ? 'bg-av-accent text-white'
                : 'bg-av-surface hover:bg-av-surface-light text-av-text'
            )}
            title={showDebug ? 'Hide debug logs' : 'Show debug logs'}
          >
            {showDebug ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <span className="text-av-textSecondary ml-auto">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      <div className="overflow-y-auto space-y-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-av-textSecondary" />
            <p className="text-av-textSecondary">No log entries found</p>
          </div>
        ) : (
          logs.map(log => {
            const isExpanded = expandedLogs.has(log.id);
            const hasChanges = log.changes && log.changes.length > 0;

            return (
              <div key={log.id}>
                {/* Single line with all three sections: 25/60/15 split */}
                <div 
                  className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-av-surface/30 transition-colors"
                  onClick={() => hasChanges && toggleExpanded(log.id)}
                >
                  {/* Left: Tags and breadcrumb - 25% */}
                  <div className="flex items-center gap-2 flex-shrink-0" style={{ width: '25%' }}>
                    <span className={`px-2 py-1 text-xs rounded-md border ${getCategoryColor(log.category)}`}>
                      {log.category}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-md border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-av-text-muted truncate">
                      {log.entityType}
                      {log.entityName && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="font-medium">{log.entityName}</span>
                        </>
                      )}
                    </span>
                  </div>
                  
                  {/* Middle: Description - 60% */}
                  <p className="text-xs text-av-text min-w-0 truncate" style={{ width: '60%' }}>{log.details}</p>
                  
                  {/* Right: Timestamp and expand button - 15% */}
                  <div className="flex items-center gap-3 flex-shrink-0 justify-end" style={{ width: '15%' }}>
                    <div className="flex items-center gap-2 text-xs text-av-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                    
                    {hasChanges && (
                      <div className="text-av-text-muted">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Expanded changes */}
                {isExpanded && hasChanges && (
                  <div 
                    className="px-3 pb-2 space-y-1 pl-6 pt-2 bg-av-surface-light overflow-hidden transition-all duration-200 ease-in-out animate-in slide-in-from-top-2 fade-in"
                  >
                    {log.changes!.map((change, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium text-av-text">
                          {change.field}:
                        </span>
                        <span className="text-red-400 line-through ml-2">
                          {JSON.stringify(change.oldValue)}
                        </span>
                        <span className="text-av-text-muted mx-2">→</span>
                        <span className="text-green-400">
                          {JSON.stringify(change.newValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
