import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Monitor, Radio, Projector } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { ProjectionScreenFormModal } from '@/components/ProjectionScreenFormModal';
import { cn, formatResolution } from '@/utils/helpers';
import type { Send, ProjectionScreen } from '@/types';

export const Sends: React.FC = () => {
  const { 
    sends, 
    projectionScreens,
    addProjectionScreen,
    updateProjectionScreen,
    deleteProjectionScreen,
    duplicateProjectionScreen
  } = useProductionStore();
  const [activeTab, setActiveTab] = useState<'sends' | 'projection' | 'led'>('sends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [editingProjectionScreen, setEditingProjectionScreen] = useState<ProjectionScreen | null>(null);

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
    if (activeTab === 'projection') {
      setEditingProjectionScreen(null);
      setIsProjectionModalOpen(true);
    } else {
      // TODO: Open add send modal
    }
  };

  const handleEdit = (send: Send) => {
    // TODO: Open edit send modal
  };

  const handleEditProjectionScreen = (screen: ProjectionScreen) => {
    setEditingProjectionScreen(screen);
    setIsProjectionModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this send?')) {
      // TODO: Delete send
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
          <h1 className="text-3xl font-bold text-av-text mb-2">Sends / Destinations</h1>
          <p className="text-av-text-muted">Manage video outputs and destination devices</p>
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
              <input
                type="text"
                placeholder="Search sends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field flex-1"
              />
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
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold text-av-text mb-2">No Sends Found</h3>
              <p className="text-av-text-muted mb-4">
                {sends.length === 0 
                  ? 'Add your first send to get started'
                  : 'No sends match your search criteria'
                }
              </p>
              {sends.length === 0 && (
                <button onClick={handleAddNew} className="btn-primary">Add Send</button>
              )}
            </Card>
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
            <input
              type="text"
              placeholder="Search projection screens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full"
            />
          </Card>

          {/* Projection Screens List */}
          {filteredProjectionScreens.length === 0 ? (
            <Card className="p-12 text-center">
              <Projector className="w-12 h-12 mx-auto mb-4 text-av-text-muted" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Projection Screens</h3>
              <p className="text-av-text-muted mb-4">
                {projectionScreens.length === 0 
                  ? 'Add your first projection screen to get started'
                  : 'No projection screens match your search'
                }
              </p>
              {projectionScreens.length === 0 && (
                <button onClick={handleAddNew} className="btn-primary">Add Projection Screen</button>
              )}
            </Card>
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
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-av-text mb-2">LED Screens</h3>
          <p className="text-av-text-muted">LED screen management coming soon</p>
        </Card>
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
    </div>
  );
};
