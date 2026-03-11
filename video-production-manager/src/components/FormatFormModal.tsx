/**
 * FormatFormModal — reusable modal for creating or editing a video format.
 *
 * Used by:
 *   • Formats page  — "Add Custom Format" button and double-click row to edit
 *   • IOPortsPanel  — "Create custom format…" dropdown option
 *
 * Props:
 *   isOpen         — controls visibility
 *   onClose        — called to close without saving
 *   onSaved        — called with the saved Format after POST/PUT succeeds
 *   editingFormat  — null / undefined = create mode; Format = edit mode
 *   readOnly       — show fields disabled (system format opened by non-admin)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import type { Format } from '@/types';

// ── Scan rate registry ────────────────────────────────────────────────────────
// value   = stored in DB (exact float)
// label   = shown in the rate dropdown, Rate column, and format ID auto-suggestion
// idSuffix = legacy short code kept for reference only (not used in format ID generation)
export const SCAN_RATES = [
  { value: 23.976, label: '23.98', idSuffix: '23'  },
  { value: 24,     label: '24',    idSuffix: '24'   },
  { value: 29.97,  label: '29.97', idSuffix: '29'   },
  { value: 30,     label: '30',    idSuffix: '30'   },
  { value: 48,     label: '48',    idSuffix: '48'   },
  { value: 59.94,  label: '59.94', idSuffix: '59'   },
  { value: 60,     label: '60',    idSuffix: '60'   },
  { value: 120,    label: '120',   idSuffix: '120'  },
  { value: 240,    label: '240',   idSuffix: '240'  },
] as const;

export type ScanRateValue = typeof SCAN_RATES[number]['value'];

const BLANKING_OPTIONS = ['NONE', 'RBv1', 'RBv2', 'RBv3'] as const;
type BlankingOption = typeof BLANKING_OPTIONS[number];

// ── Helpers (exported for use in Formats.tsx) ────────────────────────────────

/** Display label for the Rate column: just the number; append "i" only if interlaced. */
export function displayRate(frameRate: number, isInterlaced: boolean): string {
  const entry = SCAN_RATES.find(r => r.value === frameRate);
  const label = entry ? entry.label : frameRate.toString();
  return isInterlaced ? `${label}i` : label;
}

/**
 * Normalise a stored format ID for display:
 *   2398 → 23, 2997 → 29, 5994 → 59
 *   RBv# → _RBv# (underscore prefix)
 */
export function displayFormatId(id: string): string {
  return id
    .replace(/2398/g, '23')
    .replace(/2997/g, '29')
    .replace(/5994/g, '59')
    .replace(/([^_])RB/g, '$1_RB');
}

/**
 * Generate a format id string from specs using the canonical display formula:
 *   "hRes x vRes @ rate[i]" or "hRes x vRes @ rate[i] [blanking]"
 * This is also the formula used in formatLabel() in IOPortsPanel.tsx.
 */
export function suggestFormatId(
  hRes: number,
  vRes: number,
  frameRate: number,
  isInterlaced: boolean,
  blanking: BlankingOption = 'NONE',
): string {
  const entry = SCAN_RATES.find(r => r.value === frameRate);
  const rate = (entry ? entry.label : frameRate.toString()) + (isInterlaced ? 'i' : '');
  return blanking !== 'NONE'
    ? `${hRes} x ${vRes} @ ${rate} [${blanking}]`
    : `${hRes} x ${vRes} @ ${rate}`;
}

// ── Blank form factory ────────────────────────────────────────────────────────
const blankForm = () => ({
  hRes:         1920,
  vRes:         1080,
  frameRate:    59.94 as ScanRateValue,
  isInterlaced: false,
  blanking:     'NONE' as BlankingOption,
  id:           suggestFormatId(1920, 1080, 59.94, false),
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface FormatFormModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  onSaved:         (fmt: Format) => void;
  editingFormat?:  Format | null;   // null / undefined = create mode
  duplicateFrom?:  Format | null;   // seed create-mode form from this format's specs
  readOnly?:       boolean;         // true for system formats opened by non-admin
}

// ── Component ─────────────────────────────────────────────────────
export function FormatFormModal({
  isOpen,
  onClose,
  onSaved,
  editingFormat,
  duplicateFrom,
  readOnly = false,
}: FormatFormModalProps) {
  const [formData, setFormData]     = useState(blankForm());
  const [formError, setFormError]   = useState<string | null>(null);
  const [isSaving, setIsSaving]     = useState(false);
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // Populate / reset when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (editingFormat) {
      setFormData({
        hRes:         editingFormat.hRes,
        vRes:         editingFormat.vRes,
        frameRate:    (editingFormat.frameRate ?? 59.94) as ScanRateValue,
        isInterlaced: editingFormat.isInterlaced,
        blanking:     (editingFormat.blanking ?? 'NONE') as BlankingOption,
        id:           editingFormat.id,
      });
    } else if (duplicateFrom) {
      const { hRes, vRes, frameRate, isInterlaced, blanking } = duplicateFrom;
      setFormData({
        hRes,
        vRes,
        frameRate:    (frameRate ?? 59.94) as ScanRateValue,
        isInterlaced,
        blanking:     (blanking ?? 'NONE') as BlankingOption,
        id:           suggestFormatId(hRes, vRes, frameRate ?? 59.94, isInterlaced, (blanking ?? 'NONE') as BlankingOption),
      });
    } else {
      setFormData(blankForm());
    }
    setFormError(null);
  }, [isOpen, editingFormat, duplicateFrom]);

  // Update fields and auto-regenerate id (create mode only)
  const handleSpecChange = useCallback(
    (updates: Partial<ReturnType<typeof blankForm>>) => {
      setFormData(prev => {
        const next = { ...prev, ...updates };
        if (!editingFormat) {
          next.id = suggestFormatId(next.hRes, next.vRes, next.frameRate, next.isInterlaced, next.blanking);
        }
        return next;
      });
    },
    [editingFormat],
  );

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const data = formDataRef.current;
    setFormError(null);
    if (!data.id.trim()) { setFormError('Format ID is required.'); return; }
    if (!data.hRes)      { setFormError('H Res is required.'); return; }
    if (!data.vRes)      { setFormError('V Res is required.'); return; }
    if (!data.frameRate) { setFormError('Frame Rate is required.'); return; }

    setIsSaving(true);
    try {
      let saved: Format;
      if (editingFormat) {
        saved = await apiClient.put<Format>(`/formats/${editingFormat.uuid}`, {
          id:           data.id.trim(),
          hRes:         data.hRes,
          vRes:         data.vRes,
          frameRate:    data.frameRate,
          isInterlaced: data.isInterlaced,
          blanking:     data.blanking,
        });
      } else {
        saved = await apiClient.post<Format>('/formats', {
          id:           data.id.trim(),
          hRes:         data.hRes,
          vRes:         data.vRes,
          frameRate:    data.frameRate,
          isInterlaced: data.isInterlaced,
          blanking:     data.blanking,
        });
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save format.');
    } finally {
      setIsSaving(false);
    }
  }, [editingFormat, onSaved, onClose, readOnly]);

  if (!isOpen) return null;

  const isEditMode = !!editingFormat;
  const title = readOnly
    ? 'View Format (System Preset)'
    : isEditMode
    ? 'Edit Custom Format'
    : 'New Custom Format';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-av-surface border border-av-border rounded-lg shadow-xl w-full max-w-xl">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-5 border-b border-av-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-av-text flex items-center gap-2">
              {readOnly && <Lock className="w-4 h-4 text-av-text-muted" />}
              {title}
            </h2>
            {editingFormat && (
              editingFormat.isSystem
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-av-surface-light text-av-text-muted border border-av-border">System</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-av-warning/10 text-av-warning border border-av-warning/30">Custom</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-2xl leading-none hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
          >
            ×
          </button>
        </div>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSave} className="p-5 space-y-4">

          {readOnly && (
            <div className="bg-av-surface-light border border-av-border rounded-md p-3">
              <p className="text-xs text-av-text-muted flex items-center gap-1.5">
                <Lock className="w-3 h-3 flex-shrink-0" />
                System presets are read-only. Only administrators can modify them.
              </p>
            </div>
          )}

          {formError && (
            <div className="bg-av-danger/10 border border-av-danger rounded-md p-3">
              <p className="text-sm text-av-danger">{formError}</p>
            </div>
          )}

          {/* Resolution + Rate + Blanking */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-av-text-muted mb-1">H Res *</label>
              <input
                type="number"
                min={1}
                value={formData.hRes}
                onChange={e => handleSpecChange({ hRes: parseInt(e.target.value) || 0 })}
                disabled={readOnly}
                className="input-field w-full disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-av-text-muted mb-1">V Res *</label>
              <input
                type="number"
                min={1}
                value={formData.vRes}
                onChange={e => handleSpecChange({ vRes: parseInt(e.target.value) || 0 })}
                disabled={readOnly}
                className="input-field w-full disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-av-text-muted mb-1">Frame Rate *</label>
              <select
                value={formData.frameRate}
                onChange={e => handleSpecChange({ frameRate: parseFloat(e.target.value) as ScanRateValue })}
                disabled={readOnly}
                className="input-field w-full disabled:opacity-60"
              >
                {SCAN_RATES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-av-text-muted mb-1">Blanking</label>
              <select
                value={formData.blanking}
                onChange={e => handleSpecChange({ blanking: e.target.value as BlankingOption })}
                disabled={readOnly}
                className="input-field w-full disabled:opacity-60"
              >
                {BLANKING_OPTIONS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interlaced checkbox + Format ID */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="fmt-modal-interlaced"
                checked={formData.isInterlaced}
                onChange={e => handleSpecChange({ isInterlaced: e.target.checked })}
                disabled={readOnly}
                className="w-4 h-4 rounded disabled:opacity-60"
              />
              <label htmlFor="fmt-modal-interlaced" className="text-sm text-av-text select-none">
                Interlaced scan
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-av-text-muted mb-1">
                Format ID
                {!isEditMode && !readOnly && (
                  <span className="font-normal text-av-text-muted"> (auto-suggested, editable)</span>
                )}
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                placeholder="e.g. 1920 x 1080 @ 59.94"
                disabled={readOnly}
                className="input-field w-full disabled:opacity-60"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save Format'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
