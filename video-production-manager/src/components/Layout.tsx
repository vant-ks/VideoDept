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
  Box,
  FolderOpen,
  LogOut,
  Radio
} from 'lucide-react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import { cn } from '@/utils/helpers';
import { Logo } from './Logo';
import { PresenceIndicator } from './PresenceIndicator';
import { ConnectionStatusIndicator, OfflineWarning } from './ConnectionStatusIndicator';

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
      { id: 'streams', label: 'Streams', icon: Radio },
    ]
  },
  { 
    id: 'signal-flow', 
    label: 'Signal Flow', 
    icon: Workflow,
    children: [
      { id: 'vision-switcher', label: 'Vision Switcher', icon: Tv2 },
      { id: 'cam-switcher', label: 'Cam Switcher', icon: Tv2 },
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
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]);
  
  // Use new stores
  const { activeProject } = useProjectStore();
  const { 
    activeTab, 
    setActiveTab, 
    sidebarCollapsed, 
    setSidebarCollapsed 
  } = usePreferencesStore();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  const production = activeProject?.production || oldStore.production;
  const sidebarOpen = !sidebarCollapsed;
  const setSidebarOpen = (open: boolean) => setSidebarCollapsed(!open);

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
        {/* Logo and Current Show */}
        <div className="border-b border-av-border">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4">
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

          {/* Current Show Info */}
          {production && sidebarOpen && (
            <div className="px-4 pb-4 space-y-3">
              <div className="bg-gradient-to-r from-av-surface-light to-av-surface p-3 rounded-lg border border-av-border">
                <h3 className="text-sm font-bold text-av-text mb-1 truncate">{production.showName}</h3>
                <p className="text-xs text-av-text-muted truncate">{production.client}</p>
              </div>
              
              {/* Active Users Presence Indicator */}
              <PresenceIndicator 
                productionId={activeProject?.production?.id}
                className="w-full"
              />
              
              {/* Connection Status */}
              <ConnectionStatusIndicator 
                showLabel={true}
                className="w-full justify-center"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Settings */}
        <div className="px-2 py-4 border-t border-av-border space-y-1">
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
          
          {/* Close Project Button */}
          {activeProject && (
            <button
              onClick={() => {
                const { closeProject } = useProjectStore.getState();
                closeProject();
                setActiveTab('dashboard');
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                'text-av-text-muted hover:text-av-text hover:bg-av-surface-light',
                !sidebarOpen && 'justify-center'
              )}
              title="Close Project"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Close Project</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 overflow-y-auto transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-16'
      )}>
        {/* Offline Warning Banner */}
        <OfflineWarning />
        
        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
