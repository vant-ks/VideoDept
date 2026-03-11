// ── Formats page — complete source, do not modify header comment ─────────────
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, MonitorPlay, Search, ChevronUp, ChevronDown, ChevronsUpDown, Copy } from 'lucide-react';
import { Card } from '@/components/ui';
import { apiClient } from '@/services/apiClient';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import type { Format } from '@/types';
import { deriveVideoStandard } from '@/types';
import { FormatFormModal, displayRate } from '@/components/FormatFormModal';

const STD_ORDER: Record<string, number> = { SD: 0, HD: 1, UHD: 2, '4K': 3 };

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
  const [sortKey, setSortKey]             = useState<'id' | 'res' | 'rate' | 'blanking' | 'standard'>('id');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('asc');
  const [duplicatingFrom, setDuplicatingFrom] = useState<Format | null>(null);
  const [category, setCategory]           = useState<'All' | 'Standard' | 'Custom' | 'SD' | 'HD' | 'UHD' | '4K'>('All');

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
      const std = deriveVideoStandard(f.hRes, f.vRes);
      // Category filter
      if (category === 'Standard' && !f.isSystem)  return false;
      if (category === 'Custom'   &&  f.isSystem)  return false;
      if (category === 'SD' || category === 'HD' || category === 'UHD' || category === '4K') {
        if (std !== category) return false;
      }
      // Text search
      if (!q) return true;
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
  }, [formats, search, category]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortedFormats = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredFormats].sort((a, b) => {
      switch (sortKey) {
        case 'id':       return dir * a.id.localeCompare(b.id);
        case 'res':      return dir * (a.hRes * 10000 + a.vRes - (b.hRes * 10000 + b.vRes));
        case 'rate':     return dir * (a.frameRate - b.frameRate);
        case 'blanking': return dir * a.blanking.localeCompare(b.blanking);
        case 'standard': {
          const aStd = deriveVideoStandard(a.hRes, a.vRes);
          const bStd = deriveVideoStandard(b.hRes, b.vRes);
          return dir * ((STD_ORDER[aStd] ?? 99) - (STD_ORDER[bStd] ?? 99));
        }
        default:         return 0;
      }
    });
  }, [filteredFormats, sortKey, sortDir]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => { setEditingFormat(null); setDuplicatingFrom(null); setModalReadOnly(false); setIsModalOpen(true); };
  const openEdit   = (fmt: Format) => {
    setEditingFormat(fmt);
    setDuplicatingFrom(null);
    setModalReadOnly(fmt.isSystem && !isAdmin);
    setIsModalOpen(true);
  };
  const openDuplicate = (fmt: Format) => {
    setEditingFormat(null);
    setDuplicatingFrom(fmt);
    setModalReadOnly(false);
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingFormat(null); setDuplicatingFrom(null); setModalReadOnly(false); };

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

  const totalCustom = formats.filter(f => !f.isSystem).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-av-text flex items-center gap-2">
            <MonitorPlay className="w-8 h-8 text-av-accent" />
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

      {/* Search + filter + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-av-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search formats…"
            className="input-field pl-9 w-full"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as typeof category)}
          className="input-field pr-8"
        >
          {(['All', 'Standard', 'Custom', 'SD', 'HD', 'UHD', '4K'] as const).map(c => (
            <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
          ))}
        </select>
        <p className="text-sm text-av-text-muted whitespace-nowrap">
          {filteredFormats.length} shown{(search || category !== 'All') ? ` of ${formats.length}` : ''}
          {totalCustom > 0 ? ` · ${totalCustom} custom` : ''}
        </p>
      </div>

      {/* Format cards */}
      {isLoading ? (
        <p className="text-sm text-av-text-muted italic py-4">Loading…</p>
      ) : filteredFormats.length === 0 ? (
        <Card className="p-12 text-center">
          <MonitorPlay className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <p className="text-av-text-muted">
            {search ? 'No formats match your search.' : 'No formats found.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-4 py-1">
            {([
              { key: 'id',       label: 'Format',     width: 'w-[35%]' },
              { key: 'res',      label: 'Resolution', width: 'w-[25%]' },
              { key: 'rate',     label: 'Rate',       width: 'w-[10%]' },
              { key: 'blanking', label: 'Blanking',   width: 'w-[10%]' },
              { key: 'standard', label: 'Standard',   width: 'w-[10%]' },
            ] as const).map(col => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`${col.width} flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold transition-colors ${
                  sortKey === col.key ? 'text-av-accent' : 'text-av-text-muted hover:text-av-text'
                }`}
              >
                {col.label}
                {sortKey === col.key
                  ? sortDir === 'asc'
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                  : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
              </button>
            ))}
            <div className="w-16" />{/* spacer for actions column */}
          </div>

          {sortedFormats.map(f => {
            const std      = deriveVideoStandard(f.hRes, f.vRes);
            const stdColor =
              std === '4K' || std === 'UHD' ? 'text-av-warning' :
              std === 'HD'                  ? 'text-av-accent'  :
                                              'text-av-text-muted';
            return (
              <Card
                key={f.uuid}
                className="p-4 hover:border-av-accent/30 transition-colors cursor-pointer select-none"
                onDoubleClick={() => openEdit(f)}
                title={
                  f.isSystem
                    ? (isAdmin ? 'Double-click to edit (admin)' : 'Double-click to view (system preset)')
                    : 'Double-click to edit'
                }
              >
                <div className="flex items-center gap-2">
                  {/* Format — 35% */}
                  <div className="w-[35%] flex items-center gap-2 min-w-0">
                    <MonitorPlay className="w-4 h-4 text-av-accent flex-shrink-0" />
                    <span className={`font-semibold truncate ${f.isSystem ? 'text-av-text' : 'text-av-warning'}`}>
                      {f.id}
                    </span>
                  </div>

                  {/* Resolution — 25% */}
                  <div className="w-[25%] text-sm tabular-nums text-av-text">
                    {f.hRes.toLocaleString()} × {f.vRes.toLocaleString()}
                  </div>

                  {/* Rate — 10% */}
                  <div className="w-[10%] text-sm tabular-nums text-av-text">
                    {displayRate(f.frameRate, f.isInterlaced)}
                  </div>

                  {/* Blanking — 10% */}
                  <div className="w-[10%] text-sm text-av-text-muted">
                    {f.blanking !== 'NONE' ? f.blanking : '—'}
                  </div>

                  {/* Standard — 10% */}
                  <div className={`w-[10%] text-sm font-medium ${stdColor}`}>{std}</div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end flex-shrink-0 w-16">
                    <button
                      onClick={e => { e.stopPropagation(); openDuplicate(f); }}
                      className="p-1.5 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Duplicate as custom format"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {!f.isSystem && (deleteConfirm === f.uuid ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-av-danger">Delete?</span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(f.uuid); }}
                          className="text-xs text-av-danger font-semibold hover:underline"
                        >Yes</button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                          className="text-xs text-av-text-muted hover:underline"
                        >No</button>
                      </span>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(f.uuid); }}
                        className="p-1.5 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete custom format"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Format modal */}
      <FormatFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaved={handleSaved}
        editingFormat={editingFormat}
        duplicateFrom={duplicatingFrom}
        readOnly={modalReadOnly}
      />
    </div>
  );
}
