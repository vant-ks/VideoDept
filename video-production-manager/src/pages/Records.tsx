import React, { useState, useEffect } from 'react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useRecordAPI } from '@/hooks/useRecordAPI';
import { Card, Badge, EmptyState } from '@/components/ui';
import { Circle, Plus } from 'lucide-react';
import type { Send } from '@/types';

export default function Records() {
  const oldStore = useProductionStore();
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const recordsAPI = useRecordAPI();
  
  const sends = useProductionStore(state => state.sends);
  const [records, setRecords] = useState<Send[]>(sends.filter(s => s.type === 'RECORD'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    setRecords(sends.filter(s => s.type === 'RECORD'));
  }, [sends]);

  const handleSubmit = async () => {
    if (!formData.name || !productionId) return;
    
    try {
      await recordsAPI.createRecord({
        productionId,
        name: formData.name
      });
      setIsModalOpen(false);
      setFormData({ name: '' });
    } catch (error) {
      console.error('Failed to create record:', error);
      alert('Failed to create record. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Records</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Record
        </button>
      </div>

      {/* Records List */}
      {records.length === 0 ? (
        <EmptyState
          icon={Circle}
          title="No Records Yet"
          description="Add your first recording destination"
          actionLabel="Add Record"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-av-text">{record.name}</h3>
                    <Badge variant="danger">RECORD</Badge>
                    <Badge>{record.output}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-av-text-muted">ID:</span>
                      <span className="text-av-text ml-2">{record.id}</span>
                    </div>
                    {record.hRes && record.vRes && (
                      <div>
                        <span className="text-av-text-muted">Resolution:</span>
                        <span className="text-av-text ml-2">{record.hRes}x{record.vRes}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-av-text-muted">Frame Rate:</span>
                      <span className="text-av-text ml-2">{record.rate}</span>
                    </div>
                    {record.secondaryDevice && (
                      <div>
                        <span className="text-av-text-muted">Device:</span>
                        <span className="text-av-text ml-2">{record.secondaryDevice}</span>
                      </div>
                    )}
                  </div>
                  
                  {record.note && (
                    <p className="text-sm text-av-text-muted mt-2">
                      <span className="font-medium">Note:</span> {record.note}
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
            <h2 className="text-xl font-bold text-av-text mb-4">Add Record</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., Main Recorder"
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
