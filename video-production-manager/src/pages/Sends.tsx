import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, Monitor, Radio, Projector, AlertCircle, X } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useSendsAPI } from '@/hooks/useSendsAPI';
import { useLEDScreenAPI } from '@/hooks/useLEDScreenAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { ProjectionScreenFormModal } from '@/components/ProjectionScreenFormModal';
import { cn, formatResolution } from '@/utils/helpers';
import type { Send, ProjectionScreen } from '@/types';

export const Sends: React.FC = () => {
  // Use new stores
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  
  // API hook for event-enabled operations
  const sendsAPI = useSendsAPI();
  const ledAPI = useLEDScreenAPI();
  
  // Local state
  const [sends, setSends] = useState<Send[]>(activeProject?.sends || oldStore.sends);
  const projectionScreens = activeProject?.projectionScreens || oldStore.projectionScreens;
  
  // Get production ID
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // Load sends from API on mount
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      sendsAPI.fetchSends(productionId).then(setSends).catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'send') {
        console.log('🔔 Send created by', event.userName);
        setSends(prev => {
          // Avoid duplicates
          if (prev.some(s => s.id === event.entity.id)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'send') {
        console.log('🔔 Send updated by', event.userName);
        setSends(prev => prev.map(s => 
          s.id === event.entity.id ? event.entity : s
        ));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'send') {
        console.log('🔔 Send deleted by', event.userName);
        setSends(prev => prev.filter(s => s.id !== event.entityId));
      }
    }, [])
  });
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const addProjectionScreen = activeProject ? projectStore.addProjectionScreen : oldStore.addProjectionScreen;
  const updateProjectionScreen = activeProject ? projectStore.updateProjectionScreen : oldStore.updateProjectionScreen;
  const deleteProjectionScreen = activeProject ? projectStore.deleteProjectionScreen : oldStore.deleteProjectionScreen;
  const duplicateProjectionScreen = activeProject ? projectStore.duplicateProjectionScreen : oldStore.duplicateProjectionScreen;
  
  const [activeTab, setActiveTab] = useState<'sends' | 'projection' | 'led'>('sends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [editingProjectionScreen, setEditingProjectionScreen] = useState<ProjectionScreen | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isLEDModalOpen, setIsLEDModalOpen] = useState(false);
  const [sendFormData, setSendFormData] = useState({ 
    name: '', 
    type: 'SCREEN',
    hRes: 1920,
    vRes: 1080,
    rate: 60
  });
  const [ledFormData, setLedFormData] = useState({ id: '', name: '' });
  const [conflictData, setConflictData] = useState<{
    send: Send;
    currentVersion: number;
    clientVersion: number;
  } | null>(null);

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

  const handleAddNew = () => {
    console.log('🔘 Add button clicked, activeTab:', activeTab);
    if (activeTab === 'projection') {
      console.log('🔘 Opening projection screen modal');
      setEditingProjectionScreen(null);
      setIsProjectionModalOpen(true);
    } else if (activeTab === 'led') {
      console.log('🔘 Opening LED modal');
      setIsLEDModalOpen(true);
    } else {
      console.log('🔘 Opening send modal');
      setIsSendModalOpen(true);
    }
  };

  const handleEdit = (send: Send) => {
    // TODO: Open edit send modal
  };

  const handleEditProjectionScreen = (screen: ProjectionScreen) => {
    setEditingProjectionScreen(screen);
    setIsProjectionModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this send?')) return;

    try {
      await sendsAPI.deleteSend(id);
      setSends(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete send:', error);
      alert('Failed to delete send. Please try again.');
    }
  };

  const handleDeleteProjectionScreen = (id: string) => {
    if (confirm('Are you sure you want to delete this projection screen?')) {
      deleteProjectionScreen(id);
    }
  };

  const handleDuplicate = (id: string) => {
    // TODO: Duplicate send
  };

  const handleDuplicateProjectionScreen = (id: string) => {
    duplicateProjectionScreen(id);
  };

  const handleSaveProjectionScreen = (screen: ProjectionScreen) => {
    if (editingProjectionScreen) {
      updateProjectionScreen(editingProjectionScreen.id, screen);
    } else {
      addProjectionScreen(screen);
    }
  };

  const handleSubmitSend = async () => {
    if (!sendFormData.name || !productionId) return;
    
    try {
      const newSend = await sendsAPI.createSend({
        productionId,
        name: sendFormData.name,
        type: sendFormData.type,
        hRes: sendFormData.hRes,
        vRes: sendFormData.vRes,
        rate: sendFormData.rate
      });
      
      // Optimistic update - WebSocket will confirm
      setSends(prev => [...prev, newSend]);
      setIsSendModalOpen(false);
      setSendFormData({ name: '', type: 'SCREEN', hRes: 1920, vRes: 1080, rate: 60 });
    } catch (error) {
      console.error('Failed to create send:', error);
      alert('Failed to create send. Please try again.');
    }
  };

  const handleSubmitLED = async () => {
    if (!ledFormData.name || !productionId) return;
    
    try {
      await ledAPI.createLEDScreen({
        productionId,
        name: ledFormData.name
      });
      setIsLEDModalOpen(false);
      setLedFormData({ id: '', name: '' });
    } catch (error) {
      console.error('Failed to create LED screen:', error);
      alert('Failed to create LED screen. Please try again.');
    }
  };

  const stats = {
    total: sends.length,
    screens: sends.filter(s => s.type === 'VIDEO SWITCH').length,
    routers: sends.filter(s => s.type === 'ROUTER').length,
    monitors: sends.filter(s => s.type === 'MONITOR').length,
    projectionScreens: projectionScreens.length,
  };

  const filteredProjectionScreens = projectionScreens.filter(screen => {
    return searchQuery === '' || 
      screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Sends / Destinations</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {activeTab === 'projection' ? 'Add Projection Screen' : activeTab === 'led' ? 'Add LED Screen' : 'Add Send'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-av-border">
        <button
          onClick={() => setActiveTab('sends')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative',
            activeTab === 'sends'
              ? 'text-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          )}
        >
          Sends
          {activeTab === 'sends' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('projection')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative flex items-center gap-2',
            activeTab === 'projection'
              ? 'text-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          )}
        >
          <Projector className="w-4 h-4" />
          Projection Screens
          {activeTab === 'projection' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('led')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative',
            activeTab === 'led'
              ? 'text-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          )}
        >
          LED Screens
          {activeTab === 'led' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeTab === 'sends' ? (
          <>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Total Sends</p>
              <p className="text-3xl font-bold text-av-text">{stats.total}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Screens</p>
              <p className="text-3xl font-bold text-av-accent">{stats.screens}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Router Feeds</p>
              <p className="text-3xl font-bold text-av-info">{stats.routers}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Monitors</p>
              <p className="text-3xl font-bold text-av-text">{stats.monitors}</p>
            </Card>
          </>
        ) : activeTab === 'projection' ? (
          <>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Projection Screens</p>
              <p className="text-3xl font-bold text-av-text">{stats.projectionScreens}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Total Area</p>
              <p className="text-3xl font-bold text-av-accent">
                {projectionScreens.reduce((sum, s) => sum + s.sqFt, 0).toFixed(0)} sq ft
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Total Lumens</p>
              <p className="text-3xl font-bold text-av-info">
                {projectionScreens.reduce((sum, s) => sum + s.totalLumens, 0).toLocaleString()}
              </p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-av-text-muted mb-1">Avg Brightness</p>
              <p className="text-3xl font-bold text-av-text">
                {projectionScreens.length > 0 
                  ? Math.round(projectionScreens.reduce((sum, s) => sum + s.nits, 0) / projectionScreens.length)
                  : 0} nits
              </p>
            </Card>
          </>
        ) : null}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'sends' && (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search sends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field w-full pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-av-surface rounded transition-colors text-av-text-muted hover:text-av-text"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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

          {/* Sends List */}
          {filteredSends.length === 0 ? (
            sends.length === 0 ? (
              <EmptyState
                icon={Monitor}
                title="No Sends Yet"
                description="Add your first send to start managing video destinations"
                actionLabel="Add Send"
                onAction={handleAddNew}
              />
            ) : (
              <Card className="p-12 text-center">
                <h3 className="text-lg font-semibold text-av-text mb-2">No Sends Found</h3>
                <p className="text-av-text-muted">No sends match your search criteria</p>
              </Card>
            )
          ) : (
            <div className="space-y-3">
              {filteredSends.map((send) => (
                <Card key={send.id} className="p-6 hover:border-av-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-av-text">{send.name}</h3>
                        <Badge>{send.type}</Badge>
                        <Badge>{send.output}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-av-text-muted">ID:</span>
                          <span className="text-av-text ml-2">{send.id}</span>
                        </div>
                        {send.hRes && send.vRes && (
                          <div>
                            <span className="text-av-text-muted">Resolution:</span>
                            <span className="text-av-text ml-2">{send.hRes}x{send.vRes}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-av-text-muted">Frame Rate:</span>
                          <span className="text-av-text ml-2">{send.rate}</span>
                        </div>
                        {send.standard && (
                          <div>
                            <span className="text-av-text-muted">Standard:</span>
                            <span className="text-av-text ml-2">{send.standard}</span>
                          </div>
                        )}
                        {send.secondaryDevice && (
                          <div>
                            <span className="text-av-text-muted">Device:</span>
                            <span className="text-av-text ml-2">{send.secondaryDevice}</span>
                          </div>
                        )}
                      </div>
                      
                      {send.note && (
                        <p className="text-sm text-av-text-muted mt-3">
                          <span className="font-medium">Note:</span> {send.note}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(send)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(send.id)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(send.id)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Results Count */}
          {filteredSends.length > 0 && (
            <div className="text-center text-sm text-av-text-muted">
              Showing {filteredSends.length} of {sends.length} sends
            </div>
          )}
        </>
      )}

      {activeTab === 'projection' && (
        <>
          {/* Search */}
          <Card className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search projection screens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-av-surface rounded transition-colors text-av-text-muted hover:text-av-text"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>

          {/* Projection Screens List */}
          {filteredProjectionScreens.length === 0 ? (
            projectionScreens.length === 0 ? (
              <EmptyState
                icon={Projector}
                title="No Projection Screens Yet"
                description="Add your first projection screen to start managing displays"
                actionLabel="Add Projection Screen"
                onAction={handleAddNew}
              />
            ) : (
              <Card className="p-12 text-center">
                <h3 className="text-lg font-semibold text-av-text mb-2">No Projection Screens</h3>
                <p className="text-av-text-muted">No projection screens match your search</p>
              </Card>
            )
          ) : (
            <div className="space-y-3">
              {filteredProjectionScreens.map((screen) => (
                <Card key={screen.id} className="p-6 hover:border-av-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-av-text">{screen.name}</h3>
                        <Badge>{screen.projectorResolution.width}x{screen.projectorResolution.height}</Badge>
                        <Badge>{screen.ratio.toFixed(2)}:1</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-av-text-muted">Dimensions:</span>
                          <span className="text-av-text ml-2">
                            {screen.horizontal.ft}'{screen.horizontal.inches}" × {screen.vertical.ft}'{screen.vertical.inches}"
                          </span>
                        </div>
                        <div>
                          <span className="text-av-text-muted">Area:</span>
                          <span className="text-av-text ml-2">{screen.sqFt.toFixed(1)} sq ft</span>
                        </div>
                        <div>
                          <span className="text-av-text-muted">Brightness:</span>
                          <span className="text-av-text ml-2">{screen.nits} nits</span>
                        </div>
                        <div>
                          <span className="text-av-text-muted">Total Lumens:</span>
                          <span className="text-av-text ml-2">{screen.totalLumens.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-av-text-muted">Pixel Density:</span>
                          <span className="text-av-text ml-2">{screen.pixelsPerSqFt}/sq ft</span>
                        </div>
                        <div>
                          <span className="text-av-text-muted">Blending:</span>
                          <span className="text-av-text ml-2">
                            {screen.blendCount > 0 ? `${screen.blendCount} blends @ ${screen.blendWidth.percent}%` : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-av-text-muted">Gain Factor:</span>
                          <span className="text-av-text ml-2">{screen.gainFactor}</span>
                        </div>
                        <div>
                          <span className="text-av-text-muted">Throw Distance:</span>
                          <span className="text-av-text ml-2">
                            {screen.throwDistance.ft}'{screen.throwDistance.inches}"
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditProjectionScreen(screen)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateProjectionScreen(screen.id)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProjectionScreen(screen.id)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Results Count */}
          {filteredProjectionScreens.length > 0 && (
            <div className="text-center text-sm text-av-text-muted">
              Showing {filteredProjectionScreens.length} of {projectionScreens.length} projection screens
            </div>
          )}
        </>
      )}

      {activeTab === 'led' && (
        <EmptyState
          icon={Monitor}
          title="No LED Screens Yet"
          description="Add your first LED screen to start managing LED displays"
          actionLabel="Add LED Screen"
          onAction={handleAddNew}
        />
      )}

      {/* Projection Screen Modal */}
      <ProjectionScreenFormModal
        isOpen={isProjectionModalOpen}
        onClose={() => {
          setIsProjectionModalOpen(false);
          setEditingProjectionScreen(null);
        }}
        onSave={handleSaveProjectionScreen}
        editingScreen={editingProjectionScreen}
      />

      {/* Send Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsSendModalOpen(false)}>
          <div className="bg-av-cardBg rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-av-text mb-4">Add Send</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={sendFormData.name}
                  onChange={(e) => setSendFormData({...sendFormData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., Main Screen"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Type</label>
                <select
                  value={sendFormData.type}
                  onChange={(e) => setSendFormData({...sendFormData, type: e.target.value})}
                  className="input-field w-full"
                >
                  <option value="SCREEN">Screen</option>
                  <option value="MONITOR">Monitor</option>
                  <option value="ROUTER">Router</option>
                  <option value="VIDEO SWITCH">Video Switch</option>
                  <option value="RECORD">Record</option>
                  <option value="STREAM">Stream</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">H Res</label>
                  <input
                    type="number"
                    value={sendFormData.hRes}
                    onChange={(e) => setSendFormData({...sendFormData, hRes: parseInt(e.target.value)})}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">V Res</label>
                  <input
                    type="number"
                    value={sendFormData.vRes}
                    onChange={(e) => setSendFormData({...sendFormData, vRes: parseInt(e.target.value)})}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Frame Rate</label>
                <input
                  type="number"
                  value={sendFormData.rate}
                  onChange={(e) => setSendFormData({...sendFormData, rate: parseFloat(e.target.value)})}
                  className="input-field w-full"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsSendModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmitSend} disabled={!sendFormData.name} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* LED Modal */}
      {isLEDModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsLEDModalOpen(false)}>
          <div className="bg-av-cardBg rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-av-text mb-4">Add LED Screen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={ledFormData.name}
                  onChange={(e) => setLedFormData({...ledFormData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., Main LED Wall"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsLEDModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmitLED} disabled={!ledFormData.name} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
