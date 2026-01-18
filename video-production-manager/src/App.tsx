import React from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Computers } from '@/pages/Computers';
import { Sends } from '@/pages/Sends';
import { IPManagement } from '@/pages/IPManagement';
import { Checklist } from '@/pages/Checklist';
import { ScalingCalculator } from '@/pages/Calculator';
import { Screens, Switchers } from '@/pages/OtherPages';
import Snakes from '@/pages/Snakes';
import Routers from '@/pages/Routers';
import Cameras from '@/pages/Cameras';
import Records from '@/pages/Records';
import MediaServers from '@/pages/MediaServers';
import CCUs from '@/pages/CCUs';
import Equipment from '@/pages/Equipment';
import Settings from '@/pages/Settings';
import Logs from '@/pages/Logs';
import { useProductionStore } from '@/hooks/useStore';

const App: React.FC = () => {
  const { activeTab, accentColor, theme } = useProductionStore();

  // Apply theme attribute to html element
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Apply accent color to CSS variables
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
    // Create lighter and darker variations
    const color = accentColor.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    document.documentElement.style.setProperty('--accent-color-rgb', `${r} ${g} ${b}`);
    
    // Dim variant (darker)
    const dimR = Math.max(0, r - 30);
    const dimG = Math.max(0, g - 30);
    const dimB = Math.max(0, b - 30);
    document.documentElement.style.setProperty('--accent-dim-rgb', `${dimR} ${dimG} ${dimB}`);
  }, [accentColor]);

  const renderPage = () => {
    switch (activeTab) {
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
      case 'switchers':
        return <Switchers />;
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
      case 'calculator':
        return <ScalingCalculator />;
      case 'settings':
        return <Settings />;
      case 'logs':
        return <Logs />;
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
