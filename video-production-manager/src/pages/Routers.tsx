import { Card } from '@/components/ui';
import { Share2, Plus } from 'lucide-react';

export default function Routers() {
  const routers: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text mb-2">Routers</h1>
          <p className="text-av-text-muted">Manage video and signal routing matrices</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Router
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-av-accent/10">
              <Share2 className="w-6 h-6 text-av-accent" />
            </div>
            <div>
              <p className="text-sm text-av-text-muted">Total Routers</p>
              <p className="text-2xl font-bold text-av-text">{routers.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Router List */}
      {routers.length === 0 ? (
        <Card className="p-12 text-center">
          <Share2 className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-av-text mb-2">No Routers Yet</h3>
          <p className="text-av-text-muted mb-4">
            Add your first router to start managing signal routing
          </p>
          <button className="btn-primary">Add Router</button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routers.map((router) => (
            <Card key={router.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-av-text mb-2">{router.name}</h3>
                  <div className="flex gap-4 text-sm text-av-text-muted">
                    <span>Inputs: {router.inputs?.length || 0}</span>
                    <span>Outputs: {router.outputs?.length || 0}</span>
                  </div>
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
    </div>
  );
}
