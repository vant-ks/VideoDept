import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Plus, Trash2, Calculator, Info } from 'lucide-react';
import type { ProjectionSurface, SurfaceMatte, ProjectorAssignment, SurfaceType } from '@/hooks/useProjectionSurfaceAPI';
import type { ProjectionScreen } from '@/hooks/useProjectionScreenAPI';

// ─── helpers ──────────────────────────────────────────────────────────────────

const FT_TO_M = 0.3048;
const IN_TO_M = 0.0254;

function ftInToM(ft: number, inches: number) {
  return ft * FT_TO_M + inches * IN_TO_M;
}
function mToFt(m: number) {
  return Math.floor(m / FT_TO_M);
}
function mToInRemainder(m: number) {
  const totalIn = m / IN_TO_M;
  return Math.round(totalIn % 12);
}
function mToDisplayFtIn(m: number | undefined) {
  if (!m) return '—';
  const ft = mToFt(m);
  const inn = mToInRemainder(m);
  return `${ft}' ${inn}"`;
}

const SURFACE_TYPES: { value: SurfaceType; label: string; desc: string }[] = [
  { value: 'FRONT',       label: 'Front Projection',  desc: 'Projector in front of screen, audience same side' },
  { value: 'REAR',        label: 'Rear Projection',   desc: 'Projector behind translucent screen' },
  { value: 'DUAL_VISION', label: 'Dual Vision',       desc: 'Transparent mesh, view-through screen (e.g. Holo Gauze)' },
  { value: 'MAPPED',      label: 'Projection Mapped', desc: 'Mapped onto an irregular surface or set piece' },
];

function uuid4() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// ─── DualUnitInput ─────────────────────────────────────────────────────────────
// ft + in + m all shown and all editable; changing any field live-converts the others.

const DualUnitInput: React.FC<{
  label: React.ReactNode;
  valueM: number;
  onChange: (m: number) => void;
  required?: boolean;
  className?: string;
}> = ({ label, valueM, onChange, required, className = '' }) => {
  const ft  = Math.floor(valueM / FT_TO_M);
  const inn = Math.round((valueM / IN_TO_M) % 12);
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-av-text-muted mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="flex gap-1.5 items-end">
        <div className="flex-1 min-w-0">
          <input
            type="number" min={0}
            value={ft}
            onChange={e => onChange(ftInToM(Math.max(0, Math.floor(+e.target.value || 0)), Math.round((valueM / IN_TO_M) % 12)))}
            className="input-field w-full"
          />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">ft</span>
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="number" min={0} max={11}
            value={inn}
            onChange={e => onChange(ftInToM(Math.floor(valueM / FT_TO_M), Math.min(11, Math.max(0, Math.round(+e.target.value || 0)))))}
            className="input-field w-full"
          />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">in</span>
        </div>
        <div className="text-av-text-muted/40 text-xs pb-5 flex-shrink-0">=</div>
        <div className="basis-20 flex-shrink-0">
          <input
            type="number" min={0} step={0.01}
            value={valueM === 0 ? '' : +valueM.toFixed(3)}
            placeholder="0"
            onChange={e => onChange(Math.max(0, +e.target.value || 0))}
            className="input-field w-full"
          />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">m</span>
        </div>
      </div>
    </div>
  );
};

// ─── SmallMeasureInput ─────────────────────────────────────────────────────────
// Inches + cm, for small measurements like bezels.

const SmallMeasureInput: React.FC<{
  label: string;
  valueM: number;
  onChange: (m: number) => void;
}> = ({ label, valueM, onChange }) => {
  const inVal = +(valueM / IN_TO_M).toFixed(3);
  const cmVal = +(valueM * 100).toFixed(1);
  return (
    <div>
      <label className="block text-sm font-medium text-av-text-muted mb-1.5">{label}</label>
      <div className="flex gap-1.5 items-end">
        <div className="flex-1">
          <input
            type="number" min={0} step={0.125}
            value={inVal === 0 ? '' : inVal}
            placeholder="0"
            onChange={e => onChange(Math.max(0, (+e.target.value || 0) * IN_TO_M))}
            className="input-field w-full"
          />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">in</span>
        </div>
        <div className="text-av-text-muted/40 text-xs pb-5 flex-shrink-0">=</div>
        <div className="flex-1">
          <input
            type="number" min={0} step={0.5}
            value={cmVal === 0 ? '' : cmVal}
            placeholder="0"
            onChange={e => onChange(Math.max(0, (+e.target.value || 0) / 100))}
            className="input-field w-full"
          />
          <span className="text-xs text-av-text-muted mt-0.5 block text-center">cm</span>
        </div>
      </div>
    </div>
  );
};

// ─── types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ProjectionSurface, 'uuid' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => Promise<void>;
  editingSurface?: ProjectionSurface | null;
  projectors: ProjectionScreen[];            // current production's projectors
  equipmentSpecs: any[];                     // for lens lookup
  productionId: string;
}

// ─── component ────────────────────────────────────────────────────────────────

export const ProjectionSurfaceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingSurface,
  projectors,
  equipmentSpecs,
  productionId,
}) => {

  // ── identity ──
  const [name, setName]     = useState('');
  const [note, setNote]     = useState('');

  // ── image area (meters) ──
  const [wM, setWM]     = useState(0);
  const [hM, setHM]     = useState(0);

  // ── bezels (meters, per side) ──
  const [bezelHM, setBezelHM] = useState(0);
  const [bezelVM, setBezelVM] = useState(0);

  // ── surface ──
  const [surfaceType, setSurfaceType] = useState<SurfaceType>('FRONT');
  const [gainFactor, setGainFactor]   = useState(1.0);

  // ── position (meters) ──
  const [distFloorM, setDistFloorM] = useState(0);
  const [dsXM, setDsXM]             = useState(0);
  const [dsYM, setDsYM]             = useState(0);
  const [rotX, setRotX]               = useState(0);
  const [rotY, setRotY]               = useState(0);
  const [rotZ, setRotZ]               = useState(0);

  // ── ambient ──
  const [ambientLux, setAmbientLux] = useState(0);

  // ── mattes ──
  const [mattes, setMattes] = useState<SurfaceMatte[]>([]);

  // ── projector assignments ──
  const [assignments, setAssignments] = useState<ProjectorAssignment[]>([]);

  // ── saving ──
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<string[]>([]);

  // ── active section ──
  const [section, setSection] = useState<
    'dimensions' | 'surface' | 'position' | 'mattes' | 'projectors' | 'calc'
  >('dimensions');

  // ── populate from editing surface ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (editingSurface) {
      setName(editingSurface.name);
      setNote(editingSurface.note || '');
      setWM(editingSurface.widthM || 0);
      setHM(editingSurface.heightM || 0);
      setBezelHM(editingSurface.bezelHM || 0);
      setBezelVM(editingSurface.bezelVM || 0);
      setSurfaceType(editingSurface.surfaceType || 'FRONT');
      setGainFactor(editingSurface.gainFactor ?? 1.0);
      setDistFloorM(editingSurface.distFloorM || 0);
      setDsXM(Math.abs(editingSurface.posDsXM || 0));
      setDsYM(Math.abs(editingSurface.posDsYM || 0));
      setRotX(editingSurface.rotX || 0);
      setRotY(editingSurface.rotY || 0);
      setRotZ(editingSurface.rotZ || 0);
      setAmbientLux(editingSurface.ambientLux || 0);
      setMattes(editingSurface.mattes || []);
      setAssignments(editingSurface.projectorAssignments || []);
    } else {
      setName(''); setNote('');
      setWM(0); setHM(0);
      setBezelHM(0); setBezelVM(0);
      setSurfaceType('FRONT'); setGainFactor(1.0);
      setDistFloorM(0); setDsXM(0); setDsYM(0);
      setRotX(0); setRotY(0); setRotZ(0);
      setAmbientLux(0);
      setMattes([]); setAssignments([]);
    }
    setErrors([]);
    setSection('dimensions');
  }, [isOpen, editingSurface]);

  // ── derived values ─────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const widthM  = wM;
    const heightM = hM;
    const totalWidthM  = widthM  + 2 * bezelHM;
    const totalHeightM = heightM + 2 * bezelVM;
    const areaSqM  = widthM * heightM;
    const areaSqFt = areaSqM / (FT_TO_M * FT_TO_M);
    const diagM    = Math.sqrt(widthM ** 2 + heightM ** 2);
    const diagFt   = diagM / FT_TO_M;
    const diagIn   = (diagFt % 1) * 12;
    const ratio    = heightM > 0 ? widthM / heightM : 0;

    // Aspect ratio as string (try to find common label)
    let ratioLabel = ratio.toFixed(2) + ':1';
    if (Math.abs(ratio - 16 / 9)  < 0.01) ratioLabel = '16:9';
    else if (Math.abs(ratio - 16 / 10) < 0.01) ratioLabel = '16:10';
    else if (Math.abs(ratio - 4 / 3)   < 0.01) ratioLabel = '4:3';
    else if (Math.abs(ratio - 2.39)    < 0.02) ratioLabel = 'Scope (2.39:1)';

    // Total lumens from all assigned projectors
    let totalLumens = 0;
    assignments.forEach(a => {
      const proj = projectors.find(p => p.uuid === a.projectorUuid);
      if (proj?.equipmentUuid) {
        const spec = equipmentSpecs.find(s => s.uuid === proj.equipmentUuid);
        if (spec?.specs?.lumens) totalLumens += spec.specs.lumens;
      }
    });

    // Nits = lumens / area_sqM (for rear/dual, cut in half for transmission loss)
    const transmissionFactor = (surfaceType === 'REAR' || surfaceType === 'DUAL_VISION') ? 0.5 : 1;
    const nits = areaSqM > 0
      ? (totalLumens * gainFactor * transmissionFactor) / areaSqM
      : 0;
    const luxAtScreen = nits; // lux ≈ nits for lambertian surface approximation

    // Contrast ratio (simplified — dark-room contrast)
    const contrastRatio = ambientLux > 0 ? luxAtScreen / ambientLux : 0;

    // Throw distances for each assigned projector (from lens throwRatio × imageWidth)
    const throwCalcs = assignments.map(a => {
      const lensSpec = a.lensUuid
        ? equipmentSpecs.find(s => s.uuid === a.lensUuid)
        : null;
      const throwRatioRaw = lensSpec?.specs?.throwRatio as string | undefined;
      let throwMin: number | null = null;
      let throwMax: number | null = null;
      if (throwRatioRaw) {
        const parts = throwRatioRaw.match(/(\d+\.?\d*)/g);
        if (parts?.length === 2) {
          throwMin = parseFloat(parts[0]) * widthM;
          throwMax = parseFloat(parts[1]) * widthM;
        } else if (parts?.length === 1) {
          throwMin = parseFloat(parts[0]) * widthM;
          throwMax = throwMin;
        }
      }
      return { projectorUuid: a.projectorUuid, lensUuid: a.lensUuid, throwMin, throwMax };
    });

    return {
      widthM, heightM, bezelHM, bezelVM,
      totalWidthM, totalHeightM,
      areaSqM, areaSqFt,
      diagM, diagFt: Math.floor(diagFt), diagIn: Math.round(diagIn),
      ratio, ratioLabel,
      totalLumens, nits: Math.round(nits),
      luxAtScreen: Math.round(luxAtScreen),
      contrastRatio: contrastRatio > 0 ? contrastRatio.toFixed(1) + ':1' : '—',
      throwCalcs,
    };
  }, [wM, hM, bezelHM, bezelVM, gainFactor, surfaceType, ambientLux, assignments, projectors, equipmentSpecs]);

  // ── mattes helpers ─────────────────────────────────────────────────────────
  const addMatte = () => {
    setMattes(prev => [...prev, { id: uuid4(), label: '', xM: 0, yM: 0, widthM: 0.3, heightM: 0.2 }]);
  };
  const updateMatte = (id: string, field: keyof SurfaceMatte, value: string | number) => {
    setMattes(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const removeMatte = (id: string) => {
    setMattes(prev => prev.filter(m => m.id !== id));
  };

  // ── assignment helpers ─────────────────────────────────────────────────────
  const addAssignment = () => {
    if (projectors.length === 0) return;
    const unusedProjector = projectors.find(p => !assignments.some(a => a.projectorUuid === p.uuid));
    if (!unusedProjector) return;
    setAssignments(prev => [...prev, { projectorUuid: unusedProjector.uuid }]);
  };
  const updateAssignment = (idx: number, patch: Partial<ProjectorAssignment>) => {
    setAssignments(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };
  const removeAssignment = (idx: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== idx));
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required');
    if (wM <= 0) errs.push('Image width is required');
    if (hM <= 0) errs.push('Image height is required');
    if (errs.length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      await onSave({
        id: editingSurface?.id || '',
        productionId,
        name: name.trim(),
        widthM: derived.widthM,
        heightM: derived.heightM,
        bezelHM: derived.bezelHM,
        bezelVM: derived.bezelVM,
        surfaceType,
        gainFactor,
        distFloorM,
        posDsXM: dsXM,
        posDsYM: dsYM,
        rotX, rotY, rotZ,
        ambientLux: ambientLux || undefined,
        mattes: mattes.length > 0 ? mattes : undefined,
        projectorAssignments: assignments.length > 0 ? assignments : undefined,
        note: note.trim() || undefined,
        version: editingSurface?.version ?? 1,
      });
      onClose();
    } catch (err: any) {
      setErrors([err?.message || 'Save failed']);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const SECTIONS = [
    { id: 'dimensions', label: 'Dimensions' },
    { id: 'surface',    label: 'Surface' },
    { id: 'position',   label: 'Position' },
    { id: 'mattes',     label: `Mattes ${mattes.length > 0 ? `(${mattes.length})` : ''}` },
    { id: 'projectors', label: `Projectors ${assignments.length > 0 ? `(${assignments.length})` : ''}` },
    { id: 'calc',       label: 'Calculations' },
  ] as const;

  // Lens specs available for dropdown (from equipmentSpecs, filtered to LENS category)
  const lensSpecs = equipmentSpecs.filter(s => s.category?.toUpperCase() === 'LENS');

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface border border-av-border rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-av-border flex-shrink-0">
          <h2 className="text-xl font-bold text-av-text">
            {editingSurface ? 'Edit Projection Surface' : 'Add Projection Surface'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : editingSurface ? 'Save Changes' : 'Add Surface'}
            </button>
          </div>
        </div>

        {/* ── Name row (always visible) ── */}
        <div className="px-6 py-3 border-b border-av-border flex-shrink-0">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Surface name (e.g. Main Screen, IMAG Left)"
            className="input-field w-full text-lg font-medium"
          />
        </div>

        {/* ── Tab strip ── */}
        <div className="flex gap-0 border-b border-av-border flex-shrink-0 overflow-x-auto">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap relative flex-shrink-0 ${
                section === s.id
                  ? 'text-av-accent'
                  : 'text-av-text-muted hover:text-av-text'
              }`}
            >
              {s.label}
              {section === s.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
              )}
            </button>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md flex-shrink-0">
            {errors.map((e, i) => <p key={i} className="text-sm text-red-400">{e}</p>)}
          </div>
        )}

        {/* ── Section body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── DIMENSIONS ── */}
          {section === 'dimensions' && (
            <>
              {/* Image area */}
              <div>
                <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-3">Image Area</h3>
                <div className="grid grid-cols-2 gap-5">
                  <DualUnitInput
                    label="Width"
                    required
                    valueM={wM}
                    onChange={setWM}
                  />
                  <DualUnitInput
                    label="Height"
                    required
                    valueM={hM}
                    onChange={setHM}
                  />
                </div>
              </div>

              {/* Bezels */}
              <div>
                <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-1">Bezel / Frame</h3>
                <p className="text-xs text-av-text-muted mb-3">Added equally to each side of the image area</p>
                <div className="grid grid-cols-2 gap-5">
                  <SmallMeasureInput
                    label="Horizontal bezel (each side)"
                    valueM={bezelHM}
                    onChange={setBezelHM}
                  />
                  <SmallMeasureInput
                    label="Vertical bezel (each side)"
                    valueM={bezelVM}
                    onChange={setBezelVM}
                  />
                </div>
              </div>

              {/* Quick summary */}
              {wM > 0 && hM > 0 && (
                <div className="grid grid-cols-4 gap-3 bg-av-surface-light rounded-lg p-4 text-center">
                  <div>
                    <p className="text-xs text-av-text-muted">Aspect</p>
                    <p className="font-semibold text-av-accent text-sm mt-0.5">{derived.ratioLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-av-text-muted">Diagonal</p>
                    <p className="font-semibold text-av-text text-sm mt-0.5">{derived.diagFt}' {derived.diagIn}"</p>
                  </div>
                  <div>
                    <p className="text-xs text-av-text-muted">Area</p>
                    <p className="font-semibold text-av-text text-sm mt-0.5">{derived.areaSqFt.toFixed(1)} ft²</p>
                  </div>
                  <div>
                    <p className="text-xs text-av-text-muted">Total w/ bezel</p>
                    <p className="font-semibold text-av-text text-sm mt-0.5">{(derived.totalWidthM / FT_TO_M).toFixed(1)}' × {(derived.totalHeightM / FT_TO_M).toFixed(1)}'</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SURFACE ── */}
          {section === 'surface' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-3">Surface Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SURFACE_TYPES.map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                        surfaceType === value
                          ? 'border-av-accent bg-av-accent/10'
                          : 'border-av-border hover:border-av-accent/40'
                      }`}
                    >
                      <input type="radio" name="surfaceType" value={value} checked={surfaceType === value}
                        onChange={() => setSurfaceType(value)} className="sr-only" />
                      <span className={`text-sm font-semibold ${surfaceType === value ? 'text-av-accent' : 'text-av-text'}`}>{label}</span>
                      <span className="text-xs text-av-text-muted">{desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block text-sm font-medium text-av-text-muted mb-1.5">
                  Gain Factor
                  <span className="ml-1 text-av-text-muted/60 font-normal">(brightness multiplier)</span>
                </label>
                <input
                  type="number"
                  min={0.1} max={5} step={0.05}
                  value={gainFactor}
                  onChange={e => setGainFactor(+e.target.value)}
                  className="input-field w-full"
                />
                <p className="text-xs text-av-text-muted mt-1">
                  1.00 = neutral. Matte white ~1.0, high-gain ~1.5–2.5, grey ~0.8.
                  {surfaceType === 'REAR' || surfaceType === 'DUAL_VISION'
                    ? ' Rear/Dual Vision applies a 0.5× transmission loss.'
                    : ''}
                </p>
              </div>
            </>
          )}

          {/* ── POSITION ── */}
          {section === 'position' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-1">Height from Floor</h3>
                <p className="text-xs text-av-text-muted mb-3">Distance from floor to bottom of the image area</p>
                <DualUnitInput
                  label="Floor to bottom of image"
                  valueM={distFloorM}
                  onChange={setDistFloorM}
                  className="max-w-sm"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-1">Position from Downstage Center</h3>
                <p className="text-xs text-av-text-muted mb-3">
                  Downstage center = 0, 0. X: positive = stage right. Y: positive = upstage.
                </p>
                <div className="grid grid-cols-2 gap-5">
                  <DualUnitInput
                    label="X (stage left / right)"
                    valueM={dsXM}
                    onChange={setDsXM}
                  />
                  <DualUnitInput
                    label="Y (downstage / upstage)"
                    valueM={dsYM}
                    onChange={setDsYM}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider mb-1">Rotation</h3>
                <p className="text-xs text-av-text-muted mb-3">Degrees. 0 = flat, upright, facing downstage.</p>
                <div className="grid grid-cols-3 gap-3 max-w-sm">
                  <div>
                    <label className="block text-xs font-medium text-av-text-muted mb-1">X (tilt)</label>
                    <input type="number" min={-180} max={180} step={0.5} value={rotX} onChange={e => setRotX(+e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-av-text-muted mb-1">Y (pan)</label>
                    <input type="number" min={-180} max={180} step={0.5} value={rotY} onChange={e => setRotY(+e.target.value)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-av-text-muted mb-1">Z (roll)</label>
                    <input type="number" min={-180} max={180} step={0.5} value={rotZ} onChange={e => setRotZ(+e.target.value)} className="input-field w-full" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── MATTES ── */}
          {section === 'mattes' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider">Mattes</h3>
                  <p className="text-xs text-av-text-muted mt-0.5">Masked areas within the image. Positions are measured from the top-left of the image area in meters.</p>
                </div>
                <button onClick={addMatte} className="btn-secondary text-xs flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Matte
                </button>
              </div>

              {mattes.length === 0 ? (
                <p className="text-sm text-av-text-muted italic">No mattes configured</p>
              ) : (
                <div className="space-y-3">
                  {mattes.map((m, i) => (
                    <div key={m.id} className="border border-av-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-av-accent">Matte {i + 1}</span>
                        <button onClick={() => removeMatte(m.id)} className="text-av-danger hover:opacity-80">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={m.label || ''}
                        onChange={e => updateMatte(m.id, 'label', e.target.value)}
                        placeholder="Label (optional)"
                        className="input-field w-full text-sm"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        {(['xM', 'yM', 'widthM', 'heightM'] as const).map(field => (
                          <div key={field}>
                            <label className="text-xs text-av-text-muted block mb-0.5">
                              {field === 'xM' ? 'X (m)' : field === 'yM' ? 'Y (m)' : field === 'widthM' ? 'W (m)' : 'H (m)'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={m[field]}
                              onChange={e => updateMatte(m.id, field, parseFloat(e.target.value) || 0)}
                              className="input-field w-full text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── PROJECTORS ── */}
          {section === 'projectors' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider">Assigned Projectors</h3>
                  <p className="text-xs text-av-text-muted mt-0.5">Link projectors to this surface. Throw distance is calculated from lens throw ratio × image width.</p>
                </div>
                <button
                  onClick={addAssignment}
                  disabled={projectors.length === 0 || assignments.length >= projectors.length}
                  className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> Add Projector
                </button>
              </div>

              {/* Ambient lux (affects contrast calc) */}
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-av-text-muted mb-1.5">Room ambient brightness (lux)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={ambientLux}
                  onChange={e => setAmbientLux(+e.target.value)}
                  className="input-field w-full"
                  placeholder="0"
                />
                <p className="text-xs text-av-text-muted mt-1">Dark room ~0–10 lx. Office ~300 lx. Bright stage ~1000+ lx.</p>
              </div>

              {projectors.length === 0 && (
                <p className="text-sm text-av-text-muted italic">No projectors in this production yet. Add projectors on the Projectors tab first.</p>
              )}

              {assignments.length === 0 && projectors.length > 0 && (
                <p className="text-sm text-av-text-muted italic">No projectors assigned. Click "Add Projector" to assign one.</p>
              )}

              <div className="space-y-3">
                {assignments.map((a, idx) => {
                  const proj = projectors.find(p => p.uuid === a.projectorUuid);
                  const projSpec = proj?.equipmentUuid
                    ? equipmentSpecs.find(s => s.uuid === proj.equipmentUuid)
                    : null;
                  const throwCalc = derived.throwCalcs[idx];
                  // Compatible lenses for this projector
                  const compatibleLenses = lensSpecs.filter(l => {
                    const compat = l.specs?.compatibleWith as string[] | undefined;
                    return compat?.includes(projSpec?.id || '');
                  });

                  return (
                    <div key={idx} className="border border-av-border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-av-accent">Projector {idx + 1}</span>
                        <button onClick={() => removeAssignment(idx)} className="text-av-danger hover:opacity-80">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Projector picker */}
                      <div>
                        <label className="block text-xs font-medium text-av-text-muted mb-1">Projector</label>
                        <select
                          value={a.projectorUuid}
                          onChange={e => updateAssignment(idx, { projectorUuid: e.target.value, lensUuid: undefined })}
                          className="input-field w-full text-sm"
                        >
                          {projectors.map(p => {
                            const pSpec = equipmentSpecs.find(s => s.uuid === p.equipmentUuid);
                            return (
                              <option key={p.uuid} value={p.uuid}>
                                {p.id}{pSpec ? ` — ${pSpec.manufacturer} ${pSpec.model}` : ''}
                              </option>
                            );
                          })}
                        </select>
                        {projSpec?.specs?.lumens && (
                          <p className="text-xs text-av-info mt-1">{projSpec.specs.lumens.toLocaleString()} lm</p>
                        )}
                      </div>

                      {/* Lens picker */}
                      <div>
                        <label className="block text-xs font-medium text-av-text-muted mb-1">Lens (optional)</label>
                        <select
                          value={a.lensUuid || ''}
                          onChange={e => updateAssignment(idx, { lensUuid: e.target.value || undefined })}
                          className="input-field w-full text-sm"
                        >
                          <option value="">No lens / lens unknown</option>
                          {compatibleLenses.map(l => (
                            <option key={l.uuid} value={l.uuid}>
                              {l.manufacturer} {l.model}
                              {l.specs?.throwRatio ? ` — ${l.specs.throwRatio}` : ''}
                            </option>
                          ))}
                          {/* If no compatible lenses found, show all lenses */}
                          {compatibleLenses.length === 0 && lensSpecs.map(l => (
                            <option key={l.uuid} value={l.uuid}>
                              {l.manufacturer} {l.model}
                              {l.specs?.throwRatio ? ` — ${l.specs.throwRatio}` : ''}
                            </option>
                          ))}
                        </select>
                        {throwCalc?.throwMin !== null && throwCalc?.throwMin !== undefined && (
                          <p className="text-xs text-av-accent mt-1">
                            <Calculator className="w-3 h-3 inline mr-1" />
                            Throw distance: {mToDisplayFtIn(throwCalc.throwMin!)}
                            {throwCalc.throwMax !== throwCalc.throwMin ? ` – ${mToDisplayFtIn(throwCalc.throwMax!)}` : ''}
                            {' '}({(throwCalc.throwMin!).toFixed(2)}
                            {throwCalc.throwMax !== throwCalc.throwMin ? `–${(throwCalc.throwMax!).toFixed(2)}` : ''} m)
                          </p>
                        )}
                      </div>

                      {/* Manual throw distance override */}
                      <div>
                        <label className="block text-xs font-medium text-av-text-muted mb-1">
                          Actual throw distance
                          <span className="text-av-text-muted/60 font-normal ml-1">(override, meters)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={a.throwDistM ?? ''}
                          onChange={e => updateAssignment(idx, { throwDistM: e.target.value ? +e.target.value : undefined })}
                          placeholder="Auto from lens"
                          className="input-field w-full text-sm"
                        />
                      </div>

                      {/* Offsets */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">Horiz. offset (m)</label>
                          <input
                            type="number"
                            step={0.01}
                            value={a.horizOffsetM ?? ''}
                            onChange={e => updateAssignment(idx, { horizOffsetM: e.target.value ? +e.target.value : undefined })}
                            placeholder="0"
                            className="input-field w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">Vert. offset (m)</label>
                          <input
                            type="number"
                            step={0.01}
                            value={a.vertOffsetM ?? ''}
                            onChange={e => updateAssignment(idx, { vertOffsetM: e.target.value ? +e.target.value : undefined })}
                            placeholder="0"
                            className="input-field w-full text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── CALCULATIONS ── */}
          {section === 'calc' && (
            <>
              <h3 className="text-sm font-semibold text-av-text-muted uppercase tracking-wider">Calculated Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Aspect Ratio',      value: derived.ratioLabel,   color: 'text-av-accent' },
                  { label: 'Diagonal',          value: `${derived.diagFt}' ${derived.diagIn}"`,  color: 'text-av-text' },
                  { label: 'Image Area',        value: `${derived.areaSqFt.toFixed(1)} ft² / ${derived.areaSqM.toFixed(2)} m²`, color: 'text-av-text' },
                  { label: 'Total Width',       value: mToDisplayFtIn(derived.totalWidthM),  color: 'text-av-text' },
                  { label: 'Total Height',      value: mToDisplayFtIn(derived.totalHeightM), color: 'text-av-text' },
                  { label: 'Total Lumens',      value: derived.totalLumens > 0 ? `${derived.totalLumens.toLocaleString()} lm` : '—', color: 'text-av-info' },
                  { label: 'Gain Factor',       value: gainFactor.toFixed(2) + '×', color: 'text-av-text' },
                  { label: 'Lux at Surface',    value: derived.luxAtScreen > 0 ? `${derived.luxAtScreen.toLocaleString()} lx` : '—', color: derived.luxAtScreen > 0 ? 'text-av-accent' : 'text-av-text-muted' },
                  { label: 'Contrast Ratio',    value: derived.contrastRatio, color: derived.contrastRatio !== '—' ? 'text-av-accent' : 'text-av-text-muted' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-av-surface-light rounded-lg p-3">
                    <p className="text-xs text-av-text-muted">{label}</p>
                    <p className={`font-semibold text-sm mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Throw distances per projector */}
              {derived.throwCalcs.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-av-text-muted mt-2">Throw Distances</h4>
                  <div className="space-y-2">
                    {derived.throwCalcs.map((tc, i) => {
                      const proj = projectors.find(p => p.uuid === tc.projectorUuid);
                      const lensSpec = tc.lensUuid ? equipmentSpecs.find(s => s.uuid === tc.lensUuid) : null;
                      return (
                        <div key={i} className="flex items-center justify-between bg-av-surface-light rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm font-medium text-av-text">{proj?.id}</span>
                            {lensSpec && (
                              <span className="ml-2 text-xs text-av-text-muted">{lensSpec.manufacturer} {lensSpec.model}</span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-av-accent">
                            {tc.throwMin !== null && tc.throwMin !== undefined
                              ? `${mToDisplayFtIn(tc.throwMin!)}${tc.throwMax !== tc.throwMin ? ` – ${mToDisplayFtIn(tc.throwMax!)}` : ''}`
                              : 'Select lens to calculate'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Methodology note */}
              <div className="text-xs text-av-text-muted space-y-1 border-t border-av-border pt-3 mt-2">
                <div className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Lux at surface = (total lumens × gain factor) / image area (m²). For rear/dual-vision surfaces a 0.5× transmission loss is applied.</p>
                    <p className="mt-1">Contrast ratio = lux at surface / ambient lux. Useful contrast typically requires ≥ 7:1.</p>
                    <p className="mt-1">Throw = lens throw ratio range × image width. Ranges reflect zoom range; fixed-focus lenses show a single distance.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── NOTE (always at bottom of any section) ── */}
          <div className="border-t border-av-border pt-4 mt-2">
            <label className="block text-sm font-medium text-av-text-muted mb-1">Notes</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="input-field w-full resize-none"
              placeholder="Any additional notes…"
            />
          </div>

        </div>{/* end scrollable body */}
      </div>
    </div>
  );
};
