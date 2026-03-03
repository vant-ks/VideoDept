import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Lock, MonitorPlay } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { apiClient } from '@/services/apiClient';
import type { Format } from '@/types';
import { deriveVideoStandard } from '@/types';

// ── Blanking options ──────────────────────────────────────────────────────────
const BLANKING_OPTIONS = ['NONE', 'RBv1', 'RBv2', 'RBv3'] as const;
type BlankingOption = typeof BLANKING_OPTIONS[number];

// ── Auto-suggest an id from specs ─────────────────────────────────────────────
function suggestFormatId(
  hRes: number,
  vRes: number,
  frameRate: number,
  isInterlaced: boolean,
): string {
  const std = deriveVideoStandard(hRes, vRes);
  const prefix =
    std === '4K'   ? `${hRes}` :
    std === 'UHD'  ? '4K' :
    std === 'HD'   ? `${vRes}` :
    `${vRes}`;
  const suffix = frameRate.toString().replace('.', '');
  const scan   = isInterlaced ? 'i' : 'p';
  return `${prefix}${scan}${suffix}`;
}

// ── Blank form state ──────────────────────────────────────────────────────────
const blankForm = () => ({
  hRes:        1920,
  vRes:        1080,
  frameRate:   59.94,
  isInterlaced:false,
  blanking:    'NONE' as BlankingOption,
  id:          '1080p5994',
});

export default function Formats() {
  const [formats, setFormats]       = useState<Format[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState(blankForm());
  const [formError, setFormError]   = useState<string | null>(null);
  const [isSaving, setIsSaving]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load formats ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Format[]>('/formats');
      setFormats(data);
    } catch (err) {
      console.error('Failed to load formats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Auto-update id suggestion when specs change ──────────────────────────
  const handleSpecChange = useCallback(
    (updates: Partial<typeof formData>) => {
      setFormData(prev => {
        const next = { ...prev, ...updates };
        next.id = suggestFormatId(next.hRes, next.vRes, next.frameRate, next.isInterlaced);
        return next;
      });
    },
    [],
  );

  // ── Save custom format ──────────────────────────────────────────────────────
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.id.trim())  { setFormError('Format ID is required.'); return; }
    if (!formData.hRes)       { setFormError('H Res is required.'); return; }
    if (!formData.vRes)       { setFormError('V Res is required.'); return; }
    if (!formData.frameRate)  { setFormError('Frame Rate is required.'); return; }

    setIsSaving(true);
    try {
      const created = await apiClient.post<Format>('/formats', {
        id:          formData.id.trim(),
        hRes:        formData.hRes,
        vRes:        formData.vRes,
        frameRate:   formData.frameRate,
        isInterlaced:formData.isInterlaced,
        blanking:    formData.blanking,
      });
      setFormats(prev => [...prev, created]);
      setShowForm(false);
      setFormData(blankForm());
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create format.');
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  // ── Delete custom format ────────────────────────────────────────────────────
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

  // ── Derived groupings ───────────────────────────────────────────────────────
  const systemFormats = formats.filter(f => f.isSystem);
  const customFormats = formats.filter(f => !f.isSystem);

  // ── Row renderer ──────────────────────────────────────────────────────────
  const FormatRow = ({ f, deletable }: { f: Format; deletable: boolean }) => {
    const std       = deriveVideoStandard(f.hRes, f.vRes);
    const rateLabel = f.frameRate.toString();
    const scan      = f.isInterlaced ? 'i' : 'p';

    return (
      <tr className="hover:bg-av-surface-hover/40 border-b border-av-border/30">
        <td className="py-2 pr-4 font-mono text-sm text-av-text">{f.id}</td>
        <td className="py-2 pr-4">
          <Badge variant={std === '4K' || std === 'UHD' ? 'warning' : 'default'}>{std}</Badge>
        </td>
        <td className="py-2 pr-4 text-sm text-av-text tabular-nums">
          {f.hRes.toLocaleString()} × {f.vRes.toLocaleString()}
        </td>
        <td className="py-2 pr-4 text-sm text-av-text tabular-nums">
          {scan}{rateLabel}
        </td>
        <td className="py-2 pr-4 text-sm text-av-text-muted">
          {f.blanking !== 'NONE' ? f.blanking : '—'}
        </td>
        <td className="py-2 pr-4">
          {f.isSystem
            ? <span className="inline-flex items-center gap-1 text-[10px] text-av-text-muted"><Lock className="w-3 h-3" />System</span>
            : <span className="text-[10px] text-av-info">Custom</span>
          }
        </td>
        <td className="py-2 text-right">
          {deletable && (
            deleteConfirm === f.uuid ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-av-danger">Delete?</span>
                <button
                  onClick={() => handleDelete(f.uuid)}
                  className="text-xs text-av-danger font-semibold hover:underline"
                >Yes</button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs text-av-text-muted hover:underline"
                >No</button>
              </span>
            ) : (
              <button
                onClick={() => setDeleteConfirm(f.uuid)}
                className="p-1 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                title="Delete custom format"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </td>
      </tr>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-av-text flex items-center gap-2">
            <MonitorPlay className="w-6 h-6 text-av-accent" />
            Formats
          </h1>
          <p className="text-sm text-av-text-muted mt-1">
            Video format presets used across I/O ports. System presets are read-only.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setFormError(null); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Custom Format
        </button>
      </div>

      {/* Add Custom Format form */}
      {showForm && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-av-text mb-4">New Custom Format</h2>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="bg-av-danger/10 border border-av-danger rounded-md p-3">
                <p className="text-sm text-av-danger">{formError}</p>
              </div>
            )}

            {/* Resolution row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-av-text-muted mb-1">H Res *</label>
                <input
                  type="number"
                  min={1}
                  value={formData.hRes}
                  onChange={e => handleSpecChange({ hRes: parseInt(e.target.value) || 0 })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-av-text-muted mb-1">V Res *</label>
                <input
                  type="number"
                  min={1}
                  value={formData.vRes}
                  onChange={e => handleSpecChange({ vRes: parseInt(e.target.value) || 0 })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-av-text-muted mb-1">Frame Rate *</label>
                <select
                  value={formData.frameRate}
                  onChange={e => handleSpecChange({ frameRate: parseFloat(e.target.value) })}
                  className="input-field w-full"
                >
                  {[23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-av-text-muted mb-1">Blanking</label>
                <select
                  value={formData.blanking}
                  onChange={e => setFormData(prev => ({ ...prev, blanking: e.target.value as BlankingOption }))}
                  className="input-field w-full"
                >
                  {BLANKING_OPTIONS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interlaced + ID row */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isInterlaced"
                  checked={formData.isInterlaced}
                  onChange={e => handleSpecChange({ isInterlaced: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isInterlaced" className="text-sm text-av-text select-none">
                  Interlaced scan
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-av-text-muted mb-1">
                  Format ID <span className="font-normal">(auto-suggested, editable)</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="e.g. 1080p5994"
                  className="input-field w-full font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(null); setFormData(blankForm()); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving…' : 'Save Format'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Custom formats */}
      {customFormats.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-av-text mb-3">
            Custom Formats
            <span className="ml-2 text-av-text-muted font-normal">({customFormats.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-av-text-muted border-b border-av-border">
                  <th className="text-left pb-2 pr-4 font-semibold">ID</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Standard</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Resolution</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Scan / Rate</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Blanking</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Type</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {customFormats.map(f => (
                  <FormatRow key={f.uuid} f={f} deletable />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* System formats */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-av-text mb-3">
          System Presets
          <span className="ml-2 text-av-text-muted font-normal">({systemFormats.length} formats • read-only)</span>
        </h2>
        {isLoading ? (
          <p className="text-sm text-av-text-muted italic">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-av-text-muted border-b border-av-border">
                  <th className="text-left pb-2 pr-4 font-semibold">ID</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Standard</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Resolution</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Scan / Rate</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Blanking</th>
                  <th className="text-left pb-2 pr-4 font-semibold">Type</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {systemFormats.map(f => (
                  <FormatRow key={f.uuid} f={f} deletable={false} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
