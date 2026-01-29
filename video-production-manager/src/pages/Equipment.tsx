import { useState } from 'react';
import { Plus, Edit2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import EquipmentFormModal from '@/components/EquipmentFormModal';
import type { EquipmentSpec, IOPort, EquipmentCard } from '@/types';

export default function Equipment() {
  // Use new stores
  const equipmentLib = useEquipmentLibrary();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  
  const equipmentSpecs = equipmentLib.equipmentSpecs.length > 0 ? equipmentLib.equipmentSpecs : oldStore.equipmentSpecs;
  const updateEquipmentSpec = equipmentLib.updateEquipmentSpec || oldStore.updateEquipmentSpec;
  const addEquipmentSpec = equipmentLib.addEquipmentSpec || oldStore.addEquipmentSpec;
  const connectorTypes = equipmentLib.connectorTypes.length > 0 ? equipmentLib.connectorTypes : oldStore.connectorTypes;
  const frameRates = equipmentLib.frameRates.length > 0 ? equipmentLib.frameRates : oldStore.frameRates;
  const resolutions = equipmentLib.resolutions.length > 0 ? equipmentLib.resolutions : oldStore.resolutions;
  
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<EquipmentSpec | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'camera' | 'ccu' | 'switcher' | 'router' | 'led-processor' | 'led-tile' | 'projector' | 'recorder' | 'monitor' | 'converter'>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [collapsedEquipment, setCollapsedEquipment] = useState<Set<string>>(() => {
    // Start with all collapsed
    return new Set(equipmentSpecs.map(spec => spec.id));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredSpecs = equipmentSpecs.filter(spec => {
    const matchesCategory = selectedCategory === 'all' || spec.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      spec.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spec.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Build format options from resolutions and frame rates
  const FORMAT_OPTIONS = [
    ...(resolutions && frameRates ? resolutions.flatMap(res => 
      frameRates.map(rate => `${res}${rate}`)
    ) : []),
    '12G', '6G', '3G', 'HD', 'SD', 'IP', 'Custom'
  ];

  const IO_TYPE_OPTIONS = connectorTypes || [];

  const toggleCardExpansion = (equipId: string, cardId: string) => {
    const key = `${equipId}-${cardId}`;
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleEquipmentCollapse = (equipId: string) => {
    setCollapsedEquipment(prev => {
      const newSet = new Set(prev);
      if (newSet.has(equipId)) {
        newSet.delete(equipId);
      } else {
        newSet.add(equipId);
      }
      return newSet;
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      camera: 'Camera',
      ccu: 'CCU',
      switcher: 'Switcher',
      router: 'Router',
      'led-processor': 'LED Processor',
      'led-tile': 'LED Tile',
      projector: 'Projector',
      recorder: 'Recorder',
      monitor: 'Monitor',
      converter: 'Converter'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      camera: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ccu: 'bg-green-500/20 text-green-400 border-green-500/30',
      switcher: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      router: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'led-processor': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'led-tile': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      projector: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      recorder: 'bg-red-500/20 text-red-400 border-red-500/30',
      monitor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      converter: 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    };
    return colors[category] || 'bg-av-surface-light text-av-text border-av-border';
  };

  // Handle modal actions
  const handleAddNew = () => {
    setEditingSpec(null);
    setIsModalOpen(true);
  };

  const handleEditSpec = (spec: EquipmentSpec) => {
    setEditingSpec(spec);
    setIsModalOpen(true);
  };

  const handleSaveEquipment = (equipment: Omit<EquipmentSpec, 'id'>) => {
    if (editingSpec) {
      // Update existing
      updateEquipmentSpec(editingSpec.id, equipment);
    } else {
      // Add new
      const newEquipment: EquipmentSpec = {
        ...equipment,
        id: `${equipment.category}-${Date.now()}`
      };
      addEquipmentSpec(newEquipment);
    }
    setIsModalOpen(false);
    setEditingSpec(null);
  };

  // Add new I/O port (for direct I/O equipment)
  const addIOPort = (specId: string, ioType: 'inputs' | 'outputs') => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec || spec.ioArchitecture !== 'direct') return;

    const newPort: IOPort = {
      id: `${ioType}-${Date.now()}`,
      type: 'SDI',
      label: ioType === 'inputs' ? 'Input' : 'Output'
    };

    const currentPorts = spec[ioType] || [];
    updateEquipmentSpec(specId, { [ioType]: [...currentPorts, newPort] });
  };

  // Remove I/O port
  const removeIOPort = (specId: string, ioType: 'inputs' | 'outputs', portId: string) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const currentPorts = spec[ioType] || [];
    updateEquipmentSpec(specId, { [ioType]: currentPorts.filter(p => p.id !== portId) });
  };

  // Update I/O port
  const updateIOPort = (specId: string, ioType: 'inputs' | 'outputs', portId: string, updates: Partial<IOPort>) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const currentPorts = spec[ioType] || [];
    const updatedPorts = currentPorts.map(port => 
      port.id === portId ? { ...port, ...updates } : port
    );
    updateEquipmentSpec(specId, { [ioType]: updatedPorts });
  };

  // Add card to card-based equipment
  const addCard = (specId: string) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec || spec.ioArchitecture !== 'card-based') return;

    const currentCards = spec.cards || [];
    const nextSlot = currentCards.length > 0 
      ? Math.max(...currentCards.map(c => c.slotNumber)) + 1 
      : 1;

    const newCard: EquipmentCard = {
      id: `card-${Date.now()}`,
      slotNumber: nextSlot,
      inputs: [],
      outputs: []
    };

    updateEquipmentSpec(specId, { cards: [...currentCards, newCard] });
  };

  // Remove card
  const removeCard = (specId: string, cardId: string) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const currentCards = spec.cards || [];
    updateEquipmentSpec(specId, { cards: currentCards.filter(c => c.id !== cardId) });
  };

  // Update card
  const updateCard = (specId: string, cardId: string, updates: Partial<EquipmentCard>) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const currentCards = spec.cards || [];
    const updatedCards = currentCards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    updateEquipmentSpec(specId, { cards: updatedCards });
  };

  // Add I/O to card
  const addCardIO = (specId: string, cardId: string, ioType: 'inputs' | 'outputs') => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const card = spec.cards?.find(c => c.id === cardId);
    if (!card) return;

    const newPort: IOPort = {
      id: `${ioType}-${Date.now()}`,
      type: 'SDI',
      label: ioType === 'inputs' ? 'Input' : 'Output'
    };

    const currentPorts = card[ioType] || [];
    updateCard(specId, cardId, { [ioType]: [...currentPorts, newPort] });
  };

  // Remove I/O from card
  const removeCardIO = (specId: string, cardId: string, ioType: 'inputs' | 'outputs', portId: string) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const card = spec.cards?.find(c => c.id === cardId);
    if (!card) return;

    const currentPorts = card[ioType] || [];
    updateCard(specId, cardId, { [ioType]: currentPorts.filter(p => p.id !== portId) });
  };

  // Update card I/O
  const updateCardIO = (specId: string, cardId: string, ioType: 'inputs' | 'outputs', portId: string, updates: Partial<IOPort>) => {
    const spec = equipmentSpecs.find(s => s.id === specId);
    if (!spec) return;

    const card = spec.cards?.find(c => c.id === cardId);
    if (!card) return;

    const currentPorts = card[ioType] || [];
    const updatedPorts = currentPorts.map(port => 
      port.id === portId ? { ...port, ...updates } : port
    );
    updateCard(specId, cardId, { [ioType]: updatedPorts });
  };

  return (
    <div className="space-y-6">
      {/* Equipment Form Modal */}
      <EquipmentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSpec(null);
        }}
        onSave={handleSaveEquipment}
        editingEquipment={editingSpec}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Equipment Specifications</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary whitespace-nowrap">
          <Plus className="w-5 h-5 mr-2" />
          Add Equipment
        </button>
      </div>

      {/* Search and Category Filter */}
      <Card className="p-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-av-surface-light hover:bg-av-surface text-av-text border border-av-border rounded-md transition-colors flex items-center gap-2"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
            )}
          </button>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="input-field w-48"
          >
            <option value="all">All Equipment</option>
            <option value="camera">Cameras</option>
            <option value="ccu">CCUs</option>
            <option value="switcher">Switchers</option>
            <option value="router">Routers</option>
            <option value="led-processor">LED Processors</option>
            <option value="led-tile">LED Tiles</option>
            <option value="projector">Projectors</option>
            <option value="recorder">Recorders</option>
            <option value="monitor">Monitors</option>
            <option value="converter">Converters</option>
          </select>
        </div>
      </Card>

      {/* Equipment List */}
      <div className="space-y-4">
        {filteredSpecs.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold text-av-text mb-2">No Equipment Found</h3>
            <p className="text-av-text-muted">Add your first piece of equipment to get started</p>
          </Card>
        ) : (
          filteredSpecs
            .sort((a, b) => {
              // Sort by category, then manufacturer, then model
              const catCompare = a.category.localeCompare(b.category);
              if (catCompare !== 0) return sortOrder === 'asc' ? catCompare : -catCompare;
              const mfrCompare = a.manufacturer.localeCompare(b.manufacturer);
              if (mfrCompare !== 0) return sortOrder === 'asc' ? mfrCompare : -mfrCompare;
              return sortOrder === 'asc' ? a.model.localeCompare(b.model) : b.model.localeCompare(a.model);
            })
            .map((spec) => {
              const isCollapsed = collapsedEquipment.has(spec.id);
              return (
              <Card key={spec.id} className={isCollapsed ? "p-3" : "p-6"}>
                <div 
                  className={`flex items-start justify-between cursor-pointer ${isCollapsed ? '' : 'mb-4'}`}
                  onClick={() => toggleEquipmentCollapse(spec.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-av-text-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-av-text-muted" />
                      )}
                      <h3 className="text-lg font-semibold text-av-text">
                        {spec.manufacturer} {spec.model}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded border ${getCategoryColor(spec.category)}`}>
                        {getCategoryLabel(spec.category)}
                      </span>
                      {spec.isSecondaryDevice && (
                        <span className="text-xs px-2 py-1 rounded border bg-green-500/20 text-green-400 border-green-500/30">
                          Secondary Device
                        </span>
                      )}
                      {editingEquipment === spec.id ? (
                        <select
                          value={spec.ioArchitecture}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateEquipmentSpec(spec.id, { 
                              ioArchitecture: e.target.value as 'direct' | 'card-based',
                              ...(e.target.value === 'direct' ? { cards: [] } : {})
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-2 py-1 rounded border bg-av-surface-light text-av-text border-av-border"
                        >
                          <option value="direct">Direct I/O</option>
                          <option value="card-based">Card-Based</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded border ${
                          spec.ioArchitecture === 'direct' 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {spec.ioArchitecture === 'direct' ? 'Direct I/O' : 'Card-Based'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditSpec(spec)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Edit Equipment Info"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isCurrentlyEditing = editingEquipment === spec.id;
                        setEditingEquipment(isCurrentlyEditing ? null : spec.id);
                        // Reveal equipment when entering edit mode, collapse when exiting
                        if (isCurrentlyEditing) {
                          // Exiting edit mode - collapse
                          setCollapsedEquipment(prev => new Set([...prev, spec.id]));
                        } else {
                          // Entering edit mode - reveal
                          setCollapsedEquipment(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(spec.id);
                            return newSet;
                          });
                        }
                      }}
                      className={`p-2 rounded-md transition-colors ${
                        editingEquipment === spec.id
                          ? 'bg-av-accent/20 text-av-accent'
                          : 'hover:bg-av-surface-light text-av-text-muted hover:text-av-accent'
                      }`}
                      title="Edit I/O Configuration"
                    >
                      <X className={editingEquipment === spec.id ? 'w-5 h-5' : 'hidden'} />
                      <span className={editingEquipment === spec.id ? 'hidden' : 'text-xs'}>I/O</span>
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                <div className="grid grid-cols-2 gap-6">
                    {/* Inputs */}
                    <div>
                      <h4 className="text-sm font-semibold text-av-text mb-3 flex items-center justify-between">
                        Inputs ({spec.inputs?.length || 0})
                        {editingEquipment === spec.id && (
                          <button
                            onClick={() => addIOPort(spec.id, 'inputs')}
                            className="text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Add
                          </button>
                        )}
                      </h4>
                      <div className="space-y-2">
                        {spec.inputs && spec.inputs.length > 0 ? (
                          spec.inputs.map((input) => (
                            <div key={input.id} className="flex items-center gap-2">
                              {editingEquipment === spec.id ? (
                                <>
                                  <select
                                    value={input.type}
                                    onChange={(e) => updateIOPort(spec.id, 'inputs', input.id, { type: e.target.value })}
                                    className="input-field flex-1 text-sm"
                                  >
                                    {IO_TYPE_OPTIONS.map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={input.label || ''}
                                    onChange={(e) => updateIOPort(spec.id, 'inputs', input.id, { label: e.target.value })}
                                    placeholder="Label"
                                    className="input-field flex-1 text-sm"
                                  />
                                  {spec.formatByIO && (
                                    <select
                                      value={input.format || ''}
                                      onChange={(e) => updateIOPort(spec.id, 'inputs', input.id, { format: e.target.value })}
                                      className="input-field flex-1 text-sm"
                                    >
                                      <option value="">No format</option>
                                      {FORMAT_OPTIONS.map(fmt => (
                                        <option key={fmt} value={fmt}>{fmt}</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    onClick={() => removeIOPort(spec.id, 'inputs', input.id)}
                                    className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <div className="text-sm bg-av-surface px-3 py-2 rounded border border-av-border flex-1">
                                  <span className="font-medium">{input.type}</span>
                                  {input.label && <span className="text-av-text-muted"> - {input.label}</span>}
                                  {input.format && <span className="text-av-text-muted"> ({input.format})</span>}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-av-text-muted">No inputs configured</p>
                        )}
                      </div>
                    </div>

                    {/* Outputs */}
                    <div>
                      <h4 className="text-sm font-semibold text-av-text mb-3 flex items-center justify-between">
                        Outputs ({spec.outputs?.length || 0})
                        {editingEquipment === spec.id && (
                          <button
                            onClick={() => addIOPort(spec.id, 'outputs')}
                            className="text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Add
                          </button>
                        )}
                      </h4>
                      <div className="space-y-2">
                        {spec.outputs && spec.outputs.length > 0 ? (
                          spec.outputs.map((output) => (
                            <div key={output.id} className="flex items-center gap-2">
                              {editingEquipment === spec.id ? (
                                <>
                                  <select
                                    value={output.type}
                                    onChange={(e) => updateIOPort(spec.id, 'outputs', output.id, { type: e.target.value })}
                                    className="input-field flex-1 text-sm"
                                  >
                                    {IO_TYPE_OPTIONS.map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={output.label || ''}
                                    onChange={(e) => updateIOPort(spec.id, 'outputs', output.id, { label: e.target.value })}
                                    placeholder="Label"
                                    className="input-field flex-1 text-sm"
                                  />
                                  {spec.formatByIO && (
                                    <select
                                      value={output.format || ''}
                                      onChange={(e) => updateIOPort(spec.id, 'outputs', output.id, { format: e.target.value })}
                                      className="input-field flex-1 text-sm"
                                    >
                                      <option value="">No format</option>
                                      {FORMAT_OPTIONS.map(fmt => (
                                        <option key={fmt} value={fmt}>{fmt}</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    onClick={() => removeIOPort(spec.id, 'outputs', output.id)}
                                    className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <div className="text-sm bg-av-surface px-3 py-2 rounded border border-av-border flex-1">
                                  <span className="font-medium">{output.type}</span>
                                  {output.label && <span className="text-av-text-muted"> - {output.label}</span>}
                                  {output.format && <span className="text-av-text-muted"> ({output.format})</span>}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-av-text-muted">No outputs configured</p>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Card-Based I/O Display/Edit */}
                {spec.ioArchitecture === 'card-based' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-av-text">
                        Card Slots: {spec.cardSlots || 0} ({spec.cards?.length || 0} installed)
                      </h4>
                      {editingEquipment === spec.id && (
                        <button
                          onClick={() => addCard(spec.id)}
                          className="text-sm px-3 py-1.5 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30"
                        >
                          <Plus className="w-4 h-4 inline mr-1" />
                          Add Card
                        </button>
                      )}
                    </div>

                    {spec.cards && spec.cards.length > 0 ? (
                      <div className="space-y-3">
                        {spec.cards
                          .sort((a, b) => a.slotNumber - b.slotNumber)
                          .map((card) => {
                            const isExpanded = expandedCards.has(`${spec.id}-${card.id}`);
                            return (
                              <div key={card.id} className="border border-av-border rounded-md overflow-hidden">
                                <button
                                  onClick={() => toggleCardExpansion(spec.id, card.id)}
                                  className="w-full flex items-center justify-between p-3 bg-av-surface-light hover:bg-av-surface transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-av-text-muted" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-av-text-muted" />
                                    )}
                                    <span className="text-sm font-medium text-av-text">
                                      Slot {card.slotNumber}
                                    </span>
                                    <span className="text-xs text-av-text-muted">
                                      {card.inputs.length} in / {card.outputs.length} out
                                    </span>
                                  </div>
                                  {editingEquipment === spec.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeCard(spec.id, card.id);
                                      }}
                                      className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="p-4 border-t border-av-border">
                                    {/* Card Info */}
                                    {editingEquipment === spec.id && (
                                      <div className="mb-4">
                                        <label className="block text-xs text-av-text-muted mb-1">Slot Number</label>
                                        <input
                                          type="number"
                                          value={card.slotNumber}
                                          onChange={(e) => updateCard(spec.id, card.id, { slotNumber: parseInt(e.target.value) })}
                                          placeholder="Slot #"
                                          className="input-field text-sm w-32"
                                        />
                                      </div>
                                    )}

                                    {/* Card I/O */}
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Card Inputs */}
                                      <div>
                                        <h5 className="text-xs font-semibold text-av-text mb-2 flex items-center justify-between">
                                          Inputs ({card.inputs.length})
                                          {editingEquipment === spec.id && (
                                            <button
                                              onClick={() => addCardIO(spec.id, card.id, 'inputs')}
                                              className="text-xs px-2 py-0.5 bg-av-accent/20 text-av-accent rounded"
                                            >
                                              <Plus className="w-3 h-3 inline" />
                                            </button>
                                          )}
                                        </h5>
                                        <div className="space-y-1.5">
                                          {card.inputs.map((input) => (
                                            <div key={input.id} className="flex items-center gap-2">
                                              {editingEquipment === spec.id ? (
                                                <>
                                                  <select
                                                    value={input.type}
                                                    onChange={(e) => updateCardIO(spec.id, card.id, 'inputs', input.id, { type: e.target.value })}
                                                    className="input-field flex-1 text-xs"
                                                  >
                                                    {IO_TYPE_OPTIONS.map(type => (
                                                      <option key={type} value={type}>{type}</option>
                                                    ))}
                                                  </select>
                                                  <input
                                                    type="text"
                                                    value={input.label || ''}
                                                    onChange={(e) => updateCardIO(spec.id, card.id, 'inputs', input.id, { label: e.target.value })}
                                                    placeholder="Label"
                                                    className="input-field flex-1 text-xs"
                                                  />
                                                  <button
                                                    onClick={() => removeCardIO(spec.id, card.id, 'inputs', input.id)}
                                                    className="p-1 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </>
                                              ) : (
                                                <div className="text-xs bg-av-surface px-2 py-1 rounded border border-av-border flex-1">
                                                  {input.type} {input.label && `- ${input.label}`}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Card Outputs */}
                                      <div>
                                        <h5 className="text-xs font-semibold text-av-text mb-2 flex items-center justify-between">
                                          Outputs ({card.outputs.length})
                                          {editingEquipment === spec.id && (
                                            <button
                                              onClick={() => addCardIO(spec.id, card.id, 'outputs')}
                                              className="text-xs px-2 py-0.5 bg-av-accent/20 text-av-accent rounded"
                                            >
                                              <Plus className="w-3 h-3 inline" />
                                            </button>
                                          )}
                                        </h5>
                                        <div className="space-y-1.5">
                                          {card.outputs.map((output) => (
                                            <div key={output.id} className="flex items-center gap-2">
                                              {editingEquipment === spec.id ? (
                                                <>
                                                  <select
                                                    value={output.type}
                                                    onChange={(e) => updateCardIO(spec.id, card.id, 'outputs', output.id, { type: e.target.value })}
                                                    className="input-field flex-1 text-xs"
                                                  >
                                                    {IO_TYPE_OPTIONS.map(type => (
                                                      <option key={type} value={type}>{type}</option>
                                                    ))}
                                                  </select>
                                                  <input
                                                    type="text"
                                                    value={output.label || ''}
                                                    onChange={(e) => updateCardIO(spec.id, card.id, 'outputs', output.id, { label: e.target.value })}
                                                    placeholder="Label"
                                                    className="input-field flex-1 text-xs"
                                                  />
                                                  <button
                                                    onClick={() => removeCardIO(spec.id, card.id, 'outputs', output.id)}
                                                    className="p-1 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </>
                                              ) : (
                                                <div className="text-xs bg-av-surface px-2 py-1 rounded border border-av-border flex-1">
                                                  {output.type} {output.label && `- ${output.label}`}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-sm text-av-text-muted text-center py-4">
                        No cards installed
                      </p>
                    )}
                  </div>
                )}
                  </>
                )}
              </Card>
              );
            })
        )}
      </div>
    </div>
  );
}
