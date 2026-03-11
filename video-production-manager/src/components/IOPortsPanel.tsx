/**
 * IOPortsPanel — shared component for editing device_ports per-show assignments.
 *
 * Used in CCU modal, SourceFormModal (Computers), ServerPairModal (Media Servers),
 * and any future entity that adopts the device_ports data model.
 *
 * Props:
 *   ports      — current DevicePortDraft array (controlled)
 *   onChange   — callback when any field changes
 *   formats    — array of Format rows from /api/formats (passed in so parent
 *                can share a single fetch across the modal)
 *   isLoading  — show a loading skeleton while ports are being fetched
 *   emptyText  — message shown when ports is empty (override default)
 */

import React, { useMemo } from 'react';
import type { Format } from '@/types';
import { SCAN_RATES } from '@/components/FormatFormModal';

function resKey(f: Format): string { return `${f.hRes}x${f.vRes}`; }
function resLabel(f: Format): string { return `${f.hRes} x ${f.vRes}`; }
function rateLabel(f: Format): string {
  const entry = SCAN_RATES.find(r => r.value === f.frameRate);
  const rate = (entry ? entry.idSuffix : Math.round(f.frameRate).toString()) + (f.isInterlaced ? 'i' : '');
  return f.blanking !== 'NONE' ? `${rate}  [${f.blanking}]` : rate;
}

// ── DevicePortDraft ──────────────────────────────────────────────────────────
// Draft shape that the modal works with before saving to device_ports table.

export interface DevicePortDraft {
  uuid?: string;           // set when row already exists in DB (editing)
  specPortUuid?: string;   // FK to equipment_io_ports.uuid — from spec lookup
  portLabel: string;       // editable per show
  ioType: string;          // "SDI" | "SMPTE-Fiber" | "REF" | "HDMI" | "DP" | …
  direction: 'INPUT' | 'OUTPUT';
  formatUuid?: string | null;
  note?: string | null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface IOPortsPanelProps {
  ports:                  DevicePortDraft[];
  onChange:               (ports: DevicePortDraft[]) => void;
  formats:                Format[];
  isLoading?:             boolean;
  emptyText?:             string;
  /** Optional callback: opens the "create custom format" flow in the parent */
  onCreateCustomFormat?:  () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IOPortsPanel({
  ports,
  onChange,
  formats,
  isLoading = false,
  emptyText,
  onCreateCustomFormat,
}: IOPortsPanelProps) {
  // Helper: update one port at the given index
  const update = (idx: number, patch: Partial<DevicePortDraft>) => {
    const next = ports.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  };

  // Group formats by resolution for optgroup select
  const formatGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; formats: Format[] }> = [];
    const seen = new Map<string, number>();
    for (const f of formats) {
      const k = resKey(f);
      if (!seen.has(k)) { seen.set(k, groups.length); groups.push({ key: k, label: resLabel(f), formats: [] }); }
      groups[seen.get(k)!].formats.push(f);
    }
    return groups;
  }, [formats]);

  const hasInputs  = ports.some(p => p.direction === 'INPUT');
  const hasOutputs = ports.some(p => p.direction === 'OUTPUT');

  if (isLoading) {
    return (
      <p className="text-sm text-av-text-muted italic py-2">Loading ports…</p>
    );
  }

  if (ports.length === 0) {
    return emptyText ? (
      <p className="text-xs text-av-text-muted italic">{emptyText}</p>
    ) : null;
  }

  return (
    <div className="space-y-4">
      {/* ── INPUTS ──────────────────────────────────────────────────────── */}
      {hasInputs && (
        <div>
          <p className="text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-1.5">
            Inputs
          </p>
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center mb-1 px-2">
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">Type</span>
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">Label</span>
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">Format In</span>
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">← Connected from</span>
          </div>
          <div className="space-y-1.5">
            {ports.map((port, idx) => {
              if (port.direction !== 'INPUT') return null;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center p-2 bg-av-surface-hover rounded-lg"
                >
                  {/* io type — read-only */}
                  <span
                    className="text-xs text-av-text-muted font-mono truncate"
                    title={port.ioType}
                  >
                    {port.ioType}
                  </span>
                  {/* label */}
                  <input
                    type="text"
                    value={port.portLabel}
                    onChange={e => update(idx, { portLabel: e.target.value })}
                    placeholder="Port label"
                    className="input-field text-xs py-1"
                  />
                  {/* format — grouped by resolution */}
                  <select
                    value={port.formatUuid || ''}
                    onChange={e => {
                      if (e.target.value === '__create__') {
                        onCreateCustomFormat?.();
                      } else {
                        update(idx, { formatUuid: e.target.value || null });
                      }
                    }}
                    className="input-field text-xs py-1"
                  >
                    <option value="">— format —</option>
                    {formatGroups.map(g => (
                      <optgroup key={g.key} label={g.label}>
                        {g.formats.map(f => (
                          <option key={f.uuid} value={f.uuid}>{rateLabel(f)}</option>
                        ))}
                      </optgroup>
                    ))}
                    {onCreateCustomFormat && (
                      <>
                        <option disabled value="">──────────</option>
                        <option value="__create__">+ Create custom…</option>
                      </>
                    )}
                  </select>
                  {/* connected-from note */}
                  <input
                    type="text"
                    value={port.note || ''}
                    onChange={e => update(idx, { note: e.target.value || null })}
                    placeholder="Source signal or device"
                    className="input-field text-xs py-1"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OUTPUTS ─────────────────────────────────────────────────────── */}
      {hasOutputs && (
        <div>
          <p className="text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-1.5">
            Outputs
          </p>
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center mb-1 px-2">
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">Type</span>
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">Label</span>
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">Format Out</span>
            <span className="text-[10px] text-av-text-muted uppercase font-semibold">→ Destination</span>
          </div>
          <div className="space-y-1.5">
            {ports.map((port, idx) => {
              if (port.direction !== 'OUTPUT') return null;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center p-2 bg-av-surface-hover rounded-lg"
                >
                  {/* io type — read-only */}
                  <span
                    className="text-xs text-av-text-muted font-mono truncate"
                    title={port.ioType}
                  >
                    {port.ioType}
                  </span>
                  {/* label */}
                  <input
                    type="text"
                    value={port.portLabel}
                    onChange={e => update(idx, { portLabel: e.target.value })}
                    placeholder="Port label"
                    className="input-field text-xs py-1"
                  />
                  {/* format — grouped by resolution */}
                  <select
                    value={port.formatUuid || ''}
                    onChange={e => {
                      if (e.target.value === '__create__') {
                        onCreateCustomFormat?.();
                      } else {
                        update(idx, { formatUuid: e.target.value || null });
                      }
                    }}
                    className="input-field text-xs py-1"
                  >
                    <option value="">— format —</option>
                    {formatGroups.map(g => (
                      <optgroup key={g.key} label={g.label}>
                        {g.formats.map(f => (
                          <option key={f.uuid} value={f.uuid}>{rateLabel(f)}</option>
                        ))}
                      </optgroup>
                    ))}
                    {onCreateCustomFormat && (
                      <>
                        <option disabled value="">──────────</option>
                        <option value="__create__">+ Create custom…</option>
                      </>
                    )}
                  </select>
                  {/* destination note */}
                  <input
                    type="text"
                    value={port.note || ''}
                    onChange={e => update(idx, { note: e.target.value || null })}
                    placeholder="Destination device or input"
                    className="input-field text-xs py-1"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
