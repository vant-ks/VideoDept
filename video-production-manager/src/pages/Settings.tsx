import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Moon, Sun, ChevronDown, ChevronRight, GripVertical, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { ServerConnection } from '@/components/ServerConnection';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Settings() {
  // Use new stores with proper zustand subscriptions
  const equipmentLibrary = useEquipmentLibrary();
  const preferences = usePreferencesStore();
  
  // Subscribe to activeProject changes properly
  const activeProject = useProjectStore(state => state.activeProject);
  const updateActiveProject = useProjectStore(state => state.updateActiveProject);
  const saveProject = useProjectStore(state => state.saveProject);
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  
  const connectorTypes = (Array.isArray(equipmentLibrary.connectorTypes) && equipmentLibrary.connectorTypes.length > 0) ? equipmentLibrary.connectorTypes : (oldStore.connectorTypes || []);
  const addConnectorType = equipmentLibrary.addConnectorType || oldStore.addConnectorType;
  const removeConnectorType = equipmentLibrary.removeConnectorType || oldStore.removeConnectorType;
  const reorderConnectorTypes = equipmentLibrary.reorderConnectorTypes || oldStore.reorderConnectorTypes;
  
  const frameRates = (Array.isArray(equipmentLibrary.frameRates) && equipmentLibrary.frameRates.length > 0) ? equipmentLibrary.frameRates : (oldStore.frameRates || []);
  const addFrameRate = equipmentLibrary.addFrameRate || oldStore.addFrameRate;
  const removeFrameRate = equipmentLibrary.removeFrameRate || oldStore.removeFrameRate;
  const reorderFrameRates = equipmentLibrary.reorderFrameRates || oldStore.reorderFrameRates;
  
  const resolutions = (Array.isArray(equipmentLibrary.resolutions) && equipmentLibrary.resolutions.length > 0) ? equipmentLibrary.resolutions : (oldStore.resolutions || []);
  const addResolution = equipmentLibrary.addResolution || oldStore.addResolution;
  const removeResolution = equipmentLibrary.removeResolution || oldStore.removeResolution;
  const reorderResolutions = equipmentLibrary.reorderResolutions || oldStore.reorderResolutions;
  
  const theme = preferences.theme || oldStore.theme;
  const setTheme = preferences.setTheme || oldStore.setTheme;
  const accentColor = preferences.accentColor || oldStore.accentColor;
  const setAccentColor = preferences.setAccentColor || oldStore.setAccentColor;
  const userRole = preferences.userRole || 'operator';
  const setUserRole = preferences.setUserRole;
  
  const [newConnector, setNewConnector] = useState('');
  const [connectorError, setConnectorError] = useState('');
  
  const [newFrameRate, setNewFrameRate] = useState('');
  const [frameRateError, setFrameRateError] = useState('');
  
  const [newResolution, setNewResolution] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  
  const [draggedConnectorIndex, setDraggedConnectorIndex] = useState<number | null>(null);
  const [draggedFrameRateIndex, setDraggedFrameRateIndex] = useState<number | null>(null);
  const [draggedResolutionIndex, setDraggedResolutionIndex] = useState<number | null>(null);
  
  const [serverStatusElement, setServerStatusElement] = useState<JSX.Element | null>(null);
  
  // WebSocket connection for real-time sync
  const { socket, isConnected } = useWebSocket();
  
  // Helper to convert ISO date to yyyy-MM-dd format (memoized to prevent re-creation)
  const formatDateForInput = useCallback((date: string | undefined): string => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, []);

  // Production data (used for display/context only - editing moved to Dashboard)
  const production = activeProject?.production || oldStore.production;
  const productionId = production?.id;
  
  // Get API URL (includes /api suffix)
  const getApiUrl = () => {
    const url = localStorage.getItem('api_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:3010/api';
    // Ensure it ends with /api
    return url.endsWith('/api') ? url : `${url}/api`;
  };
  
  // Fetch all settings from API on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const apiUrl = getApiUrl();
        
        // Fetch connector types
        const connectorTypesRes = await fetch(`${apiUrl}/settings/connector-types`);
        if (connectorTypesRes.ok) {
          const types = await connectorTypesRes.json();
          equipmentLibrary.setConnectorTypes?.(types);
        }
        
        // Fetch frame rates
        const frameRatesRes = await fetch(`${apiUrl}/settings/frame-rates`);
        if (frameRatesRes.ok) {
          const rates = await frameRatesRes.json();
          equipmentLibrary.setFrameRates?.(rates);
        }
        
        // Fetch resolutions
        const resolutionsRes = await fetch(`${apiUrl}/settings/resolutions`);
        if (resolutionsRes.ok) {
          const resolutions = await resolutionsRes.json();
          equipmentLibrary.setResolutions?.(resolutions);
        }
      } catch (error) {
        console.error('Failed to fetch settings from API:', error);
      }
    };
    
    fetchSettings();
  }, []);
  
  // WebSocket listeners for real-time settings updates
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    // Connector types updates
    const handleConnectorTypesUpdated = (data: any) => {
      console.log('Settings: Received connector-types update via WebSocket:', data);
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/settings/connector-types`)
        .then(res => res.json())
        .then(types => equipmentLibrary.setConnectorTypes?.(types))
        .catch(err => console.error('Failed to refetch connector types:', err));
    };
    
    // Frame rates updates
    const handleFrameRatesUpdated = (data: any) => {
      console.log('Settings: Received frame-rates update via WebSocket:', data);
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/settings/frame-rates`)
        .then(res => res.json())
        .then(rates => equipmentLibrary.setFrameRates?.(rates))
        .catch(err => console.error('Failed to refetch frame rates:', err));
    };
    
    // Resolution presets updates
    const handleResolutionsUpdated = (data: any) => {
      console.log('Settings: Received resolution-presets update via WebSocket:', data);
      const apiUrl = getApiUrl();
      fetch(`${apiUrl}/settings/resolutions`)
        .then(res => res.json())
        .then(resolutions => equipmentLibrary.setResolutions?.(resolutions))
        .catch(err => console.error('Failed to refetch resolutions:', err));
    };
    
    socket.on('settings:connector-types-updated', handleConnectorTypesUpdated);
    socket.on('settings:frame-rates-updated', handleFrameRatesUpdated);
    socket.on('settings:resolution-presets-updated', handleResolutionsUpdated);
    
    return () => {
      socket.off('settings:connector-types-updated', handleConnectorTypesUpdated);
      socket.off('settings:frame-rates-updated', handleFrameRatesUpdated);
      socket.off('settings:resolution-presets-updated', handleResolutionsUpdated);
    };
  }, [socket, isConnected]);
  
  // Load expanded sections from localStorage or default to all sections expanded
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('settings-expanded-sections');
    return saved ? JSON.parse(saved) : ['types', 'connectors', 'framerates', 'resolutions'];
  });
  
  // Memoize renderStatus callback to prevent infinite loop with ServerConnection
  const handleRenderStatus = useCallback((element: JSX.Element) => {
    setServerStatusElement(element);
  }, []);
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSections = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      localStorage.setItem('settings-expanded-sections', JSON.stringify(newSections));
      return newSections;
    });
  };

  // Check if we should expand general settings on mount
  useEffect(() => {
    const shouldExpand = sessionStorage.getItem('expandProductionInfo');
    if (shouldExpand === 'true') {
      setExpandedSections(prev => {
        if (!prev.includes('general')) {
          const newSections = [...prev, 'general'];
          localStorage.setItem('settings-expanded-sections', JSON.stringify(newSections));
          return newSections;
        }
        return prev;
      });
      sessionStorage.removeItem('expandProductionInfo');
    }
  }, []);

  // NOTE: Production editing functionality has been moved to Dashboard Edit Modal

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newConnector.trim()) {
      setConnectorError('Connector type cannot be empty');
      return;
    }
    
    if (connectorTypes.includes(newConnector.trim())) {
      setConnectorError('This connector type already exists');
      return;
    }
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/settings/connector-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newConnector.trim() })
      });
      
      if (!response.ok) throw new Error('Failed to add connector type');
      
      // Optimistic update - will be confirmed by WebSocket
      addConnectorType(newConnector.trim());
      setNewConnector('');
      setConnectorError('');
    } catch (error) {
      console.error('Failed to add connector type:', error);
      setConnectorError('Failed to add connector type');
    }
  };

  const handleRemoveDevice = async (type: string) => {
    if (confirm(`Remove "${type}"? This will permanently delete it.`)) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/connector-types/${encodeURIComponent(type)}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove connector type');
        
        // Optimistic update - will be confirmed by WebSocket
        removeConnectorType(type);
      } catch (error) {
        console.error('Failed to remove connector type:', error);
        alert('Failed to remove connector type');
      }
    }
  };

  const handleRestoreDefaultConnectorTypes = async () => {
    if (confirm('Restore default connector types? This will replace all current types with the original defaults.')) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/connector-types/restore-defaults`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to restore defaults');
        
        const types = await response.json();
        // Update Zustand store - will also be confirmed by WebSocket
        equipmentLibrary.setConnectorTypes?.(types);
      } catch (error) {
        console.error('Failed to restore default connector types:', error);
        alert('Failed to restore defaults');
      }
    }
  };

  // Drag and drop handlers for connectors
  const handleConnectorDragStart = (index: number) => {
    setDraggedConnectorIndex(index);
  };

  const handleConnectorDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedConnectorIndex === null || draggedConnectorIndex === index) return;

    const newConnectors = [...connectorTypes];
    const draggedItem = newConnectors[draggedConnectorIndex];
    newConnectors.splice(draggedConnectorIndex, 1);
    newConnectors.splice(index, 0, draggedItem);

    reorderConnectorTypes(newConnectors);
    setDraggedConnectorIndex(index);
  };

  const handleConnectorDragEnd = async () => {
    if (draggedConnectorIndex !== null) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/connector-types/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ types: connectorTypes })
        });
        
        if (!response.ok) throw new Error('Failed to reorder connector types');
      } catch (error) {
        console.error('Failed to reorder connector types:', error);
      }
    }
    setDraggedConnectorIndex(null);
  };

  // Drag and drop handlers for frame rates
  const handleFrameRateDragStart = (index: number) => {
    setDraggedFrameRateIndex(index);
  };

  const handleFrameRateDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedFrameRateIndex === null || draggedFrameRateIndex === index) return;

    const newRates = [...frameRates];
    const draggedItem = newRates[draggedFrameRateIndex];
    newRates.splice(draggedFrameRateIndex, 1);
    newRates.splice(index, 0, draggedItem);

    reorderFrameRates(newRates);
    setDraggedFrameRateIndex(index);
  };

  const handleFrameRateDragEnd = async () => {
    if (draggedFrameRateIndex !== null) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/frame-rates/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rates: frameRates })
        });
        
        if (!response.ok) throw new Error('Failed to reorder frame rates');
      } catch (error) {
        console.error('Failed to reorder frame rates:', error);
      }
    }
    setDraggedFrameRateIndex(null);
  };

  // Drag and drop handlers for resolutions
  const handleResolutionDragStart = (index: number) => {
    setDraggedResolutionIndex(index);
  };

  const handleResolutionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedResolutionIndex === null || draggedResolutionIndex === index) return;

    const newResolutions = [...resolutions];
    const draggedItem = newResolutions[draggedResolutionIndex];
    newResolutions.splice(draggedResolutionIndex, 1);
    newResolutions.splice(index, 0, draggedItem);

    reorderResolutions(newResolutions);
    setDraggedResolutionIndex(index);
  };

  const handleResolutionDragEnd = async () => {
    if (draggedResolutionIndex !== null) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/resolutions/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolutions })
        });
        
        if (!response.ok) throw new Error('Failed to reorder resolutions');
      } catch (error) {
        console.error('Failed to reorder resolutions:', error);
      }
    }
    setDraggedResolutionIndex(null);
  };

  // NOTE: handleSaveProduction removed - production editing moved to Dashboard Edit Modal

  // Add/remove handlers
  const handleAddFrameRate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFrameRate.trim()) {
      setFrameRateError('Frame rate cannot be empty');
      return;
    }
    
    if (frameRates.includes(newFrameRate.trim())) {
      setFrameRateError('This frame rate already exists');
      return;
    }
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/settings/frame-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: newFrameRate.trim() })
      });
      
      if (!response.ok) throw new Error('Failed to add frame rate');
      
      // Optimistic update - will be confirmed by WebSocket
      addFrameRate(newFrameRate.trim());
      setNewFrameRate('');
      setFrameRateError('');
    } catch (error) {
      console.error('Failed to add frame rate:', error);
      setFrameRateError('Failed to add frame rate');
    }
  };

  const handleRemoveFrameRate = async (rate: string) => {
    if (confirm(`Remove "${rate}"? This will permanently delete it.`)) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/frame-rates/${encodeURIComponent(rate)}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove frame rate');
        
        // Optimistic update - will be confirmed by WebSocket
        removeFrameRate(rate);
      } catch (error) {
        console.error('Failed to remove frame rate:', error);
        alert('Failed to remove frame rate');
      }
    }
  };

  const handleRestoreDefaultFrameRates = async () => {
    if (confirm('Restore default frame rates? This will replace all current rates with the original defaults.')) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/frame-rates/restore-defaults`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to restore defaults');
        
        const rates = await response.json();
        // Update Zustand store - will also be confirmed by WebSocket
        equipmentLibrary.setFrameRates?.(rates);
      } catch (error) {
        console.error('Failed to restore default frame rates:', error);
        alert('Failed to restore defaults');
      }
    }
  };

  const handleAddResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newResolution.trim()) {
      setResolutionError('Resolution cannot be empty');
      return;
    }
    
    if (resolutions.includes(newResolution.trim())) {
      setResolutionError('This resolution already exists');
      return;
    }
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/settings/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newResolution.trim() })
      });
      
      if (!response.ok) throw new Error('Failed to add resolution');
      
      // Optimistic update - will be confirmed by WebSocket
      addResolution(newResolution.trim());
      setNewResolution('');
      setResolutionError('');
    } catch (error) {
      console.error('Failed to add resolution:', error);
      setResolutionError('Failed to add resolution');
    }
  };

  const handleRemoveResolution = async (resolution: string) => {
    if (confirm(`Remove "${resolution}"? This will permanently delete it.`)) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/resolutions/${encodeURIComponent(resolution)}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove resolution');
        
        // Optimistic update - will be confirmed by WebSocket
        removeResolution(resolution);
      } catch (error) {
        console.error('Failed to remove resolution:', error);
        alert('Failed to remove resolution');
      }
    }
  };

  const handleRestoreDefaultResolutions = async () => {
    if (confirm('Restore default resolutions? This will replace all current resolutions with the original defaults.')) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/settings/resolutions/restore-defaults`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to restore defaults');
        
        const resolutions = await response.json();
        // Update Zustand store - will also be confirmed by WebSocket
        equipmentLibrary.setResolutions?.(resolutions);
      } catch (error) {
        console.error('Failed to restore default resolutions:', error);
        alert('Failed to restore defaults');
      }
    }
  };

  const accentColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'White', value: '#ffffff' },
    { name: 'Magenta', value: '#ec4899' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
  ];

  const [customColorMode, setCustomColorMode] = useState<'hex' | 'rgb'>('hex');
  const [customHex, setCustomHex] = useState(accentColor);
  const [customRgb, setCustomRgb] = useState({ r: 59, g: 130, b: 246 });

  // Permission helpers
  // Equipment settings (source types, connector types, frame rates, resolutions) are open to all roles including operators
  const canEditEquipmentSettings = true;
  // Production info editing remains restricted to admin/manager only
  const canEditProductionInfo = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-av-text mb-2">Settings</h1>
      </div>

      {/* User Role Selector */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-av-text mb-4">User Role</h2>
        <div className="flex gap-3">
          {(['admin', 'manager', 'operator'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setUserRole && setUserRole(role)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                userRole === role
                  ? 'border-av-accent bg-av-accent/10 text-av-accent'
                  : 'border-av-border text-av-text hover:border-av-accent/50'
              }`}
            >
              <span className="text-sm font-medium capitalize">{role}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-av-text-muted mt-3">
          {userRole === 'admin' && 'Full access to all settings and configurations'}
          {userRole === 'manager' && 'Can edit equipment settings and manage system defaults'}
          {userRole === 'operator' && 'Read-only access to settings'}
        </p>
      </Card>

      {/* General Settings Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('general')}
          className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
        >
          <h2 className="text-xl font-semibold text-av-text">General Settings</h2>
          {expandedSections.includes('general') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        {expandedSections.includes('general') && (
          <div className="mt-6 space-y-8">
            {/* Server Connection Subsection - Admin/Manager only */}
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-av-text">Server Connection</h3>
                    {serverStatusElement}
                  </div>
                  <ServerConnection 
                    onConnect={() => {
                      // Trigger sync after connection
                      const store = useProductionStore.getState();
                      store.syncWithServer();
                    }}
                    renderStatus={handleRenderStatus}
                  />
                </div>

                <div className="border-t border-av-border" />
              </>
            )}

            {/* Display Preferences Subsection */}
            <div>
              <h3 className="text-lg font-semibold text-av-text mb-4">Display Preferences</h3>
              
              <div className="flex gap-6">
                {/* Left 1/3: Theme and Custom Color Chooser */}
                <div className="w-1/3 space-y-6">
                  {/* Theme Section */}
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-3">
                      Theme
                    </label>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'light' 
                            ? 'border-av-accent bg-av-accent/10' 
                            : 'border-av-border hover:border-av-accent/50'
                        }`}
                      >
                        <Sun className="w-5 h-5 mx-auto mb-2" />
                        <span className="text-sm font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'dark' 
                            ? 'border-av-accent bg-av-accent/10' 
                            : 'border-av-border hover:border-av-accent/50'
                        }`}
                      >
                        <Moon className="w-5 h-5 mx-auto mb-2" />
                        <span className="text-sm font-medium">Dark</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Color Chooser */}
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-3">
                      Custom Color Chooser
                    </label>
                    <div className="space-y-3">
                      {/* Mode Toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCustomColorMode('hex')}
                          className={`flex-1 px-3 py-2 text-sm rounded border transition-all ${
                            customColorMode === 'hex'
                              ? 'bg-av-accent text-white border-av-accent'
                              : 'border-av-border text-av-text hover:border-av-accent/50'
                          }`}
                        >
                          HEX
                        </button>
                        <button
                          onClick={() => setCustomColorMode('rgb')}
                          className={`flex-1 px-3 py-2 text-sm rounded border transition-all ${
                            customColorMode === 'rgb'
                              ? 'bg-av-accent text-white border-av-accent'
                              : 'border-av-border text-av-text hover:border-av-accent/50'
                          }`}
                        >
                          RGB
                        </button>
                      </div>

                      {/* Color Input */}
                      {customColorMode === 'hex' ? (
                        <input
                          type="text"
                          value={customHex}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCustomHex(value);
                            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                              setAccentColor(value);
                            }
                          }}
                          placeholder="#3b82f6"
                          className="input-field w-full"
                        />
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={customRgb.r}
                            onChange={(e) => {
                              const r = parseInt(e.target.value) || 0;
                              setCustomRgb({ ...customRgb, r });
                              const hex = `#${r.toString(16).padStart(2, '0')}${customRgb.g.toString(16).padStart(2, '0')}${customRgb.b.toString(16).padStart(2, '0')}`;
                              setAccentColor(hex);
                              setCustomHex(hex);
                            }}
                            placeholder="R (0-255)"
                            className="input-field w-full"
                          />
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={customRgb.g}
                            onChange={(e) => {
                              const g = parseInt(e.target.value) || 0;
                              setCustomRgb({ ...customRgb, g });
                              const hex = `#${customRgb.r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${customRgb.b.toString(16).padStart(2, '0')}`;
                              setAccentColor(hex);
                              setCustomHex(hex);
                            }}
                            placeholder="G (0-255)"
                            className="input-field w-full"
                          />
                          <input
                            type="number"
                            min="0"
                            max="255"
                            value={customRgb.b}
                            onChange={(e) => {
                              const b = parseInt(e.target.value) || 0;
                              setCustomRgb({ ...customRgb, b });
                              const hex = `#${customRgb.r.toString(16).padStart(2, '0')}${customRgb.g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                              setAccentColor(hex);
                              setCustomHex(hex);
                            }}
                            placeholder="B (0-255)"
                            className="input-field w-full"
                          />
                        </div>
                      )}

                      {/* Color Preview Swatch */}
                      <div 
                        className="w-full h-16 rounded-lg border-2 border-av-border"
                        style={{ backgroundColor: accentColor }}
                        title="Current color preview"
                      />
                    </div>
                  </div>
                </div>

                {/* Right 2/3: Color Quick Selects */}
                <div className="w-2/3">
                  <label className="block text-sm font-medium text-av-text mb-3">
                    Accent Color Quick Select
                  </label>
                  <div className="grid grid-cols-4 gap-4">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => {
                          setAccentColor(color.value);
                          setCustomHex(color.value);
                        }}
                        className={`relative aspect-square rounded-lg border-4 transition-all hover:scale-95 ${
                          accentColor === color.value 
                            ? 'border-av-text' 
                            : 'border-av-border'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        <span className="absolute bottom-1 left-0 right-0 text-center text-xs font-medium bg-black/50 text-white rounded px-1 py-0.5 mx-2">
                          {color.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Equipment Categories Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-av-text">Equipment Categories</h2>
            <span className="text-xs text-av-info px-2 py-1 bg-av-info/10 rounded">System</span>
          </div>
          {expandedSections.includes('categories') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('categories') && (
          <>
            <p className="text-sm text-av-text-muted mb-4">
              Base categories for equipment and sources. These align with equipment types and determine which subclass properties are available.
            </p>
            
            {/* Category List */}
            <div className="space-y-2">
              <div className="flex flex-col gap-2">
                {[
                  { name: 'COMPUTER', desc: 'Computers, Laptops' },
                  { name: 'SERVER', desc: 'Media Servers, Playback' },
                  { name: 'CAMERA', desc: 'Cameras, PTZ, Robo' },
                  { name: 'CCU', desc: 'Camera Control Units' },
                  { name: 'SWITCHER', desc: 'Vision Mixers, Switchers' },
                  { name: 'ROUTER', desc: 'Video Routers, Matrices' },
                  { name: 'LED_PROCESSOR', desc: 'LED Processors, Wall Controllers' },
                  { name: 'LED_TILE', desc: 'LED Tiles, Panels' },
                  { name: 'PROJECTOR', desc: 'Projectors, Large Format Displays' },
                  { name: 'RECORDER', desc: 'Recorders, Capture Devices' },
                  { name: 'MONITOR', desc: 'Monitors, Reference Displays' },
                  { name: 'CONVERTER', desc: 'Converters, Signal Processing' }
                ].map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border"
                  >
                    <span className="text-av-text flex-1 font-medium">{category.name}</span>
                    <span className="text-xs text-av-text-muted">{category.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Connector Types Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('connectors')}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-av-text">Connector Types</h2>
            {!canEditEquipmentSettings && (
              <span className="text-xs text-av-warning px-2 py-1 bg-av-warning/10 rounded">Read-only</span>
            )}
          </div>
          {expandedSections.includes('connectors') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('connectors') && (
          <>
            {/* Add Connector Form */}
            {canEditEquipmentSettings && (
              <form onSubmit={handleAddDevice} className="mb-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newConnector}
                    onChange={(e) => {
                      setNewConnector(e.target.value);
                      setConnectorError('');
                    }}
                    placeholder="Enter connector type (e.g., HDMI, SDI, DP)"
                    className="input-field w-full"
                  />
                  {connectorError && (
                    <p className="text-sm text-av-danger mt-1">{connectorError}</p>
                  )}
                </div>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Connector
                </button>
              </div>
            </form>
            )}

            {/* Restore Defaults Button */}
            {canEditEquipmentSettings && (
              <div className="mb-4">
                <button 
                  onClick={handleRestoreDefaultConnectorTypes}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore Defaults
                </button>
              </div>
            )}

            {/* Connector List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Connectors ({connectorTypes.length}){canEditEquipmentSettings && ' - Drag to reorder'}
              </h3>
              {connectorTypes.length === 0 ? (
                <div className="text-center py-8 text-av-text-muted">
                  No connector types configured
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {connectorTypes.map((connector, index) => (
                    <div
                      key={connector}
                      draggable={canEditEquipmentSettings}
                      onDragStart={() => canEditEquipmentSettings && handleConnectorDragStart(index)}
                      onDragOver={(e) => canEditEquipmentSettings && handleConnectorDragOver(e, index)}
                      onDragEnd={canEditEquipmentSettings ? handleConnectorDragEnd : undefined}
                      className={`flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 ${canEditEquipmentSettings ? 'cursor-move' : ''}`}
                    >
                      {canEditEquipmentSettings && <GripVertical className="w-4 h-4 text-av-text-muted" />}
                      <span className="text-av-text flex-1">{connector}</span>
                      {canEditEquipmentSettings && (
                        <button
                          onClick={() => handleRemoveDevice(connector)}
                          className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                          title="Delete connector"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Frame Rates Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('framerates')}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-av-text">Frame Rates</h2>
            {!canEditEquipmentSettings && (
              <span className="text-xs text-av-warning px-2 py-1 bg-av-warning/10 rounded">Read-only</span>
            )}
          </div>
          {expandedSections.includes('framerates') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('framerates') && (
          <>
            {/* Add Frame Rate Form */}
            {canEditEquipmentSettings && (
              <form onSubmit={handleAddFrameRate} className="mb-6">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newFrameRate}
                      onChange={(e) => {
                        setNewFrameRate(e.target.value);
                        setFrameRateError('');
                      }}
                      placeholder="Enter frame rate (e.g., 60, 59.94, 23.98)"
                      className="input-field w-full"
                    />
                    {frameRateError && (
                      <p className="text-sm text-av-danger mt-1">{frameRateError}</p>
                    )}
                  </div>
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Rate
                  </button>
                </div>
              </form>
            )}

            {/* Restore Defaults Button */}
            {canEditEquipmentSettings && (
              <div className="mb-4">
                <button 
                  onClick={handleRestoreDefaultFrameRates}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore Defaults
                </button>
              </div>
            )}

            {/* Frame Rate List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Frame Rates ({frameRates.length}){canEditEquipmentSettings && ' - Drag to reorder'}
              </h3>
              {frameRates.length === 0 ? (
                <div className="text-center py-8 text-av-text-muted">
                  No frame rates configured
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {frameRates.map((rate, index) => (
                    <div
                      key={rate}
                      draggable={canEditEquipmentSettings}
                      onDragStart={() => canEditEquipmentSettings && handleFrameRateDragStart(index)}
                      onDragOver={(e) => canEditEquipmentSettings && handleFrameRateDragOver(e, index)}
                      onDragEnd={canEditEquipmentSettings ? handleFrameRateDragEnd : undefined}
                      className={`flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 ${canEditEquipmentSettings ? 'cursor-move' : ''}`}
                    >
                      {canEditEquipmentSettings && <GripVertical className="w-4 h-4 text-av-text-muted" />}
                      <span className="text-av-text flex-1">{rate}</span>
                      {canEditEquipmentSettings && (
                        <button
                          onClick={() => handleRemoveFrameRate(rate)}
                          className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                          title="Delete frame rate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Resolutions Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('resolutions')}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-av-text">Resolutions</h2>
            {!canEditEquipmentSettings && (
              <span className="text-xs text-av-warning px-2 py-1 bg-av-warning/10 rounded">Read-only</span>
            )}
          </div>
          {expandedSections.includes('resolutions') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('resolutions') && (
          <>
            {/* Add Resolution Form */}
            {canEditEquipmentSettings && (
              <form onSubmit={handleAddResolution} className="mb-6">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newResolution}
                      onChange={(e) => {
                        setNewResolution(e.target.value);
                        setResolutionError('');
                      }}
                      placeholder="Enter resolution (e.g., 1080p, 4K, 720p)"
                      className="input-field w-full"
                    />
                    {resolutionError && (
                      <p className="text-sm text-av-danger mt-1">{resolutionError}</p>
                    )}
                  </div>
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Resolution
                  </button>
                </div>
              </form>
            )}

            {/* Restore Defaults Button */}
            {canEditEquipmentSettings && (
              <div className="mb-4">
                <button 
                  onClick={handleRestoreDefaultResolutions}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore Defaults
                </button>
              </div>
            )}

            {/* Resolution List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Resolutions ({resolutions.length}){canEditEquipmentSettings && ' - Drag to reorder'}
              </h3>
              {resolutions.length === 0 ? (
                <div className="text-center py-8 text-av-text-muted">
                  No resolutions configured
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {resolutions.map((resolution, index) => (
                    <div
                      key={resolution}
                      draggable={canEditEquipmentSettings}
                      onDragStart={() => canEditEquipmentSettings && handleResolutionDragStart(index)}
                      onDragOver={(e) => canEditEquipmentSettings && handleResolutionDragOver(e, index)}
                      onDragEnd={canEditEquipmentSettings ? handleResolutionDragEnd : undefined}
                      className={`flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 ${canEditEquipmentSettings ? 'cursor-move' : ''}`}
                    >
                      {canEditEquipmentSettings && <GripVertical className="w-4 h-4 text-av-text-muted" />}
                      <span className="text-av-text flex-1">{resolution}</span>
                      {canEditEquipmentSettings && (
                        <button
                          onClick={() => handleRemoveResolution(resolution)}
                          className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                          title="Delete resolution"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
