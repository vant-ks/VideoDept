import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import type { CCU } from '@/types';

export default function CCUs() {
  const { ccus, addCCU, updateCCU, deleteCCU, equipmentSpecs } = useProductionStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCCU, setEditingCCU] = useState<CCU | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<CCU>>({
    manufacturer: '',
    model: '',
    outputs: [],
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Get CCU equipment specs from store
  const ccuSpecs = equipmentSpecs.filter(spec => spec.category === 'ccu');
  
  // Get unique manufacturers from equipment specs
  const CCU_MANUFACTURERS = Array.from(new Set(ccuSpecs.map(spec => spec.manufacturer))).sort();
  
  // Get models by manufacturer from equipment specs
  const CCU_MODELS_BY_MANUFACTURER: Record<string, string[]> = {};
  CCU_MANUFACTURERS.forEach(mfr => {
    CCU_MODELS_BY_MANUFACTURER[mfr] = ccuSpecs
      .filter(spec => spec.manufacturer === mfr)
      .map(spec => spec.model)
      .sort();
  });

  // Format options
  const FORMAT_OPTIONS = [
    '1080i59.94',
    '1080i60',
    '1080p59.94',
    '1080p60',
    '1080p50',
    '1080p30',
    '1080p25',
    '1080p24',
    '720p59.94',
    '720p60',
    '4K 59.94',
    '4K 60',
    '4K 50',
    '4K 30',
    '4K 25',
    '4K 24'
  ];

  const filteredCCUs = React.useMemo(() => {
    return ccus.filter(ccu => {
      const query = searchQuery.toLowerCase();
      return (
        ccu.id.toLowerCase().includes(query) ||
        ccu.name.toLowerCase().includes(query) ||
        ccu.manufacturer?.toLowerCase().includes(query) ||
        ccu.model?.toLowerCase().includes(query)
      );
    });
  }, [ccus, searchQuery]);

  const handleAddNew = () => {
    setFormData({ manufacturer: '', model: '', outputs: [] });
    setEditingCCU(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  // Auto-populate outputs when model changes using equipment specs
  const handleModelChange = (model: string) => {
    const spec = ccuSpecs.find(s => s.model === model);
    // Use the new IOPort structure from equipment specs
    const ioOutputs = spec?.outputs || [];
    const ccuNumber = ccus.length + 1;
    const outputs = ioOutputs.map((output, index) => ({
      id: `CCU${ccuNumber}-OUT${index + 1}`,
      type: output.type,
      label: output.label || output.type,
      format: output.format || '1080i59.94'
    }));
    setFormData({ ...formData, model, outputs });
  };

  const handleEdit = (ccu: CCU) => {
    setFormData(ccu);
    setEditingCCU(ccu);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const newErrors: string[] = [];
    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingCCU) {
      updateCCU(editingCCU.id, formData);
    } else {
      // Auto-generate ID and name
      const newId = generateId();
      const ccuData = {
        ...formData,
        id: newId,
        name: newId, // Use ID as name (e.g., "CCU 1")
      } as CCU;
      addCCU(ccuData);
    }
    setIsModalOpen(false);
    setFormData({ manufacturer: '', model: '', outputs: [] });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this CCU?')) {
      deleteCCU(id);
    }
  };

  const generateId = (): string => {
    const ccuNumbers = ccus
      .map(c => {
        const match = c.id.match(/^CCU\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNumber = ccuNumbers.length > 0 ? Math.max(...ccuNumbers) : 0;
    return `CCU ${maxNumber + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">CCUs</h1>
          <p className="text-av-text-muted">Manage Camera Control Units</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add CCU
        </button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <input
          type="text"
          placeholder="Search CCUs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field w-full"
        />
      </Card>

      {/* CCUs List */}
      {filteredCCUs.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-av-text mb-2">No CCUs Found</h3>
          <p className="text-av-text-muted mb-4">
            {ccus.length === 0 ? 'Add your first CCU to get started' : 'No CCUs match your search'}
          </p>
          {ccus.length === 0 && (
            <button onClick={handleAddNew} className="btn-primary">Add CCU</button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCCUs.map((ccu) => (
            <Card key={ccu.id} className="p-6 hover:border-av-accent/30 transition-colors">
              <div className="grid grid-cols-3 gap-6 items-center">
                {/* Left 1/3: ID and Name */}
                <div className="flex items-center gap-12">
                  <span className="text-sm text-av-text">{ccu.id}</span>
                  <h3 className="text-lg font-semibold text-av-text">{ccu.name}</h3>
                </div>
                
                {/* Middle 1/3: Badges */}
                <div className="flex items-center gap-2">
                  {ccu.manufacturer && <Badge>{ccu.manufacturer}</Badge>}
                  {ccu.model && <Badge>{ccu.model}</Badge>}
                </div>
                
                {/* Right 1/3: Format Mode and Action Buttons */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-av-text">
                    {ccu.formatMode || 'N/A'}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(ccu)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ccu.id)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {ccu.note && (
                <div className="mt-3">
                  <p className="text-sm text-av-text-muted">
                    <span className="font-medium">Note:</span> {ccu.note}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-av-surface border border-av-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-av-border">
              <h2 className="text-2xl font-bold text-av-text">
                {editingCCU ? 'Edit CCU' : 'Add New CCU'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-4">
              {errors.length > 0 && (
                <div className="bg-av-danger/10 border border-av-danger rounded-md p-3">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-av-danger">{err}</p>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Manufacturer
                  </label>
                  <select
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value, model: '', outputs: [] })}
                    className="input-field w-full"
                  >
                    <option value="">Select manufacturer...</option>
                    {CCU_MANUFACTURERS.map(mfr => (
                      <option key={mfr} value={mfr}>{mfr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Model
                  </label>
                  <select
                    value={formData.model || ''}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="input-field w-full"
                    disabled={!formData.manufacturer}
                  >
                    <option value="">Select model...</option>
                    {formData.manufacturer && CCU_MODELS_BY_MANUFACTURER[formData.manufacturer]?.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {formData.outputs && formData.outputs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Outputs (Auto-configured from model specs)
                  </label>
                  <div className="space-y-2">
                    {formData.outputs.map((output, index) => (
                      <div key={output.id} className="flex items-center gap-2 p-3 bg-av-surface-hover rounded-lg">
                        <Badge variant="default" className="text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm text-av-text w-32">{output.type}</span>
                        <div className="flex-1">
                          <select
                            value={output.format || ''}
                            onChange={(e) => {
                              const newOutputs = [...(formData.outputs || [])];
                              newOutputs[index] = { ...output, format: e.target.value };
                              setFormData({ ...formData, outputs: newOutputs });
                            }}
                            className="input-field text-sm w-full"
                          >
                            {FORMAT_OPTIONS.map(format => (
                              <option key={format} value={format}>{format}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingCCU ? 'Update' : 'Add'} CCU
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
