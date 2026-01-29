import React from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Computers } from '@/pages/Computers';
import { Sends } from '@/pages/Sends';
import { IPManagement } from '@/pages/IPManagement';
import { Checklist } from '@/pages/Checklist';
import { ScalingCalculator } from '@/pages/Calculator';
import { Screens, VisionSwitcher } from '@/pages/OtherPages';
import { CamSwitcher } from '@/pages/CamSwitcher';
import Snakes from '@/pages/Snakes';
import Routers from '@/pages/Routers';
import Cameras from '@/pages/Cameras';
import Records from '@/pages/Records';
import Streams from '@/pages/Streams';
import MediaServers from '@/pages/MediaServers';
import CCUs from '@/pages/CCUs';
import Equipment from '@/pages/Equipment';
import Settings from '@/pages/Settings';
import Logs from '@/pages/Logs';
import { Projects } from '@/pages/Projects';
import { useProductionStore, initializeStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import LogService from '@/services/logService';

const App: React.FC = () => {
  const { activeTab: oldActiveTab, accentColor: oldAccentColor, theme: oldTheme } = useProductionStore();
  const { activeProjectId, loadProject } = useProjectStore();
  const { theme, accentColor, activeTab, lastOpenedProjectId } = usePreferencesStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Initialize app
  React.useEffect(() => {
    const initialize = async () => {
      LogService.logDebug('app', 'App initializing...');

      // Try to load last opened project
      if (lastOpenedProjectId) {
        try {
          await loadProject(lastOpenedProjectId);
        } catch (error) {
          console.error('Failed to load last project:', error);
        }
      }

      // Initialize old store for compatibility
      initializeStore();
      setIsInitializing(false);
    };

    initialize();
  }, []);

  // Apply theme attribute to html element
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || oldTheme);
  }, [theme, oldTheme]);

  // Apply accent color to CSS variables
  React.useEffect(() => {
    const currentAccent = accentColor || oldAccentColor;
    document.documentElement.style.setProperty('--accent-color', currentAccent);
    // Create lighter and darker variations
    const color = currentAccent.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    document.documentElement.style.setProperty('--accent-color-rgb', `${r} ${g} ${b}`);
    
    // Dim variant (darker)
    const dimR = Math.max(0, r - 30);
    const dimG = Math.max(0, g - 30);
    const dimB = Math.max(0, b - 30);
    document.documentElement.style.setProperty('--accent-dim-rgb', `${dimR} ${dimG} ${dimB}`);
  }, [accentColor, oldAccentColor]);

  // Show loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-av-background flex items-center justify-center">
        <div className="text-av-text-muted">Loading...</div>
      </div>
    );
  }

  // Show Projects dashboard if no active project
  if (!activeProjectId) {
    return <Projects />;
  }

  const renderPage = () => {
    const currentTab = activeTab || oldActiveTab;
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'computers':
        return <Computers />;
      case 'sends':
        return <Sends />;
      case 'led':
        return <Screens />;
      case 'projection':
        return <Screens />;
      case 'monitors':
        return <Screens />;
      case 'vision-switcher':
        return <VisionSwitcher />;
      case 'cam-switcher':
        return <CamSwitcher />;
      case 'network':
        return <IPManagement />;
      case 'checklist':
        return <Checklist />;
      case 'snakes':
        return <Snakes />;
      case 'routers':
        return <Routers />;
      case 'cameras':
        return <Cameras />;
      case 'media-servers':
        return <MediaServers />;
      case 'ccus':
        return <CCUs />;
      case 'equipment':
        return <Equipment />;
      case 'records':
        return <Records />;
      case 'streams':
        return <Streams />;
      case 'calculator':
        return <ScalingCalculator />;
      case 'settings':
        return <Settings />;
      case 'logs':
        return <Logs />;
      case 'projects':
        return <Projects />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
};

export default App;
