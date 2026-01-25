import { Card } from '@/components/ui';
import { Cable, Plus } from 'lucide-react';

export default function Snakes() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Snakes</h1>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Snake
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-av-purple/10">
              <Cable className="w-6 h-6 text-av-purple" />
            </div>
            <div>
              <p className="text-sm text-av-text-muted">Total Snakes</p>
              <p className="text-2xl font-bold text-av-text">0</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="p-12 text-center">
        <Cable className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-av-text mb-2">No Snakes Yet</h3>
        <p className="text-av-text-muted mb-4">
          Add your first snake to start documenting signal routing
        </p>
        <button className="btn-primary">Add Snake</button>
      </Card>

      {/* Info Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-av-text mb-4">Snake Management</h3>
        <div className="space-y-3 text-sm text-av-text-muted">
          <p>
            Document your cable runs and multi-pair snakes to keep track of signal routing 
            between FOH, stage, and other locations.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-av-text font-medium mb-2">Snake Types:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Engineering (ENG)</li>
                <li>Video Multi-pair</li>
                <li>DSM A & B</li>
                <li>Fiber Optic</li>
              </ul>
            </div>
            <div>
              <h4 className="text-av-text font-medium mb-2">Track:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Source to destination mapping</li>
                <li>Connector types</li>
                <li>Cable lengths</li>
                <li>Testing notes</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
