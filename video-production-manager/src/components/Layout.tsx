import React from 'react';
import { 
  LayoutDashboard, 
  MonitorPlay, 
  Send, 
  Projector, 
  Network, 
  CheckSquare, 
  Cable, 
  Calculator,
  Settings,
  Menu,
  X,
  Tv2,
  ChevronDown,
  ChevronRight,
  Workflow,
  Share2,
  Video,
  Circle,
  Wrench,
  ScrollText,
  Server,
  Box
} from 'lucide-react';
import { useProductionStore } from '@/hooks/useStore';
import { cn } from '@/utils/helpers';
import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { 
    id: 'sources', 
    label: 'Sources', 
    icon: MonitorPlay,
    children: [
      { id: 'computers', label: 'Computers', icon: MonitorPlay },
      { id: 'media-servers', label: 'Media Servers', icon: Server },
      { id: 'ccus', label: 'CCUs', icon: Box },
      { id: 'cameras', label: 'Cameras', icon: Video },
    ]
  },
  { 
    id: 'sends', 
    label: 'Sends', 
    icon: Send,
    children: [
      { id: 'led', label: 'LED', icon: Projector },
      { id: 'projection', label: 'Projection', icon: Projector },
      { id: 'monitors', label: 'Monitors', icon: Tv2 },
      { id: 'records', label: 'Records', icon: Circle },
    ]
  },
  { 
    id: 'signal-flow', 
    label: 'Signal Flow', 
    icon: Workflow,
    children: [
      { id: 'switchers', label: 'Switchers', icon: Tv2 },
      { id: 'routers', label: 'Routers', icon: Share2 },
      { id: 'snakes', label: 'Snakes', icon: Cable },
    ]
  },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
  { id: 'network', label: 'IP Management', icon: Network },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'logs', label: 'Activity Logs', icon: ScrollText },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]);
  const { activeTab, setActiveTab, production } = useProductionStore();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isExpanded = expandedSections.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            } else {
              setActiveTab(item.id);
            }
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
            depth > 0 && 'ml-4',
            isActive 
              ? 'bg-av-accent/10 text-av-accent border-l-2 border-av-accent' 
              : 'text-av-text-muted hover:text-av-text hover:bg-av-surface-light',
            !sidebarOpen && 'justify-center'
          )}
        >
          <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-av-accent')} />
          {sidebarOpen && (
            <>
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              {hasChildren && (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </>
          )}
        </button>
        
        {hasChildren && isExpanded && sidebarOpen && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-av-surface border-r border-av-border transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-av-border">
          {sidebarOpen && (
            <Logo size={32} showText={true} />
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Settings */}
        <div className="px-2 py-4 border-t border-av-border">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
              activeTab === 'settings'
                ? 'bg-av-accent/10 text-av-accent'
                : 'text-av-text-muted hover:text-av-text hover:bg-av-surface-light',
              !sidebarOpen && 'justify-center'
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 overflow-y-auto transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-16'
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-av-bg/80 backdrop-blur-md border-b border-av-border">
          {production ? (
            <div>
              <p className="text-xs text-av-text-muted uppercase tracking-wider">Current Show</p>
              <p className="text-lg font-display font-bold text-av-text">{production.showName}</p>
              <p className="text-xs text-av-text-muted">{production.client}</p>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-display font-bold text-av-text capitalize">
                {activeTab === 'dashboard' ? 'Production Dashboard' : activeTab}
              </h1>
            </div>
          )}
          <div className="flex items-center gap-4">
            {/* Reserved space for future user account menu */}
            <div className="w-10 h-10">
              {/* User menu will go here */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
