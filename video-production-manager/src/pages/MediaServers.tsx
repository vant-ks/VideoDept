import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Monitor, Server, Layers, Copy } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import type { MediaServer, MediaServerOutput, MediaServerLayer } from '@/types';
import { MEDIA_SERVER_PLATFORMS, OUTPUT_TYPES } from '@/types/mediaServer';

export default function MediaServers() {
  const { 
    mediaServers, 
    mediaServerLayers,
    addMediaServerPair, 
    updateMediaServer, 
    deleteMediaServerPair,
    addMediaServerLayer,
    updateMediaServerLayer,
    deleteMediaServerLayer 
  } = useProductionStore();
  
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MediaServer | null>(null);
  const [editingLayer, setEditingLayer] = useState<MediaServerLayer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'servers' | 'layers' | 'layermap'>('servers');

  // Group servers by pair
  const serverPairs = React.useMemo(() => {
    const pairs: { [key: number]: { main: MediaServer; backup: MediaServer } } = {};
    mediaServers.forEach(server => {
      if (!pairs[server.pairNumber]) {
        pairs[server.pairNumber] = {} as any;
      }
      if (server.isBackup) {
        pairs[server.pairNumber].backup = server;
      } else {
        pairs[server.pairNumber].main = server;
      }
    });
    return Object.values(pairs).filter(pair => pair.main && pair.backup);
  }, [mediaServers]);

  const filteredPairs = React.useMemo(() => {
    if (!searchQuery) return serverPairs;
    const query = searchQuery.toLowerCase();
    return serverPairs.filter(pair => 
      pair.main.name.toLowerCase().includes(query) ||
      pair.main.platform.toLowerCase().includes(query)
    );
  }, [serverPairs, searchQuery]);

  const filteredLayers = React.useMemo(() => {
    if (!searchQuery) return mediaServerLayers;
    const query = searchQuery.toLowerCase();
    return mediaServerLayers.filter(layer => 
      layer.name.toLowerCase().includes(query) ||
      layer.content.toLowerCase().includes(query)
    );
  }, [mediaServerLayers, searchQuery]);

  const handleAddServerPair = () => {
    setEditingServer(null);
    setIsServerModalOpen(true);
  };

  const handleAddLayer = () => {
    setEditingLayer(null);
    setIsLayerModalOpen(true);
  };

  const handleEditServer = (server: MediaServer) => {
    setEditingServer(server);
    setIsServerModalOpen(true);
  };

  const handleEditLayer = (layer: MediaServerLayer) => {
    setEditingLayer(layer);
    setIsLayerModalOpen(true);
  };

  const handleDeletePair = (pairNumber: number) => {
    if (confirm(`Delete Media Server ${pairNumber}A and ${pairNumber}B?`)) {
      deleteMediaServerPair(pairNumber);
    }
  };

  const handleDeleteLayer = (id: string) => {
    if (confirm('Delete this layer?')) {
      deleteMediaServerLayer(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text mb-2">Media Servers</h1>
          <p className="text-av-text-muted">Manage media server pairs, outputs, and content layers</p>
        </div>
        {activeTab !== 'layermap' && (
          <button 
            onClick={activeTab === 'servers' ? handleAddServerPair : handleAddLayer} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'servers' ? 'Add Server Pair' : 'Add Layer'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-av-border">
        <button
          onClick={() => setActiveTab('servers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'servers'
              ? 'text-av-accent border-b-2 border-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Servers ({serverPairs.length} pairs)
          </div>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'layers'
              ? 'text-av-accent border-b-2 border-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers ({mediaServerLayers.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('layermap')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'layermap'
              ? 'text-av-accent border-b-2 border-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Layer Map
          </div>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Server Pairs</p>
          <p className="text-3xl font-bold text-av-text">{serverPairs.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Total Outputs</p>
          <p className="text-3xl font-bold text-av-accent">
            {mediaServers.reduce((sum, s) => sum + s.outputs.length, 0)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Content Layers</p>
          <p className="text-3xl font-bold text-av-info">
            {mediaServerLayers.length}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field w-full"
        />
      </Card>

      {/* Servers Tab */}
      {activeTab === 'servers' && (
        <>
          {filteredPairs.length === 0 ? (
            <Card className="p-12 text-center">
              <Server className="w-16 h-16 mx-auto text-av-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Media Servers Found</h3>
              <p className="text-av-text-muted mb-4">
                {serverPairs.length === 0 
                  ? 'Add your first media server pair to get started'
                  : 'No servers match your search criteria'
                }
              </p>
              {serverPairs.length === 0 && (
                <button onClick={handleAddServerPair} className="btn-primary">Add Server Pair</button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPairs.map((pair) => (
                <Card key={pair.main.pairNumber} className="p-6 hover:border-av-accent/30 transition-colors">
                  {/* Pair Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Server className="w-6 h-6 text-av-accent" />
                      <div>
                        <h3 className="text-xl font-semibold text-av-text">
                          Media {pair.main.pairNumber} (A/B Pair)
                        </h3>
                        <p className="text-sm text-av-text-muted">{pair.main.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditServer(pair.main)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit servers"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePair(pair.main.pairNumber)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete pair"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main and Backup Servers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Main Server */}
                    <div className="bg-av-surface-light p-4 rounded-md border border-av-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-av-text">{pair.main.name}</h4>
                        <Badge variant="success">Main</Badge>
                      </div>
                      {pair.main.outputs.length > 0 && (
                        <div>
                          <p className="text-xs text-av-text-muted mb-2">
                            <Monitor className="w-3 h-3 inline mr-1" />
                            {pair.main.outputs.length} Output{pair.main.outputs.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1">
                            {pair.main.outputs.map((output) => (
                              <div key={output.id} className="text-xs bg-av-surface px-2 py-1 rounded flex items-center justify-between">
                                <span className="text-av-text">{output.name}</span>
                                <Badge>{output.type}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Backup Server */}
                    <div className="bg-av-surface-light p-4 rounded-md border border-av-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-av-text">{pair.backup.name}</h4>
                        <Badge variant="warning">Backup</Badge>
                      </div>
                      {pair.backup.outputs.length > 0 && (
                        <div>
                          <p className="text-xs text-av-text-muted mb-2">
                            <Monitor className="w-3 h-3 inline mr-1" />
                            {pair.backup.outputs.length} Output{pair.backup.outputs.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1">
                            {pair.backup.outputs.map((output) => (
                              <div key={output.id} className="text-xs bg-av-surface px-2 py-1 rounded flex items-center justify-between">
                                <span className="text-av-text">{output.name}</span>
                                <Badge>{output.type}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {pair.main.note && (
                    <div className="pt-4 border-t border-av-border">
                      <p className="text-sm text-av-text-muted">
                        <span className="font-medium">Note:</span> {pair.main.note}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Layers Tab */}
      {activeTab === 'layers' && (
        <>
          {filteredLayers.length === 0 ? (
            <Card className="p-12 text-center">
              <Layers className="w-16 h-16 mx-auto text-av-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Layers Found</h3>
              <p className="text-av-text-muted mb-4">
                {mediaServerLayers.length === 0 
                  ? 'Add your first content layer to get started'
                  : 'No layers match your search criteria'
                }
              </p>
              {mediaServerLayers.length === 0 && (
                <button onClick={handleAddLayer} className="btn-primary">Add Layer</button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredLayers.map((layer) => (
                <Card key={layer.id} className="p-6 hover:border-av-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Layers className="w-5 h-5 text-av-accent" />
                        <h3 className="text-lg font-semibold text-av-text">{layer.name}</h3>
                      </div>
                      <p className="text-sm text-av-text-muted mb-3">{layer.content}</p>
                      
                      {layer.outputAssignments.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-av-text-muted mb-2">
                            Assigned to {layer.outputAssignments.length} output{layer.outputAssignments.length !== 1 ? 's' : ''}
                            {layer.outputAssignments.length > 1 && ' (spanning)'}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {layer.outputAssignments.map((assignment, idx) => {
                              const server = mediaServers.find(s => s.id === assignment.serverId);
                              const output = server?.outputs.find(o => o.id === assignment.outputId);
                              return (
                                <span key={idx} className="text-xs bg-av-surface-light px-3 py-1.5 rounded border border-av-border">
                                  {server?.name} → {output?.name || assignment.outputId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditLayer(layer)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLayer(layer.id)}
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
        </>
      )}

      {/* Layer Map Tab - Visual Representation */}
      {activeTab === 'layermap' && (
        <>
          {mediaServers.length === 0 ? (
            <Card className="p-12 text-center">
              <Monitor className="w-16 h-16 mx-auto text-av-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Media Servers</h3>
              <p className="text-av-text-muted mb-4">Add media servers to visualize layer mapping</p>
              <button onClick={() => setActiveTab('servers')} className="btn-primary">Go to Servers</button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Visual Grid: Each row is a layer, columns are outputs */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-av-text mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-av-accent" />
                  Layer Spanning Visualization
                </h2>
                <p className="text-sm text-av-text-muted mb-6">
                  Visual representation of how content layers span across media server outputs
                </p>

                {/* Output Headers - Server Columns */}
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    {/* Header Row */}
                    <div className="flex gap-2 mb-4">
                      <div className="w-48 flex-shrink-0" />
                      {serverPairs.map((pair) => (
                        <React.Fragment key={pair.main.pairNumber}>
                          {/* Main Server Outputs */}
                          {pair.main.outputs.map((output) => (
                            <div key={output.id} className="w-32 flex-shrink-0">
                              <div className="bg-av-surface-light border border-av-border rounded-md p-2 text-center">
                                <div className="text-xs font-semibold text-av-text truncate">{pair.main.name}</div>
                                <div className="text-xs text-av-text-muted truncate mt-1">{output.name}</div>
                                <Badge className="mt-1 text-xs">{output.type}</Badge>
                              </div>
                            </div>
                          ))}
                          {/* Backup Server Outputs */}
                          {pair.backup.outputs.map((output) => (
                            <div key={output.id} className="w-32 flex-shrink-0">
                              <div className="bg-av-surface-light border border-av-border rounded-md p-2 text-center opacity-60">
                                <div className="text-xs font-semibold text-av-text truncate">{pair.backup.name}</div>
                                <div className="text-xs text-av-text-muted truncate mt-1">{output.name}</div>
                                <Badge className="mt-1 text-xs">{output.type}</Badge>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Layer Rows */}
                    {mediaServerLayers.length === 0 ? (
                      <div className="text-center py-8 text-av-text-muted">
                        <p>No layers created yet</p>
                        <button onClick={() => setActiveTab('layers')} className="btn-primary mt-4">
                          Create Layer
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mediaServerLayers.map((layer, layerIndex) => (
                          <div key={layer.id} className="flex gap-2">
                            {/* Layer Name Column */}
                            <div className="w-48 flex-shrink-0 bg-av-surface-light border border-av-border rounded-md p-3 flex flex-col justify-center">
                              <div className="font-semibold text-sm text-av-text truncate">{layer.name}</div>
                              <div className="text-xs text-av-text-muted truncate mt-1">{layer.content}</div>
                            </div>

                            {/* Output Assignment Cells */}
                            {serverPairs.map((pair) => (
                              <React.Fragment key={pair.main.pairNumber}>
                                {/* Main Server Output Cells */}
                                {pair.main.outputs.map((output) => {
                                  const isAssigned = layer.outputAssignments.some(
                                    a => a.serverId === pair.main.id && a.outputId === output.id
                                  );
                                  return (
                                    <div 
                                      key={output.id} 
                                      className="w-32 flex-shrink-0 flex items-center justify-center"
                                    >
                                      {isAssigned ? (
                                        <div 
                                          className="w-full h-16 bg-gradient-to-br from-av-accent/20 to-av-accent/40 border-2 border-av-accent rounded-md flex items-center justify-center"
                                          style={{
                                            backgroundColor: `hsl(${(layerIndex * 137.5) % 360}, 70%, 50%, 0.2)`,
                                            borderColor: `hsl(${(layerIndex * 137.5) % 360}, 70%, 50%)`
                                          }}
                                        >
                                          <Layers className="w-6 h-6" style={{ color: `hsl(${(layerIndex * 137.5) % 360}, 70%, 40%)` }} />
                                        </div>
                                      ) : (
                                        <div className="w-full h-16 bg-av-surface border border-av-border/30 rounded-md" />
                                      )}
                                    </div>
                                  );
                                })}
                                {/* Backup Server Output Cells */}
                                {pair.backup.outputs.map((output) => {
                                  const isAssigned = layer.outputAssignments.some(
                                    a => a.serverId === pair.backup.id && a.outputId === output.id
                                  );
                                  return (
                                    <div 
                                      key={output.id} 
                                      className="w-32 flex-shrink-0 flex items-center justify-center"
                                    >
                                      {isAssigned ? (
                                        <div 
                                          className="w-full h-16 bg-gradient-to-br from-av-accent/10 to-av-accent/20 border-2 border-av-accent/50 rounded-md flex items-center justify-center opacity-60"
                                          style={{
                                            backgroundColor: `hsl(${(layerIndex * 137.5) % 360}, 70%, 50%, 0.1)`,
                                            borderColor: `hsl(${(layerIndex * 137.5) % 360}, 70%, 50%, 0.5)`
                                          }}
                                        >
                                          <Layers className="w-5 h-5" style={{ color: `hsl(${(layerIndex * 137.5) % 360}, 70%, 40%)` }} />
                                        </div>
                                      ) : (
                                        <div className="w-full h-16 bg-av-surface border border-av-border/20 rounded-md opacity-60" />
                                      )}
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-av-border">
                  <p className="text-sm font-semibold text-av-text mb-2">Legend:</p>
                  <div className="flex flex-wrap gap-4 text-xs text-av-text-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-av-accent/30 border-2 border-av-accent rounded" />
                      <span>Main Server Output (Active)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-av-accent/10 border-2 border-av-accent/50 rounded opacity-60" />
                      <span>Backup Server Output</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-av-surface border border-av-border/30 rounded" />
                      <span>Unassigned Output</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Results Count */}
      {activeTab !== 'layermap' && (activeTab === 'servers' ? filteredPairs.length : filteredLayers.length) > 0 && (
        <div className="text-center text-sm text-av-text-muted">
          Showing {activeTab === 'servers' ? filteredPairs.length : filteredLayers.length}{' '}
          {activeTab === 'servers' ? 'server pair' : 'layer'}
          {(activeTab === 'servers' ? filteredPairs.length : filteredLayers.length) !== 1 ? 's' : ''}
        </div>
      )}

      {/* Server Modal */}
      {isServerModalOpen && (
        <ServerPairModal
          isOpen={isServerModalOpen}
          onClose={() => {
            setIsServerModalOpen(false);
            setEditingServer(null);
          }}
          onSave={(platform, outputs, note) => {
            if (editingServer) {
              // Update both main and backup
              const pair = serverPairs.find(p => p.main.pairNumber === editingServer.pairNumber);
              if (pair) {
                updateMediaServer(pair.main.id, { platform, outputs, note });
                updateMediaServer(pair.backup.id, { platform, outputs, note });
              }
            } else {
              addMediaServerPair(platform, outputs, note);
            }
            setIsServerModalOpen(false);
            setEditingServer(null);
          }}
          editingServer={editingServer}
        />
      )}

      {/* Layer Modal */}
      {isLayerModalOpen && (
        <LayerModal
          isOpen={isLayerModalOpen}
          onClose={() => {
            setIsLayerModalOpen(false);
            setEditingLayer(null);
          }}
          onSave={(layer) => {
            if (editingLayer) {
              updateMediaServerLayer(editingLayer.id, layer);
            } else {
              const newLayer: MediaServerLayer = {
                ...layer,
                id: `L${mediaServerLayers.length + 1}`
              };
              addMediaServerLayer(newLayer);
            }
            setIsLayerModalOpen(false);
            setEditingLayer(null);
          }}
          editingLayer={editingLayer}
          availableServers={mediaServers}
        />
      )}
    </div>
  );
}

// Server Pair Modal Component
interface ServerPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (platform: string, outputs: MediaServerOutput[], note?: string) => void;
  editingServer: MediaServer | null;
}

function ServerPairModal({ isOpen, onClose, onSave, editingServer }: ServerPairModalProps) {
  const [platform, setPlatform] = useState(editingServer?.platform || MEDIA_SERVER_PLATFORMS[0]);
  const [outputs, setOutputs] = useState<Omit<MediaServerOutput, 'id'>[]>(
    editingServer?.outputs.map(o => ({ name: o.name, type: o.type, resolution: o.resolution, frameRate: o.frameRate })) || []
  );
  const [note, setNote] = useState(editingServer?.note || '');
  
  // Track which outputs have custom resolution
  const [customResolutions, setCustomResolutions] = useState<{[key: number]: boolean}>({});
  
  // Get the next server number for display purposes
  const { mediaServers } = useProductionStore();
  const nextPairNumber = editingServer?.pairNumber || 
    (mediaServers.length > 0 ? Math.max(...mediaServers.map(s => s.pairNumber)) + 1 : 1);

  // Common resolutions
  const COMMON_RESOLUTIONS = [
    { label: '1920x1080 (HD)', width: 1920, height: 1080 },
    { label: '1920x1200 (WUXGA)', width: 1920, height: 1200 },
    { label: '2560x1440 (QHD)', width: 2560, height: 1440 },
    { label: '3840x2160 (4K UHD)', width: 3840, height: 2160 },
    { label: '4096x2160 (DCI 4K)', width: 4096, height: 2160 },
    { label: '7680x4320 (8K)', width: 7680, height: 4320 },
    { label: 'Custom', width: 0, height: 0 }
  ];
  
  // Common frame rates
  const COMMON_FRAME_RATES = [
    { label: '23.976', value: 23.976 },
    { label: '24', value: 24 },
    { label: '25', value: 25 },
    { label: '29.97', value: 29.97 },
    { label: '30', value: 30 },
    { label: '50', value: 50 },
    { label: '59.94', value: 59.94 },
    { label: '60', value: 60 },
    { label: '120', value: 120 }
  ];

  const handleAddOutput = () => {
    const outputNum = outputs.length + 1;
    setOutputs([...outputs, { 
      name: `MEDIA ${nextPairNumber}A.${outputNum}`, 
      type: 'HDMI',
      resolution: { width: 1920, height: 1080 },
      frameRate: 59.94
    }]);
  };

  const handleRemoveOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  const handleUpdateOutput = (index: number, updates: Partial<Omit<MediaServerOutput, 'id'>>) => {
    setOutputs(outputs.map((o, i) => i === index ? { ...o, ...updates } : o));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(platform, outputs as any, note);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-av-border sticky top-0 bg-av-surface z-10">
            <h2 className="text-2xl font-bold text-av-text">
              {editingServer ? `Edit Media ${editingServer.pairNumber} Pair` : `Add Media ${nextPairNumber} Pair`}
            </h2>
            <p className="text-sm text-av-text-muted mt-1">
              Creates matching Main ({nextPairNumber}A) and Backup ({nextPairNumber}B) servers
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Platform *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-field w-full"
              >
                {MEDIA_SERVER_PLATFORMS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-av-text">Outputs</h3>
                  <p className="text-xs text-av-text-muted mt-1">
                    Will be named MEDIA {nextPairNumber}A.1, {nextPairNumber}A.2, etc. (and matching B outputs)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOutput}
                  className="btn-primary btn-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Output
                </button>
              </div>
              <div className="space-y-3">
                {outputs.map((output, index) => {
                  const isCustomRes = customResolutions[index] || 
                    !COMMON_RESOLUTIONS.find(r => r.width === output.resolution?.width && r.height === output.resolution?.height);
                  
                  return (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        {/* Row 1: Name, Type, Delete */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-av-text-muted mb-1">Name</label>
                            <input
                              type="text"
                              value={output.name}
                              onChange={(e) => handleUpdateOutput(index, { name: e.target.value })}
                              placeholder={`MEDIA ${nextPairNumber}A.${index + 1}`}
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-av-text-muted mb-1">Type</label>
                            <select
                              value={output.type}
                              onChange={(e) => handleUpdateOutput(index, { type: e.target.value as any })}
                              className="input-field w-full"
                            >
                              {OUTPUT_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveOutput(index)}
                              className="w-full p-2 rounded hover:bg-av-danger/20 text-av-danger transition-colors"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Row 2: Resolution Dropdown */}
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">Resolution</label>
                          <select
                            value={isCustomRes ? 'custom' : `${output.resolution?.width}x${output.resolution?.height}`}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setCustomResolutions({ ...customResolutions, [index]: true });
                              } else {
                                const selected = COMMON_RESOLUTIONS.find(r => `${r.width}x${r.height}` === e.target.value);
                                if (selected) {
                                  handleUpdateOutput(index, {
                                    resolution: { width: selected.width, height: selected.height }
                                  });
                                  setCustomResolutions({ ...customResolutions, [index]: false });
                                }
                              }
                            }}
                            className="input-field w-full"
                          >
                            {COMMON_RESOLUTIONS.map(res => (
                              <option key={res.label} value={res.width === 0 ? 'custom' : `${res.width}x${res.height}`}>
                                {res.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Row 3: Custom Resolution Inputs (if custom selected) */}
                        {isCustomRes && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-av-text-muted mb-1">Width</label>
                              <input
                                type="number"
                                value={output.resolution?.width || ''}
                                onChange={(e) => handleUpdateOutput(index, {
                                  resolution: { width: parseInt(e.target.value) || 0, height: output.resolution?.height || 0 }
                                })}
                                placeholder="Width"
                                className="input-field w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-av-text-muted mb-1">Height</label>
                              <input
                                type="number"
                                value={output.resolution?.height || ''}
                                onChange={(e) => handleUpdateOutput(index, {
                                  resolution: { width: output.resolution?.width || 0, height: parseInt(e.target.value) || 0 }
                                })}
                                placeholder="Height"
                                className="input-field w-full"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Row 4: Frame Rate */}
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">Frame Rate</label>
                          <select
                            value={output.frameRate || ''}
                            onChange={(e) => handleUpdateOutput(index, { frameRate: parseFloat(e.target.value) || undefined })}
                            className="input-field w-full"
                          >
                            <option value="">Select frame rate...</option>
                            {COMMON_FRAME_RATES.map(fr => (
                              <option key={fr.value} value={fr.value}>
                                {fr.label} fps
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Notes
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Additional notes (applied to both servers)..."
              />
            </div>
          </div>

          <div className="p-6 border-t border-av-border flex justify-end gap-3 sticky bottom-0 bg-av-surface">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingServer ? 'Update Pair' : 'Create Pair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Layer Modal Component
interface LayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (layer: Omit<MediaServerLayer, 'id'>) => void;
  editingLayer: MediaServerLayer | null;
  availableServers: MediaServer[];
}

function LayerModal({ isOpen, onClose, onSave, editingLayer, availableServers }: LayerModalProps) {
  const [name, setName] = useState(editingLayer?.name || '');
  const [content, setContent] = useState(editingLayer?.content || '');
  const [outputAssignments, setOutputAssignments] = useState(editingLayer?.outputAssignments || []);

  // Only show main servers (not backups) since layer config will be mirrored to backups
  const mainServers = availableServers.filter(s => !s.isBackup);

  const toggleOutputAssignment = (serverId: string, outputId: string) => {
    const exists = outputAssignments.find(a => a.serverId === serverId && a.outputId === outputId);
    if (exists) {
      setOutputAssignments(outputAssignments.filter(a => !(a.serverId === serverId && a.outputId === outputId)));
    } else {
      setOutputAssignments([...outputAssignments, { serverId, outputId }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mirror assignments from A servers to B servers
    const mirroredAssignments = [...outputAssignments];
    outputAssignments.forEach(assignment => {
      // Find the corresponding B server
      const mainServer = availableServers.find(s => s.id === assignment.serverId && !s.isBackup);
      if (mainServer) {
        const backupServer = availableServers.find(s => s.pairNumber === mainServer.pairNumber && s.isBackup);
        if (backupServer) {
          // Find the corresponding output on the backup server
          const mainOutputIndex = mainServer.outputs.findIndex(o => o.id === assignment.outputId);
          if (mainOutputIndex >= 0 && backupServer.outputs[mainOutputIndex]) {
            mirroredAssignments.push({
              serverId: backupServer.id,
              outputId: backupServer.outputs[mainOutputIndex].id
            });
          }
        }
      }
    });
    
    onSave({ name, content, outputAssignments: mirroredAssignments });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-av-border sticky top-0 bg-av-surface z-10">
            <h2 className="text-2xl font-bold text-av-text">
              {editingLayer ? 'Edit Layer' : 'Add Layer'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Layer Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Content Description
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Describe the content for this layer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-3">
                Output Assignments
              </label>
              <p className="text-sm text-av-text-muted mb-4">
                Select outputs from main servers. Layer config will automatically mirror to backup servers.
              </p>
              
              {mainServers.length === 0 ? (
                <p className="text-sm text-av-text-muted text-center py-8">
                  No servers available. Create a server pair first.
                </p>
              ) : (
                <div className="space-y-4">
                  {mainServers.map(server => (
                    <Card key={server.id} className="p-4">
                      <h4 className="font-semibold text-av-text mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        {server.name}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {server.outputs.map(output => (
                          <label key={output.id} className="flex items-center gap-2 bg-av-surface-light px-3 py-2 rounded cursor-pointer hover:bg-av-surface">
                            <input
                              type="checkbox"
                              checked={outputAssignments.some(a => a.serverId === server.id && a.outputId === output.id)}
                              onChange={() => toggleOutputAssignment(server.id, output.id)}
                              className="rounded"
                            />
                            <span className="text-sm text-av-text flex-1">{output.name}</span>
                            <Badge>{output.type}</Badge>
                          </label>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-av-border flex justify-end gap-3 sticky bottom-0 bg-av-surface">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingLayer ? 'Update' : 'Create'} Layer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
