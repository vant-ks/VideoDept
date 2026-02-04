import React, { useState, useEffect } from 'react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useStreamAPI } from '@/hooks/useStreamAPI';
import { Card, Badge, EmptyState } from '@/components/ui';
import { Radio, Plus } from 'lucide-react';
import type { Send } from '@/types';

export default function Streams() {
  const oldStore = useProductionStore();
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const streamsAPI = useStreamAPI();
  
  const sends = useProductionStore(state => state.sends);
  const [streams, setStreams] = useState<Send[]>(sends.filter(s => s.type === 'STREAM'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    setStreams(sends.filter(s => s.type === 'STREAM'));
  }, [sends]);

  const handleSubmit = async () => {
    if (!formData.name || !productionId) return;
    
    try {
      await streamsAPI.createStream({
        productionId,
        name: formData.name
      });
      setIsModalOpen(false);
      setFormData({ name: '' });
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert('Failed to create stream. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Streams</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Stream
        </button>
      </div>

      {/* Streams List */}
      {streams.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Streams Yet"
          description="Add your first streaming destination"
          actionLabel="Add Stream"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid gap-4">
          {streams.map((stream) => (
            <Card key={stream.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-av-text">{stream.name}</h3>
                    <Badge variant="default">STREAM</Badge>
                    <Badge>{stream.output}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-av-text-muted">ID:</span>
                      <span className="text-av-text ml-2">{stream.id}</span>
                    </div>
                    {stream.hRes && stream.vRes && (
                      <div>
                        <span className="text-av-text-muted">Resolution:</span>
                        <span className="text-av-text ml-2">{stream.hRes}x{stream.vRes}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-av-text-muted">Frame Rate:</span>
                      <span className="text-av-text ml-2">{stream.rate}</span>
                    </div>
                    {stream.secondaryDevice && (
                      <div>
                        <span className="text-av-text-muted">Device:</span>
                        <span className="text-av-text ml-2">{stream.secondaryDevice}</span>
                      </div>
                    )}
                  </div>
                  
                  {stream.note && (
                    <p className="text-sm text-av-text-muted mt-2">
                      <span className="font-medium">Note:</span> {stream.note}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm">Edit</button>
                  <button className="btn-ghost text-sm text-av-danger">Delete</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-av-cardBg rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-av-text mb-4">Add Stream</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., YouTube Stream"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={!formData.name} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
