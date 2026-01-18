import { useProductionStore } from '@/hooks/useStore';
import { Card, Badge } from '@/components/ui';
import { Circle, Plus } from 'lucide-react';

export default function Records() {
  const sends = useProductionStore(state => state.sends);
  const records = sends.filter(s => s.type === 'RECORD' || s.type === 'STREAM');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text mb-2">Records & Streams</h1>
          <p className="text-av-text-muted">Manage recording and streaming destinations</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Record/Stream
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-av-danger/10">
              <Circle className="w-6 h-6 text-av-danger" />
            </div>
            <div>
              <p className="text-sm text-av-text-muted">Total Outputs</p>
              <p className="text-2xl font-bold text-av-text">{records.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div>
            <p className="text-sm text-av-text-muted">Record Feeds</p>
            <p className="text-2xl font-bold text-av-text">
              {records.filter(r => r.type === 'RECORD').length}
            </p>
          </div>
        </Card>
        
        <Card className="p-6">
          <div>
            <p className="text-sm text-av-text-muted">Stream Feeds</p>
            <p className="text-2xl font-bold text-av-text">
              {records.filter(r => r.type === 'STREAM').length}
            </p>
          </div>
        </Card>
      </div>

      {/* Records List */}
      {records.length === 0 ? (
        <Card className="p-12 text-center">
          <Circle className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-av-text mb-2">No Record Outputs Yet</h3>
          <p className="text-av-text-muted mb-4">
            Add your first recording or streaming destination
          </p>
          <button className="btn-primary">Add Record/Stream</button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-av-text">{record.name}</h3>
                    <Badge variant={record.type === 'RECORD' ? 'danger' : 'default'}>
                      {record.type}
                    </Badge>
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
    </div>
  );
}
