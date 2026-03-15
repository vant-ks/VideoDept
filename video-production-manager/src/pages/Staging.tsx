import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, RotateCcw, Layers } from 'lucide-react';
import { Card } from '@/components/ui';
import { useProjectStore } from '@/hooks/useProjectStore';
import {
  useVenueStore,
  DECK_SIZES,
  LEG_HEIGHTS_IN,
  type DeckType,
  type StageDeck,
} from '@/hooks/useVenueStore';

// ── unit helpers ──────────────────────────────────────────────────────────────
const FT_TO_M = 0.3048;
const IN_TO_M = 0.0254;
const M_TO_FT = 1 / FT_TO_M;

function ftToM(ft: number) { return ft * FT_TO_M; }
function mToFt(m: number)  { return Math.floor(m * M_TO_FT); }
function mToInRem(m: number) { return Math.round((m / IN_TO_M) % 12); }
function mToFtIn(m: number) { return `${mToFt(m)}' ${mToInRem(m)}"` }

function ftInToM(ft: number, inches: number) {
  return ft * FT_TO_M + inches * IN_TO_M;
}

// ── DualUnitInput ─────────────────────────────────────────────────────────────
const DualUnitInput: React.FC<{
  label: string;
  valueM: number;
  onChange: (m: number) => void;
  className?: string;
}> = ({ label, valueM, onChange, className = '' }) => {
  const ft  = mToFt(valueM);
  const inn = mToInRem(valueM);
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-av-text-muted mb-1.5">{label}</label>
      <div className="flex gap-1.5 items-end">
        <div className="flex-1">
          <input type="number" min={0}
            value={ft}
            onChange={e => onChange(ftInToM(Math.max(0, +e.target.value || 0), inn))}
            className="input-field w-full" />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">ft</span>
        </div>
        <div className="flex-1">
          <input type="number" min={0} max={11}
            value={inn}
            onChange={e => onChange(ftInToM(ft, Math.min(11, Math.max(0, Math.round(+e.target.value || 0)))))}
            className="input-field w-full" />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">in</span>
        </div>
        <div className="text-av-text-muted/40 text-xs pb-5 flex-shrink-0">=</div>
        <div className="basis-20 flex-shrink-0">
          <input type="number" min={0} step={0.01}
            value={valueM === 0 ? '' : +valueM.toFixed(3)}
            placeholder="0"
            onChange={e => onChange(Math.max(0, +e.target.value || 0))}
            className="input-field w-full" />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">m</span>
        </div>
      </div>
    </div>
  );
};

// ── constants ─────────────────────────────────────────────────────────────────
const DECK_TYPE_OPTIONS: DeckType[] = ['1x4', '2x4', '2x8', '4x4', '4x8'];

const LEG_COLORS: Record<number, string> = {
  8:  '#7c9fd4',  // light blue  — 8"
  12: '#7c9fd4',
  16: '#5e8fc7',
  18: '#5e8fc7',
  24: '#4070b8',  // medium blue — 2'
  32: '#2a539a',
  36: '#2a539a',
  40: '#1a3d7c',  // dark blue   — 3'+
  48: '#1a3d7c',
};

function uuid4() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// ── Stage SVG preview ─────────────────────────────────────────────────────────
const StagePreview: React.FC<{
  venueWidthM: number;
  venueDepthM: number;
  dscFraction: number;
  decks: StageDeck[];
  widthPx?: number;
}> = ({ venueWidthM, venueDepthM, dscFraction, decks, widthPx = 440 }) => {
  if (venueWidthM <= 0 || venueDepthM <= 0) return null;

  const PAD = 24;
  const LABEL_H = 20;
  const innerW = widthPx - PAD * 2;
  const scale = innerW / venueWidthM;           // px per meter
  const innerH = venueDepthM * scale;
  const svgH = innerH + PAD * 2 + LABEL_H;
  const svgW = widthPx;

  // DSC in SVG coords (world origin)
  const dscSvgX = svgW / 2;
  const dscSvgY = PAD + LABEL_H + innerH * dscFraction;

  // Room corners in SVG
  const roomLeft = dscSvgX - venueWidthM / 2 * scale;
  const roomRight = dscSvgX + venueWidthM / 2 * scale;
  const roomTop = PAD + LABEL_H;
  const roomBottom = PAD + LABEL_H + innerH;

  function wx(xFt: number) { return dscSvgX + ftToM(xFt) * scale; }
  function wy(yFt: number) { return dscSvgY - ftToM(yFt) * scale; }

  const audienceBottom = roomBottom;
  const audienceTop = dscSvgY;

  return (
    <svg width={svgW} height={svgH} className="block">
      {/* Grid */}
      {Array.from({ length: Math.floor(venueWidthM / 3) + 1 }, (_, i) => {
        const xM = (Math.ceil(-venueWidthM / 2 / 3) + i) * 3;
        const sx = dscSvgX + xM * scale;
        return <line key={`gx${i}`} x1={sx} x2={sx} y1={roomTop} y2={roomBottom} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
      })}
      {Array.from({ length: Math.floor(venueDepthM / 3) + 1 }, (_, i) => {
        const sy = roomTop + i * 3 * scale;
        return <line key={`gy${i}`} x1={roomLeft} x2={roomRight} y1={sy} y2={sy} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
      })}

      {/* Room outline */}
      <rect x={roomLeft} y={roomTop} width={innerW} height={innerH}
        fill="#1a1d23" stroke="#4a5568" strokeWidth={2} rx={2} />

      {/* Audience zone */}
      <rect x={roomLeft} y={audienceTop} width={roomRight - roomLeft} height={audienceBottom - audienceTop}
        fill="rgba(99,102,241,0.06)" />
      <text x={roomLeft + 6} y={audienceBottom - 5} fill="#6366f1" fontSize={10} opacity={0.6}>AUDIENCE</text>

      {/* Stage area label */}
      <text x={roomLeft + 6} y={roomTop + 13} fill="#94a3b8" fontSize={10} opacity={0.6}>STAGE</text>

      {/* Stage decks */}
      {decks.map(deck => {
        const sizes = DECK_SIZES[deck.type];
        const dw = deck.rotation === 90 ? sizes.dFt : sizes.wFt;
        const dd = deck.rotation === 90 ? sizes.wFt : sizes.dFt;
        const sx = wx(deck.xFt);
        const sy = wy(deck.yFt + dd);
        const sw = ftToM(dw) * scale;
        const sh = ftToM(dd) * scale;
        const col = LEG_COLORS[deck.legHeightIn] || '#4070b8';
        return (
          <g key={deck.id}>
            <rect x={sx} y={sy} width={sw} height={sh}
              fill={col} fillOpacity={0.75} stroke="#93c5fd" strokeWidth={1} rx={1} />
            <text x={sx + sw / 2} y={sy + sh / 2 + 4}
              textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
              {deck.type}
            </text>
          </g>
        );
      })}

      {/* DSC marker */}
      <line x1={dscSvgX - 10} x2={dscSvgX + 10} y1={dscSvgY} y2={dscSvgY} stroke="#f59e0b" strokeWidth={2} />
      <line x1={dscSvgX} x2={dscSvgX} y1={dscSvgY - 10} y2={dscSvgY + 10} stroke="#f59e0b" strokeWidth={2} />
      <text x={dscSvgX + 4} y={dscSvgY - 6} fill="#f59e0b" fontSize={9} fontWeight="bold">DSC</text>

      {/* Dimension labels */}
      <text x={svgW / 2} y={PAD + LABEL_H - 4} textAnchor="middle" fill="#64748b" fontSize={10}>
        {mToFtIn(venueWidthM)} wide
      </text>
      <text x={roomRight + 4} y={roomTop + innerH / 2} fill="#64748b" fontSize={10}>
        {mToFtIn(venueDepthM)} deep
      </text>
    </svg>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Staging() {
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || '';

  const { getVenue, setRoom, addDeck, updateDeck, removeDeck } = useVenueStore();
  const venue = getVenue(productionId);

  const [newDeckType, setNewDeckType] = useState<DeckType>('4x8');
  const [newLegHeight, setNewLegHeight] = useState<number>(24);

  const totalDeckSqFt = useMemo(() => {
    return venue.stageDecks.reduce((sum, d) => {
      const s = DECK_SIZES[d.type];
      return sum + s.wFt * s.dFt;
    }, 0);
  }, [venue.stageDecks]);

  const handleAddDeck = () => {
    if (!productionId) return;
    const sizes = DECK_SIZES[newDeckType];
    // Place new deck at center-upstage, offset by count to avoid full overlap
    const count = venue.stageDecks.length;
    addDeck(productionId, {
      id: uuid4(),
      type: newDeckType,
      xFt: -(sizes.wFt / 2) + count * 0.5,
      yFt: 0 + count * 0.5,
      rotation: 0,
      legHeightIn: newLegHeight,
    });
  };

  if (!productionId) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-av-textPrimary">Staging</h1></div>
        <Card className="p-12 text-center">
          <Layers className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <p className="text-av-text-muted">Open a production to configure staging.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary">Staging</h1>
          <p className="text-sm text-av-text-muted mt-1">Room dimensions and stage deck layout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Room dimensions ── */}
        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <h2 className="text-base font-semibold text-av-text">Room / Venue</h2>
            <DualUnitInput
              label="Room width (side to side)"
              valueM={venue.roomWidthM}
              onChange={v => setRoom(productionId, { roomWidthM: v })}
            />
            <DualUnitInput
              label="Room depth (front to back)"
              valueM={venue.roomDepthM}
              onChange={v => setRoom(productionId, { roomDepthM: v })}
            />
            <DualUnitInput
              label="Ceiling height"
              valueM={venue.roomHeightM}
              onChange={v => setRoom(productionId, { roomHeightM: v })}
            />
            <div>
              <label className="block text-sm font-medium text-av-text-muted mb-1.5">
                DSC position (% from stage wall)
                <span className="ml-2 text-av-text-muted/60 font-normal text-xs">
                  {Math.round(venue.dscDepthFraction * 100)}% — {mToFtIn(venue.roomDepthM * venue.dscDepthFraction)} from back wall
                </span>
              </label>
              <input
                type="range" min={0.3} max={0.9} step={0.05}
                value={venue.dscDepthFraction}
                onChange={e => setRoom(productionId, { dscDepthFraction: +e.target.value })}
                className="w-full accent-av-accent"
              />
              <div className="flex justify-between text-xs text-av-text-muted mt-0.5">
                <span>Back wall</span>
                <span>DSC</span>
                <span>Front (audience)</span>
              </div>
            </div>

            {venue.roomWidthM > 0 && venue.roomDepthM > 0 && venue.roomHeightM > 0 && (
              <div className="grid grid-cols-3 gap-3 bg-av-surface-light rounded-lg p-3 text-center text-sm">
                <div>
                  <p className="text-xs text-av-text-muted">Area</p>
                  <p className="font-semibold text-av-text">{(venue.roomWidthM * venue.roomDepthM / (FT_TO_M * FT_TO_M)).toFixed(0)} ft²</p>
                </div>
                <div>
                  <p className="text-xs text-av-text-muted">Volume</p>
                  <p className="font-semibold text-av-text">{(venue.roomWidthM * venue.roomDepthM * venue.roomHeightM / (FT_TO_M ** 3)).toFixed(0)} ft³</p>
                </div>
                <div>
                  <p className="text-xs text-av-text-muted">Stage depth</p>
                  <p className="font-semibold text-av-text">{mToFtIn(venue.roomDepthM * venue.dscDepthFraction)}</p>
                </div>
              </div>
            )}
          </Card>

          {/* ── Add deck ── */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-av-text">Stage Decks</h2>

            {/* Palette */}
            <div className="grid grid-cols-5 gap-2">
              {DECK_TYPE_OPTIONS.map(t => {
                const s = DECK_SIZES[t];
                const ratio = s.dFt / s.wFt;
                return (
                  <button
                    key={t}
                    onClick={() => setNewDeckType(t)}
                    className={`relative rounded border-2 transition-colors flex flex-col items-center justify-center overflow-hidden ${
                      newDeckType === t
                        ? 'border-av-accent bg-av-accent/10'
                        : 'border-av-border hover:border-av-accent/40'
                    }`}
                    style={{ paddingBottom: `${Math.min(ratio * 100, 160)}%`, height: 0 }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xs font-bold ${newDeckType === t ? 'text-av-accent' : 'text-av-text'}`}>{t}</span>
                      <span className="text-[10px] text-av-text-muted">{s.wFt}×{s.dFt}'</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Leg height */}
            <div>
              <label className="block text-sm font-medium text-av-text-muted mb-2">Leg height</label>
              <div className="flex flex-wrap gap-2">
                {LEG_HEIGHTS_IN.map(h => (
                  <button
                    key={h}
                    onClick={() => setNewLegHeight(h)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      newLegHeight === h
                        ? 'bg-av-accent text-white'
                        : 'bg-av-surface-light text-av-text-muted hover:text-av-text'
                    }`}
                  >
                    {h < 12 ? `${h}"` : h === 12 ? '1\'' : h % 12 === 0 ? `${h / 12}'` : `${Math.floor(h / 12)}'${h % 12}"`}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleAddDeck} className="btn-primary flex items-center gap-2 w-full justify-center">
              <Plus className="w-4 h-4" />
              Add {newDeckType} Deck at {newLegHeight < 12 ? `${newLegHeight}"` : newLegHeight % 12 === 0 ? `${newLegHeight / 12}'` : `${Math.floor(newLegHeight / 12)}'${newLegHeight % 12}"`}
            </button>

            {venue.stageDecks.length > 0 && (
              <p className="text-xs text-av-text-muted text-right">
                {venue.stageDecks.length} deck{venue.stageDecks.length > 1 ? 's' : ''} · {totalDeckSqFt} ft²
              </p>
            )}
          </Card>
        </div>

        {/* ── Right column: preview + deck list ── */}
        <div className="space-y-6">

          {/* Preview SVG */}
          <Card className="p-4 overflow-hidden">
            <h2 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-3">Top-Down View</h2>
            {venue.roomWidthM > 0 && venue.roomDepthM > 0 ? (
              <StagePreview
                venueWidthM={venue.roomWidthM}
                venueDepthM={venue.roomDepthM}
                dscFraction={venue.dscDepthFraction}
                decks={venue.stageDecks}
              />
            ) : (
              <div className="h-48 flex items-center justify-center border border-dashed border-av-border rounded-lg">
                <p className="text-sm text-av-text-muted">Enter room dimensions to see preview</p>
              </div>
            )}

            {/* Legend */}
            {venue.stageDecks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[...new Set(venue.stageDecks.map(d => d.legHeightIn))].sort((a, b) => a - b).map(h => (
                  <div key={h} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: LEG_COLORS[h] }} />
                    <span className="text-xs text-av-text-muted">
                      {h < 12 ? `${h}"` : h % 12 === 0 ? `${h / 12}'` : `${Math.floor(h / 12)}'${h % 12}"`}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-3"><div className="w-3 h-0.5 bg-yellow-500" /><span className="text-xs text-av-text-muted">DSC</span></div>
              </div>
            )}
          </Card>

          {/* Deck list */}
          {venue.stageDecks.length > 0 && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-3">Deck List</h2>
              <div className="space-y-2">
                {venue.stageDecks.map((deck, i) => {
                  const sizes = DECK_SIZES[deck.type];
                  const effW = deck.rotation === 90 ? sizes.dFt : sizes.wFt;
                  const effD = deck.rotation === 90 ? sizes.wFt : sizes.dFt;
                  const hLabel = deck.legHeightIn < 12
                    ? `${deck.legHeightIn}"`
                    : deck.legHeightIn % 12 === 0
                    ? `${deck.legHeightIn / 12}'`
                    : `${Math.floor(deck.legHeightIn / 12)}'${deck.legHeightIn % 12}"`;
                  return (
                    <div key={deck.id} className="flex items-center gap-2 bg-av-surface-light rounded-lg px-3 py-2">
                      {/* Color swatch */}
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: LEG_COLORS[deck.legHeightIn] }} />
                      {/* Type + dimensions */}
                      <div className="w-20 flex-shrink-0">
                        <span className="text-xs font-bold text-av-accent">{deck.type}</span>
                        <span className="text-xs text-av-text-muted ml-1">@{hLabel}</span>
                      </div>
                      {/* X position */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-av-text-muted">X</span>
                        <input
                          type="number" step={0.5}
                          value={deck.xFt}
                          onChange={e => updateDeck(productionId, deck.id, { xFt: +e.target.value })}
                          className="input-field w-14 h-6 text-xs px-1 py-0.5"
                        />
                        <span className="text-xs text-av-text-muted">ft</span>
                      </div>
                      {/* Y position */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-av-text-muted">Y</span>
                        <input
                          type="number" step={0.5}
                          value={deck.yFt}
                          onChange={e => updateDeck(productionId, deck.id, { yFt: +e.target.value })}
                          className="input-field w-14 h-6 text-xs px-1 py-0.5"
                        />
                        <span className="text-xs text-av-text-muted">ft</span>
                      </div>
                      {/* Leg height */}
                      <select
                        value={deck.legHeightIn}
                        onChange={e => updateDeck(productionId, deck.id, { legHeightIn: +e.target.value })}
                        className="input-field h-6 text-xs px-1 py-0.5 flex-1 min-w-0"
                      >
                        {LEG_HEIGHTS_IN.map(h => {
                          const l = h < 12 ? `${h}"` : h % 12 === 0 ? `${h / 12}'` : `${Math.floor(h / 12)}'${h % 12}"`;
                          return <option key={h} value={h}>{l}</option>;
                        })}
                      </select>
                      {/* Rotate */}
                      <button
                        onClick={() => updateDeck(productionId, deck.id, { rotation: deck.rotation === 0 ? 90 : 0 })}
                        title="Rotate 90°"
                        className="p-1 text-av-text-muted hover:text-av-text transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => removeDeck(productionId, deck.id)}
                        className="p-1 text-av-danger hover:opacity-80 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {venue.stageDecks.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-av-text-muted">Select a deck type and leg height above, then click Add to place deck pieces.</p>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
