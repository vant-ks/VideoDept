// @ts-nocheck
import React from 'react';
import { Plus, Search, Network, Edit2, Trash2, Copy, Check } from 'lucide-react';
import { 
  Card, 
  Button, 
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState
} from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { cn, getCategoryColor, sortIPAddresses } from '@/utils/helpers';

export const IPManagement: React.FC = () => {
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const ipAddresses = activeProject?.ipAddresses || oldStore.ipAddresses;
  const searchQuery = oldStore.searchQuery;
  const setSearchQuery = oldStore.setSearchQuery;
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [copiedIP, setCopiedIP] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const cats = new Set(ipAddresses.map(ip => ip.category));
    return ['all', ...Array.from(cats)];
  }, [ipAddresses]);

  const filteredIPs = React.useMemo(() => {
    const filtered = ipAddresses.filter(ip => {
      const matchesSearch = searchQuery === '' || 
        ip.ip.includes(searchQuery) ||
        ip.device.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || ip.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    return sortIPAddresses(filtered);
  }, [ipAddresses, searchQuery, selectedCategory]);

  const copyIP = async (ip: string) => {
    await navigator.clipboard.writeText(ip);
    setCopiedIP(ip);
    setTimeout(() => setCopiedIP(null), 2000);
  };

  // Group IPs by subnet for visualization
  const subnetGroups = React.useMemo(() => {
    const groups: Record<string, typeof ipAddresses> = {};
    filteredIPs.forEach(ip => {
      const subnet = ip.ip.split('.').slice(0, 3).join('.');
      if (!groups[subnet]) groups[subnet] = [];
      groups[subnet].push(ip as any);
    });
    return groups;
  }, [filteredIPs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-av-text">IP Management</h2>
          <p className="text-sm text-av-text-muted">
            Network configuration and IP address allocation
          </p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add IP Address
        </Button>
      </div>

      {/* Subnet Info Card */}
      <Card className="p-4 bg-gradient-to-r from-av-surface to-av-surface-light">
        <div className="flex items-center gap-4">
          <Network className="w-8 h-8 text-av-accent" />
          <div>
            <p className="text-sm text-av-text-muted">Network Subnet</p>
            <p className="text-lg text-av-text">192.168.0.0/24</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-av-text-muted">Allocated IPs</p>
            <p className="text-lg text-av-accent">{ipAddresses.length}</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-av-text-muted" />
              <input
                type="text"
                placeholder="Search by IP or device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  selectedCategory === cat
                    ? 'bg-av-accent/20 text-av-accent border border-av-accent/30'
                    : 'bg-av-surface-light text-av-text-muted hover:text-av-text'
                )}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* IP Table */}
      <Card className="overflow-hidden">
        {filteredIPs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIPs.map((ip, index) => (
                <TableRow 
                  key={ip.ip}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyIP(ip.ip)}
                        className="p-1 rounded hover:bg-av-surface-light transition-colors"
                        title="Copy IP"
                      >
                        {copiedIP === ip.ip ? (
                          <Check className="w-4 h-4 text-av-accent" />
                        ) : (
                          <Copy className="w-4 h-4 text-av-text-muted" />
                        )}
                      </button>
                      <span className="text-av-accent">{ip.ip}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-av-text">{(ip as any).device}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor((ip as any).category)}>
                      {(ip as any).category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-av-text-muted">
                      {(ip as any).notes || '—'}
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
            icon={<Network className="w-8 h-8" />}
            title="No IP addresses found"
            description="Try adjusting your search or add a new IP"
          />
        )}
      </Card>

      {/* Category Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(
          ipAddresses.reduce((acc, ip) => {
            acc[ip.category] = (acc[ip.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([category, count]) => (
          <Card key={category} className="p-3">
            <Badge className={cn('mb-2', getCategoryColor(category))}>
              {category}
            </Badge>
            <p className="text-xl font-bold text-av-text">{count}</p>
            <p className="text-xs text-av-text-muted">devices</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
