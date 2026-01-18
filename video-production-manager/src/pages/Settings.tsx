import React, { useState } from 'react';
import { Plus, X, Moon, Sun, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';

export default function Settings() {
  const { 
    connectorTypes,
    addConnectorType,
    removeConnectorType,
    reorderConnectorTypes,
    sourceTypes,
    addSourceType,
    removeSourceType,
    reorderSourceTypes,
    frameRates,
    addFrameRate,
    removeFrameRate,
    reorderFrameRates,
    resolutions,
    addResolution,
    removeResolution,
    reorderResolutions,
    theme,
    setTheme,
    accentColor,
    setAccentColor
  } = useProductionStore();
  
  const [newConnector, setNewConnector] = useState('');
  const [connectorError, setConnectorError] = useState('');
  
  const [newSourceType, setNewSourceType] = useState('');
  const [typeError, setTypeError] = useState('');
  
  const [newFrameRate, setNewFrameRate] = useState('');
  const [frameRateError, setFrameRateError] = useState('');
  
  const [newResolution, setNewResolution] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  
  const [draggedConnectorIndex, setDraggedConnectorIndex] = useState<number | null>(null);
  const [draggedTypeIndex, setDraggedTypeIndex] = useState<number | null>(null);
  const [draggedFrameRateIndex, setDraggedFrameRateIndex] = useState<number | null>(null);
  const [draggedResolutionIndex, setDraggedResolutionIndex] = useState<number | null>(null);
  
  // Load expanded sections from localStorage or default to empty (all collapsed)
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('settings-expanded-sections');
    return saved ? JSON.parse(saved) : [];
  });
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSections = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      localStorage.setItem('settings-expanded-sections', JSON.stringify(newSections));
      return newSections;
    });
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newConnector.trim()) {
      setConnectorError('Connector type cannot be empty');
      return;
    }
    
    if (connectorTypes.includes(newConnector.trim())) {
      setConnectorError('This connector type already exists');
      return;
    }
    
    addConnectorType(newConnector.trim());
    setNewConnector('');
    setConnectorError('');
  };

  const handleRemoveDevice = (type: string) => {
    if (confirm(`Remove "${type}"? This will permanently delete it.`)) {
      removeConnectorType(type);
    }
  };

  const handleAddSourceType = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSourceType.trim()) {
      setTypeError('Source type cannot be empty');
      return;
    }
    
    const trimmedType = newSourceType.trim();
    
    if (sourceTypes.includes(trimmedType)) {
      setTypeError('This source type already exists');
      return;
    }
    
    addSourceType(trimmedType);
    setNewSourceType('');
    setTypeError('');
  };

  const handleRemoveSourceType = (type: string) => {
    if (confirm(`Remove "${type}"? This will permanently delete it.`)) {
      removeSourceType(type);
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

  const handleConnectorDragEnd = () => {
    setDraggedConnectorIndex(null);
  };

  // Drag and drop handlers for source types
  const handleTypeDragStart = (index: number) => {
    setDraggedTypeIndex(index);
  };

  const handleTypeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTypeIndex === null || draggedTypeIndex === index) return;

    const newTypes = [...sourceTypes];
    const draggedItem = newTypes[draggedTypeIndex];
    newTypes.splice(draggedTypeIndex, 1);
    newTypes.splice(index, 0, draggedItem);

    reorderSourceTypes(newTypes);
    setDraggedTypeIndex(index);
  };

  const handleTypeDragEnd = () => {
    setDraggedTypeIndex(null);
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

  const handleFrameRateDragEnd = () => {
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

  const handleResolutionDragEnd = () => {
    setDraggedResolutionIndex(null);
  };

  // Add/remove handlers
  const handleAddFrameRate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFrameRate.trim()) {
      setFrameRateError('Frame rate cannot be empty');
      return;
    }
    
    if (frameRates.includes(newFrameRate.trim())) {
      setFrameRateError('This frame rate already exists');
      return;
    }
    
    addFrameRate(newFrameRate.trim());
    setNewFrameRate('');
    setFrameRateError('');
  };

  const handleRemoveFrameRate = (rate: string) => {
    if (confirm(`Remove "${rate}"? This will permanently delete it.`)) {
      removeFrameRate(rate);
    }
  };

  const handleAddResolution = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newResolution.trim()) {
      setResolutionError('Resolution cannot be empty');
      return;
    }
    
    if (resolutions.includes(newResolution.trim())) {
      setResolutionError('This resolution already exists');
      return;
    }
    
    addResolution(newResolution.trim());
    setNewResolution('');
    setResolutionError('');
  };

  const handleRemoveResolution = (resolution: string) => {
    if (confirm(`Remove "${resolution}"? This will permanently delete it.`)) {
      removeResolution(resolution);
    }
  };

  const accentColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Green', value: '#22c55e' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-av-text mb-2">Settings</h1>
        <p className="text-av-text-muted">Manage application preferences and options</p>
      </div>

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
          <p className="text-sm text-av-text-muted">Coming soon...</p>
        )}
      </Card>

      {/* Source Types Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('types')}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
        >
          <h2 className="text-xl font-semibold text-av-text">Source Types</h2>
          {expandedSections.includes('types') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('types') && (
          <>
            <p className="text-sm text-av-text-muted mb-6">
              Manage the list of source types available when creating computer sources
            </p>

            {/* Add Source Type Form */}
            <form onSubmit={handleAddSourceType} className="mb-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newSourceType}
                    onChange={(e) => {
                      setNewSourceType(e.target.value);
                      setTypeError('');
                    }}
                    placeholder="Enter source type (e.g., Laptop, Camera)"
                    className="input-field w-full"
                  />
                  {typeError && (
                    <p className="text-sm text-av-danger mt-1">{typeError}</p>
                  )}
                </div>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Type
                </button>
              </div>
            </form>

            {/* Source Type List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Types ({sourceTypes.length}) - Drag to reorder
              </h3>
              {sourceTypes.length === 0 ? (
                <div className="text-center py-8 text-av-text-muted">
                  No source types configured
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sourceTypes.map((type, index) => (
                    <div
                      key={type}
                      draggable
                      onDragStart={() => handleTypeDragStart(index)}
                      onDragOver={(e) => handleTypeDragOver(e, index)}
                      onDragEnd={handleTypeDragEnd}
                      className="flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 cursor-move"
                    >
                      <GripVertical className="w-4 h-4 text-av-text-muted" />
                      <span className="text-av-text flex-1">{type}</span>
                      <button
                        onClick={() => handleRemoveSourceType(type)}
                        className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete type"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
          <h2 className="text-xl font-semibold text-av-text">Connector Types</h2>
          {expandedSections.includes('connectors') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('connectors') && (
          <>
            <p className="text-sm text-av-text-muted mb-6">
              Manage the list of connector types available for equipment and sources
            </p>

            {/* Add Connector Form */}
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

            {/* Connector List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Connectors ({connectorTypes.length}) - Drag to reorder
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
                      draggable
                      onDragStart={() => handleConnectorDragStart(index)}
                      onDragOver={(e) => handleConnectorDragOver(e, index)}
                      onDragEnd={handleConnectorDragEnd}
                      className="flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 cursor-move"
                    >
                      <GripVertical className="w-4 h-4 text-av-text-muted" />
                      <span className="text-av-text flex-1">{connector}</span>
                      <button
                        onClick={() => handleRemoveDevice(connector)}
                        className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete connector"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
          <h2 className="text-xl font-semibold text-av-text">Frame Rates</h2>
          {expandedSections.includes('framerates') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('framerates') && (
          <>
            <p className="text-sm text-av-text-muted mb-6">
              Manage the list of frame rates available throughout the application
            </p>

            {/* Add Frame Rate Form */}
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

            {/* Frame Rate List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Frame Rates ({frameRates.length}) - Drag to reorder
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
                      draggable
                      onDragStart={() => handleFrameRateDragStart(index)}
                      onDragOver={(e) => handleFrameRateDragOver(e, index)}
                      onDragEnd={handleFrameRateDragEnd}
                      className="flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 cursor-move"
                    >
                      <GripVertical className="w-4 h-4 text-av-text-muted" />
                      <span className="text-av-text flex-1">{rate}</span>
                      <button
                        onClick={() => handleRemoveFrameRate(rate)}
                        className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete frame rate"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
          <h2 className="text-xl font-semibold text-av-text">Resolutions</h2>
          {expandedSections.includes('resolutions') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('resolutions') && (
          <>
            <p className="text-sm text-av-text-muted mb-6">
              Manage the list of resolutions available throughout the application
            </p>

            {/* Add Resolution Form */}
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

            {/* Resolution List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-av-text-muted mb-3">
                Active Resolutions ({resolutions.length}) - Drag to reorder
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
                      draggable
                      onDragStart={() => handleResolutionDragStart(index)}
                      onDragOver={(e) => handleResolutionDragOver(e, index)}
                      onDragEnd={handleResolutionDragEnd}
                      className="flex items-center gap-2 bg-av-surface-light p-3 rounded-md border border-av-border transition-colors hover:border-av-accent/30 cursor-move"
                    >
                      <GripVertical className="w-4 h-4 text-av-text-muted" />
                      <span className="text-av-text flex-1">{resolution}</span>
                      <button
                        onClick={() => handleRemoveResolution(resolution)}
                        className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete resolution"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Display Preferences Section */}
      <Card className="p-6">
        <button 
          onClick={() => toggleSection('display')}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
        >
          <h2 className="text-xl font-semibold text-av-text">Display Preferences</h2>
          {expandedSections.includes('display') ? (
            <ChevronDown className="w-5 h-5 text-av-text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-av-text-muted" />
          )}
        </button>
        
        {expandedSections.includes('display') && (
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div>
              <label className="block text-sm font-medium text-av-text mb-3">
                Theme
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-av-accent bg-av-accent/10' 
                      : 'border-av-border hover:border-av-accent/50'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto mb-2" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === 'light' 
                      ? 'border-av-accent bg-av-accent/10' 
                      : 'border-av-border hover:border-av-accent/50'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto mb-2" />
                  <span className="text-sm font-medium">Light</span>
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-av-text mb-3">
                Accent Color
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`aspect-square rounded-lg border-4 transition-all ${
                      accentColor === color.value 
                        ? 'border-av-text scale-95' 
                        : 'border-transparent hover:scale-95'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
