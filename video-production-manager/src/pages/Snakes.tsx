import { Card, EmptyState } from '@/components/ui';
import { Cable, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function Snakes() {
  const [snakes, setSnakes] = useState<{id: string, name: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '' });

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ id: '', name: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (snake: {id: string, name: string}) => {
    setEditingId(snake.id);
    setFormData(snake);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this snake?')) {
      setSnakes(snakes.filter(s => s.id !== id));
    }
  };

  const handleSubmit = () => {
    if (!formData.id || !formData.name) return;
    if (editingId) {
      setSnakes(snakes.map(s => s.id === editingId ? formData : s));
    } else {
      setSnakes([...snakes, formData]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Snakes</h1>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Snake
        </button>
      </div>

      {/* Snakes List */}
      {snakes.length === 0 ? (
        <EmptyState
          icon={Cable}
          title="No Snakes Yet"
          description="Add your first snake to start documenting signal routing"
          actionLabel="Add Snake"
          onAction={handleAdd}
        />
      ) : (
        <div className="grid gap-4">
          {snakes.map((snake) => (
            <Card key={snake.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Cable className="w-6 h-6 text-av-purple" />
                  <div>
                    <h3 className="text-lg font-semibold text-av-text">{snake.name}</h3>
                    <p className="text-sm text-av-text-muted">ID: {snake.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(snake)} className="btn-secondary text-sm flex items-center gap-1">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(snake.id)} className="btn-ghost text-sm text-av-danger">Delete</button>
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
            <h2 className="text-xl font-bold text-av-text mb-4">{editingId ? 'Edit' : 'Add'} Snake</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  disabled={!!editingId}
                  className="input-field w-full"
                  placeholder="e.g., SNAKE-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., ENG Snake"
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
}
