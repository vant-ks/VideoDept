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

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Format } from '@/types';
import { SCAN_RATES } from '@/components/FormatFormModal';

function resKey(f: Format): string { return `${f.hRes}x${f.vRes}`; }
function resLabel(f: Format): string { return `${f.hRes} x ${f.vRes}`; }
function rateLabel(f: Format): string {
  const entry = SCAN_RATES.find(r => r.value === f.frameRate);
  const rate = (entry ? entry.idSuffix : Math.round(f.frameRate).toString()) + (f.isInterlaced ? 'i' : '');
  return f.blanking !== 'NONE' ? `${rate}  [${f.blanking}]` : rate;
}

// ── FormatCascadeSelect ───────────────────────────────────────────────────────

interface FormatGroup { key: string; label: string; formats: Format[]; }

function FormatCascadeSelect({
  value,
  formatGroups,
  onSelect,
  onCreateCustomFormat,
}: {
  value: string;
  formatGroups: FormatGroup[];
  onSelect: (uuid: string | null) => void;
  onCreateCustomFormat?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHoveredGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  let currentLabel = '\u2014 format \u2014';
  for (const g of formatGroups) {
    const f = g.formats.find(f => f.uuid === value);
    if (f) { currentLabel = `${g.label} @ ${rateLabel(f)}`; break; }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setHoveredGroup(null); }}
        className="input-field text-xs py-1 w-full text-left flex justify-between items-center gap-1"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 text-av-text-muted" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-av-surface border border-av-border rounded-lg shadow-xl min-w-[160px]">
          <div
            className="px-3 py-1.5 text-xs text-av-text-muted cursor-pointer hover:bg-av-surface-hover rounded-t-lg"
            onClick={() => { onSelect(null); setOpen(false); }}
          >
            \u2014 clear \u2014
          </div>
          <div className="border-t border-av-border" />
          {formatGroups.map(g => (
            <div
              key={g.key}
              className="relative"
              onMouseEnter={() => setHoveredGroup(g.key)}
            >
              <div className="px-3 py-1.5 text-xs flex justify-between items-center cursor-default hover:bg-av-surface-hover">
                <span className="font-medium text-av-text">{g.label}</span>
                <ChevronRight className="w-3 h-3 text-av-text-muted" />
              </div>
              {hoveredGroup === g.key && (
                <div className="absolute left-full top-0 ml-0.5 bg-av-surface border border-av-border rounded-lg shadow-xl min-w-[120px] z-50">
                  {g.formats.map(f => (
                    <div
                      key={f.uuid}
                      className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-av-surface-hover ${
                        value === f.uuid ? 'text-av-accent font-semibold' : 'text-av-text'
                      }`}
                      onClick={() => { onSelect(f.uuid); setOpen(false); setHoveredGroup(null); }}
                    >
                      {rateLabel(f)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {onCreateCustomFormat && (
            <>
              <div className="border-t border-av-border" />
              <div
                className="px-3 py-1.5 text-xs cursor-pointer hover:bg-av-surface-hover text-av-text-muted rounded-b-lg"
                onClick={() => { onCreateCustomFormat(); setOpen(false); }}
              >
                + Create custom\u2026
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
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
  cardSlot?: number;       // slot number for expansion card ports; undefined = direct I/O
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

  // Group formats by resolution for cascading select
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
                  {/* format — cascading flyout */}
                  <FormatCascadeSelect
                    value={port.formatUuid || ''}
                    formatGroups={formatGroups}
                    onSelect={uuid => {
                      if (uuid === '__create__') { onCreateCustomFormat?.(); }
                      else { update(idx, { formatUuid: uuid }); }
                    }}
                    onCreateCustomFormat={onCreateCustomFormat}
                  />
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
                  {/* format — cascading flyout */}
                  <FormatCascadeSelect
                    value={port.formatUuid || ''}
                    formatGroups={formatGroups}
                    onSelect={uuid => {
                      if (uuid === '__create__') { onCreateCustomFormat?.(); }
                      else { update(idx, { formatUuid: uuid }); }
                    }}
                    onCreateCustomFormat={onCreateCustomFormat}
                  />
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
