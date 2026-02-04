import React, { useState } from 'react';
import { Card, Badge, ConnectorBadge, EmptyState } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { Projector, Tv2, Cable, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { formatDateOnly } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';

// Screens Page
export const Screens: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const ledScreens = activeProject?.ledScreens || oldStore.ledScreens;
  const screen = ledScreens[0];

  const handleAddScreen = () => {
    // Navigate to Sends page where LED and Projection screens are managed
    navigate('/sends');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-av-text">Screens</h2>
        <button onClick={handleAddScreen} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Manage Screens
        </button>
      </div>

      {!screen ? (
        <EmptyState
          icon={Projector}
          title="No Screens Yet"
          description="Manage LED and projection screens from the Sends page"
          actionLabel="Go to Sends"
          onAction={handleAddScreen}
        />
      ) : (
        screen && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-av-accent/20 flex items-center justify-center">
              <Projector className="w-6 h-6 text-av-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-av-text">{screen.name}</h3>
              <p className="text-sm text-av-text-muted">{screen.tileModel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-av-surface-light rounded-lg">
              <p className="text-xs text-av-text-muted mb-1">Resolution</p>
              <p className="text-lg font-bold text-av-text">
                {screen.pixels.width} × {screen.pixels.height}
              </p>
            </div>
            <div className="p-4 bg-av-surface-light rounded-lg">
              <p className="text-xs text-av-text-muted mb-1">Total Pixels</p>
              <p className="text-lg font-bold text-av-accent">
                {screen.totalPixels.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-av-surface-light rounded-lg">
              <p className="text-xs text-av-text-muted mb-1">Modules</p>
              <p className="text-lg font-bold text-av-text">
                {screen.fullModules.width} × {screen.fullModules.height}
              </p>
            </div>
            <div className="p-4 bg-av-surface-light rounded-lg">
              <p className="text-xs text-av-text-muted mb-1">Processor</p>
              <p className="text-lg font-bold text-av-info">
                {screen.processorModel}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex justify-between py-2 border-b border-av-border">
              <span className="text-sm text-av-text-muted">Dimensions (ft)</span>
              <span className="text-sm">{screen.dimensionsFt.width} × {screen.dimensionsFt.height}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-av-border">
              <span className="text-sm text-av-text-muted">Dimensions (m)</span>
              <span className="text-sm">{screen.dimensionsM.width} × {screen.dimensionsM.height}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-av-border">
              <span className="text-sm text-av-text-muted">Aspect Ratio</span>
              <span className="text-sm">{screen.aspectRatio}:1</span>
            </div>
            <div className="flex justify-between py-2 border-b border-av-border">
              <span className="text-sm text-av-text-muted">Max Tiles/Port</span>
              <span className="text-sm">{screen.maxTilesPerPort}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-av-border">
              <span className="text-sm text-av-text-muted">Port Count</span>
              <span className="text-sm">{screen.processorPortCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-av-border">
              <span className="text-sm text-av-text-muted">Power</span>
              <span className="text-sm">{screen.powerMode}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Vision Switcher Page
export const VisionSwitcher: React.FC = () => {
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const videoSwitchers = activeProject?.videoSwitchers || oldStore.videoSwitchers;
  const switcher = videoSwitchers[0];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '' });

  const handleSubmit = () => {
    if (!formData.id || !formData.name) return;
    // TODO: Add to store
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-av-text">Vision Switcher</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Switcher
        </button>
      </div>

      {!switcher ? (
        <EmptyState
          icon={Tv2}
          title="No Vision Switcher Yet"
          description="Add your first vision switcher to start managing video routing"
          actionLabel="Add Switcher"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        switcher && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-av-info/20 flex items-center justify-center">
                <Tv2 className="w-6 h-6 text-av-info" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-av-text">{switcher.name}</h3>
                <p className="text-sm text-av-text-muted">{switcher.type}</p>
              </div>
            </div>
            {switcher.ip && (
              <Badge variant="success">
                IP: {switcher.ip}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <div>
              <h4 className="text-sm font-medium text-av-text-muted mb-3 uppercase tracking-wider">
                Inputs ({switcher.inputs.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {switcher.inputs.map((input) => (
                  <div key={input.id} className="flex items-center justify-between p-2 bg-av-surface-light rounded">
                    <span className="text-xs text-av-text-muted">{input.id}</span>
                    <ConnectorBadge connector={input.connector} />
                    <span className="text-sm text-av-text truncate max-w-[150px]">
                      {input.feed || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outputs */}
            <div>
              <h4 className="text-sm font-medium text-av-text-muted mb-3 uppercase tracking-wider">
                Outputs ({switcher.outputs.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {switcher.outputs.map((output) => (
                  <div key={output.id} className="flex items-center justify-between p-2 bg-av-surface-light rounded">
                    <span className="text-xs text-av-text-muted">{output.id}</span>
                    <ConnectorBadge connector={output.connector} />
                    <span className="text-sm text-av-text truncate max-w-[150px]">
                      {output.feed || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-av-cardBg rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-av-text mb-4">Add Vision Switcher</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., E2-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., Main E2"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={!formData.id || !formData.name} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Cabling Page
export const Cabling: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-av-text">Cabling & Snakes</h2>
        <p className="text-sm text-av-text-muted">Cable routing and snake management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['ENG Snake', 'Video Snake', 'DSM Snake A', 'DSM Snake B', 'Fiber Snake 01', 'Fiber Snake 02'].map((snake) => (
          <Card key={snake} className="p-4 hover:border-av-accent/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Cable className="w-8 h-8 text-av-purple" />
              <div>
                <h3 className="font-medium text-av-text">{snake}</h3>
                <p className="text-xs text-av-text-muted">Click to view connections</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-av-text mb-4">Cable Length Calculator</h3>
        <p className="text-av-text-muted text-sm">
          Cable management and length tracking coming soon. This will integrate with the LED Cable Tracker sheet data.
        </p>
      </Card>
    </div>
  );
};

// Settings Page
export const Settings: React.FC = () => {
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const production = activeProject?.production || oldStore.production;
  const resetToSampleData = oldStore.resetToSampleData;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-av-text">Settings</h2>
        <p className="text-sm text-av-text-muted">Application configuration and data management</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-av-text mb-4">Production Info</h3>
        {production && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-av-text-muted">Client</label>
              <input className="input-field w-full mt-1" defaultValue={production.client} />
            </div>
            <div>
              <label className="text-sm text-av-text-muted">Show Name</label>
              <input className="input-field w-full mt-1" defaultValue={production.showName} />
            </div>
            <div>
              <label className="text-sm text-av-text-muted">Venue</label>
              <input className="input-field w-full mt-1" defaultValue={production.venue} />
            </div>
            <div>
              <label className="text-sm text-av-text-muted">Room</label>
              <input className="input-field w-full mt-1" defaultValue={production.room} />
            </div>
            <div>
              <label className="text-sm text-av-text-muted">Load In</label>
              <input type="date" className="input-field w-full mt-1" defaultValue={formatDateOnly(production.loadIn)} />
            </div>
            <div>
              <label className="text-sm text-av-text-muted">Load Out</label>
              <input type="date" className="input-field w-full mt-1" defaultValue={formatDateOnly(production.loadOut)} />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-av-text mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-av-surface-light rounded-lg">
            <div>
              <p className="font-medium text-av-text">Reset to Sample Data</p>
              <p className="text-sm text-av-text-muted">Restore all data to original sample values</p>
            </div>
            <button 
              onClick={resetToSampleData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-av-surface-light rounded-lg">
            <div>
              <p className="font-medium text-av-text">Export Data</p>
              <p className="text-sm text-av-text-muted">Download all production data as JSON</p>
            </div>
            <button className="btn-secondary">Export</button>
          </div>
          <div className="flex items-center justify-between p-4 bg-av-surface-light rounded-lg">
            <div>
              <p className="font-medium text-av-text">Import Data</p>
              <p className="text-sm text-av-text-muted">Load production data from file</p>
            </div>
            <button className="btn-secondary">Import</button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-av-text mb-2">About</h3>
        <p className="text-sm text-av-text-muted">
          Video Production Manager v1.0.0
        </p>
        <p className="text-xs text-av-text-muted mt-2">
          Built for professional AV production teams to manage sources, sends, screens, and production checklists.
        </p>
      </Card>
    </div>
  );
};
