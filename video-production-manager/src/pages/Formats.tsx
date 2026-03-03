// ── Formats page — complete source, do not modify header comment ─────────────
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Lock, MonitorPlay, Search } from 'lucide-react';
import { Card } from '@/components/ui';
import { apiClient } from '@/services/apiClient';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import type { Format } from '@/types';
import { deriveVideoStandard } from '@/types';
import { FormatFormModal, displayRate } from '@/components/FormatFormModal';

export default function Formats() {
  const { userRole } = usePreferencesStore();
  const isAdmin = userRole === 'admin';

  const [formats, setFormats]             = useState<Format[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [search, setSearch]               = useState('');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingFormat, setEditingFormat] = useState<Format | null>(null);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load formats ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Format[]>('/formats');
      setFormats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load formats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredFormats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formats.filter(f => {
      if (!q) return true;
      const std      = deriveVideoStandard(f.hRes, f.vRes);
      const rate     = displayRate(f.frameRate, f.isInterlaced);
      const res      = `${f.hRes}x${f.vRes}`;
      const blanking = f.blanking !== 'NONE' ? f.blanking.toLowerCase() : '';
      return (
        f.id.toLowerCase().includes(q) ||
        res.includes(q) ||
        rate.toLowerCase().includes(q) ||
        std.toLowerCase().includes(q) ||
        blanking.includes(q)
      );
    });
  }, [formats, search]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => { setEditingFormat(null); setModalReadOnly(false); setIsModalOpen(true); };
  const openEdit   = (fmt: Format) => {
    setEditingFormat(fmt);
    setModalReadOnly(fmt.isSystem && !isAdmin);
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingFormat(null); setModalReadOnly(false); };

  const handleSaved = (saved: Format) => {
    setFormats(prev => {
      const idx = prev.findIndex(f => f.uuid === saved.uuid);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (uuid: string) => {
    try {
      await apiClient.delete(`/formats/${uuid}`);
      setFormats(prev => prev.filter(f => f.uuid !== uuid));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete format.');
    } finally {
      setDeleteConfirm(null);
    }
  }, []);

  // ── Row ───────────────────────────────────────────────────────────────────
  const FormatRow = ({ f }: { f: Format }) => {
    const std      = deriveVideoStandard(f.hRes, f.vRes);
    const stdColor =
      std === '4K' || std === 'UHD' ? 'text-av-warning' :
      std === 'HD'                  ? 'text-av-accent'  :
                                      'text-av-text-muted';
    return (
      <tr
        className="hover:bg-av-surface-hover/40 border-b border-av-border/30 cursor-pointer select-none"
        onDoubleClick={() => openEdit(f)}
        title={
          f.isSystem
            ? (isAdmin ? 'Double-click to edit (admin)' : 'Double-click to view (system preset)')
            : 'Double-click to edit'
        }
      >
        <td className="py-2 pr-4 font-mono text-sm text-av-text">{f.id}</td>
        <td className="py-2 pr-4 text-sm text-av-text tabular-nums">
          {f.hRes.toLocaleString()} × {f.vRes.toLocaleString()}
        </td>
        <td className="py-2 pr-4 text-sm text-av-text tabular-nums">
          {displayRate(f.frameRate, f.isInterlaced)}
        </td>
        <td className="py-2 pr-4 text-sm text-av-text-muted">
          {f.blanking !== 'NONE' ? f.blanking : '—'}
        </td>
        <td className={`py-2 pr-4 text-sm font-medium ${stdColor}`}>{std}</td>
        <td className="py-2 text-right">
          {f.isSystem ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-av-text-muted">
              <Lock className="w-3 h-3" />
              {isAdmin ? 'Admin' : 'System'}
            </span>
          ) : deleteConfirm === f.uuid ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-xs text-av-danger">Delete?</span>
              <button onClick={e => { e.stopPropagation(); handleDelete(f.uuid); }} className="text-xs text-av-danger font-semibold hover:underline">Yes</button>
              <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-xs text-av-text-muted hover:underline">No</button>
            </span>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setDeleteConfirm(f.uuid); }}
              className="p-1 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
              title="Delete custom format"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  const totalCustom = formats.filter(f => !f.isSystem).length;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-av-text flex items-center gap-2">
            <MonitorPlay className="w-6 h-6 text-av-accent" />
            Formats
          </h1>
          <p className="text-sm text-av-text-muted mt-1">
            Video format presets used across I/O ports. System presets are{' '}
            {isAdmin ? <strong>editable (admin)</strong> : 'read-only'}.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Add Custom Format
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-av-text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search formats…"
          className="input-field pl-9 w-full"
        />
      </div>

      {/* Unified table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-av-text">
            All Formats
            <span className="ml-2 text-av-text-muted font-normal">
              ({filteredFormats.length} shown{search ? ` of ${formats.length}` : ''}
              {totalCustom > 0 ? ` · ${totalCustom} custom` : ''})
            </span>
          </h2>
          <p className="text-[10px] text-av-text-muted italic">Double-click a row to view or edit</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-av-text-muted italic py-4">Loading…</p>
        ) : filteredFormats.length === 0 ? (
          <p className="text-sm text-av-text-muted italic py-4">
            {search ? 'No formats match your search.' : 'No formats found.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-av-text-muted border-b border-av-border">
                  <th className="text-left pb-2 pr-4 font-semibold">Format</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Resolution</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Rate</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Blanking</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Standard</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFormats.map(f => (
                  <FormatRow key={f.uuid} f={f} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Format modal */}
      <FormatFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaved={handleSaved}
        editingFormat={editingFormat}
        readOnly={modalReadOnly}
      />
    </div>
  );
}
