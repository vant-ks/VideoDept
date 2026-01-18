import React from 'react';
import { Plus, Search, Edit2, Trash2, Monitor, Radio } from 'lucide-react';
import { 
  Card, 
  Button, 
  ConnectorBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState
} from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { cn, formatResolution } from '@/utils/helpers';

export const Sends: React.FC = () => {
  const { sends, searchQuery, setSearchQuery } = useProductionStore();
  const [selectedType, setSelectedType] = React.useState<string>('all');

  const sendTypes = React.useMemo(() => {
    const types = new Set(sends.map(s => s.type));
    return ['all', ...Array.from(types)];
  }, [sends]);

  const filteredSends = React.useMemo(() => {
    return sends.filter(send => {
      const matchesSearch = searchQuery === '' || 
        send.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        send.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || send.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [sends, searchQuery, selectedType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MONITOR': return '🖥️';
      case 'ROUTER': return '🔀';
      case 'VIDEO SWITCH': return '📺';
      case 'LED PROCESSOR': return '💡';
      case 'PROJECTOR': return '📽️';
      case 'RECORD': return '⏺️';
      case 'STREAM': return '📡';
      default: return '📤';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-av-text">Sends / Destinations</h2>
          <p className="text-sm text-av-text-muted">
            Manage video outputs and destination devices
          </p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Send
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-av-text-muted" />
              <input
                type="text"
                placeholder="Search sends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sendTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  selectedType === type
                    ? 'bg-av-accent/20 text-av-accent border border-av-accent/30'
                    : 'bg-av-surface-light text-av-text-muted hover:text-av-text'
                )}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sends Table */}
      <Card className="overflow-hidden">
        {filteredSends.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSends.map((send, index) => (
                <TableRow 
                  key={send.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <span className="font-mono text-av-info">{send.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(send.type)}</span>
                      <span className="text-sm text-av-text-muted">{send.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-av-text">{send.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {formatResolution(send.hRes, send.vRes)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{send.rate}fps</span>
                  </TableCell>
                  <TableCell>
                    <ConnectorBadge connector={send.output} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-av-text-muted truncate max-w-[200px] block">
                      {send.note || send.secondaryDevice || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title="No sends found"
            description="Try adjusting your search or filters"
          />
        )}
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-av-info" />
            <div>
              <p className="text-sm text-av-text-muted">Screens</p>
              <p className="text-xl font-bold text-av-text">
                {sends.filter(s => s.type === 'VIDEO SWITCH').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Radio className="w-8 h-8 text-av-purple" />
            <div>
              <p className="text-sm text-av-text-muted">Router Feeds</p>
              <p className="text-xl font-bold text-av-text">
                {sends.filter(s => s.type === 'ROUTER').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖥️</span>
            <div>
              <p className="text-sm text-av-text-muted">Monitors</p>
              <p className="text-xl font-bold text-av-text">
                {sends.filter(s => s.type === 'MONITOR').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📤</span>
            <div>
              <p className="text-sm text-av-text-muted">Total Sends</p>
              <p className="text-xl font-bold text-av-text">{sends.length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
