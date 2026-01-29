import React, { useState } from 'react';
import { Card, Badge, ConnectorBadge, EmptyState } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { Tv2, Plus } from 'lucide-react';

export const CamSwitcher: React.FC = () => {
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
        <h2 className="text-xl font-bold text-av-text">Cam Switcher</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Switcher
        </button>
      </div>

      {!switcher ? (
        <EmptyState
          icon={Tv2}
          title="No Cam Switcher Yet"
          description="Add your first camera switcher to start managing camera routing"
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
            <h2 className="text-xl font-bold text-av-text mb-4">Add Cam Switcher</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., CAM-SW-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., Camera Switcher"
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

export default CamSwitcher;
