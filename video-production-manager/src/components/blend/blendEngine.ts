/**
 * blendEngine.ts — pure TypeScript math engine for multi-projector blend calculations.
 * Ported from imports/_unpack/screen_calc/WidescreenBlendCalculator.jsx (calcBlend / calcCones).
 * All physical dimensions in METERS. Pixels are unitless counts.
 */

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface BlendInput {
  /** Screen physical width (meters) */
  screenW: number;
  /** Screen physical height (meters) */
  screenH: number;
  /** Projector native horizontal resolution (pixels) */
  nativeW: number;
  /** Projector native vertical resolution (pixels) */
  nativeH: number;
  /** Number of projectors */
  nProj: number;
  /** Blend overlap percentage (0–49) */
  overlapPct: number;
  /** Throw distance from lens to screen (meters, optional) */
  throwDistM?: number;
  /** Throw ratio (throw distance / image width, optional) */
  throwRatio?: number;
  /** true = rear-projection geometry */
  mountRear?: boolean;
}

export interface ProjectorZone {
  i: number;
  label: string;
  /** left edge of coverage zone (meters from screen left) */
  l: number;
  /** right edge of coverage zone (meters from screen left) */
  r: number;
  /** center X of coverage zone (meters) */
  cx: number;
  /** width of coverage zone (meters) */
  w: number;
  /** overlap on left side (meters) */
  oL: number;
  /** overlap on right side (meters) */
  oR: number;
  /** pixel start (output frame) */
  pxS: number;
  /** pixel end */
  pxE: number;
  /** pixel width of output frame */
  pxW: number;
  /** resolved throw distance (meters) */
  td: number | null;
  /** resolved throw ratio */
  tr: number | null;
}

export interface BlendResult {
  /** overlap in pixels per edge */
  oPx: number;
  /** number of blend zones (nProj - 1) */
  zones: number;
  /** total canvas width (pixels) */
  canvasW: number;
  /** total canvas height (pixels) */
  canvasH: number;
  /** each projector's physical coverage width (meters) */
  projW: number;
  /** physical overlap width (meters) */
  oPhys: number;
  /** non-overlapping cone width per projector (meters) */
  cone: number;
  /** pixels per meter (for reference) */
  pixPerMeter: number;
  /** per-projector zones */
  zones_ap: ProjectorZone[];
  /** warnings */
  warn: string[];
}

export interface ConeInput {
  /** Screen center X in room (meters) */
  posX?: number;
  /** Screen bottom Y in room (meters) */
  posY?: number;
  /** Screen physical height (meters) */
  screenH: number;
  /** Projector height above floor (meters) */
  projHeight?: number;
  /** true = rear-projection geometry */
  mountRear?: boolean;
  /** Throw distance from source file (meters) */
  throwDistM?: number;
  /** Throw ratio (derived if throwDistM + projW available) */
  throwRatio?: number;
}

export interface ConePoint {
  /** Projector position X (meters) */
  px: number;
  /** Projector position Y/height (meters) */
  py: number;
  /** Projector position Z (throw distance, negative = front) */
  pz: number;
  /** Screen left edge (meters from room origin) */
  sL: number;
  /** Screen right edge */
  sR: number;
  /** Screen top edge */
  sT: number;
  /** Screen bottom edge */
  sB: number;
  /** Horizontal half-angle (degrees) */
  haH: number;
  /** Vertical half-angle (degrees) */
  haV: number;
  /** Actual throw distance (meters) */
  at: number;
  /** Actual throw ratio */
  atr: number;
}

// ── Math ──────────────────────────────────────────────────────────────────────

export const MIN_OVERLAP_PCT = 5;

/**
 * Compute blend layout for n projectors across a screen.
 * Returns null if inputs are out of range.
 */
export function calcBlend(input: BlendInput): BlendResult | null {
  const { screenW, screenH, nativeW, nativeH, nProj: n, overlapPct, throwDistM, throwRatio } = input;
  if (n < 1 || overlapPct < 0 || overlapPct >= 50) return null;

  const oF = overlapPct / 100;
  const oPx = Math.round(nativeW * oF);
  const zones = Math.max(0, n - 1);
  const canvasW = n * nativeW - zones * oPx;
  const canvasH = nativeH;

  const effN = n - (n - 1) * oF;
  const projW = screenW / effN;
  const oPhys = n === 1 ? 0 : oF * projW;
  const cone = n === 1 ? projW : projW - oPhys;

  const pixPerMeter = projW > 0 ? nativeW / projW : 0;

  const zones_ap: ProjectorZone[] = [];
  for (let i = 0; i < n; i++) {
    const l = i * (projW - oPhys);
    const r = l + projW;
    const cx = (l + r) / 2;
    const pxS = i * (nativeW - oPx);
    const pxE = pxS + nativeW;

    let td: number | null = throwDistM ?? null;
    let tr: number | null = throwRatio ?? null;
    if (td !== null && tr === null && projW > 0) tr = +(td / projW).toFixed(3);
    if (tr !== null && td === null) td = +(tr * projW).toFixed(3);

    zones_ap.push({
      i, label: `P${i + 1}`,
      l, r, cx, w: projW,
      oL: i > 0 ? oPhys : 0,
      oR: i < n - 1 ? oPhys : 0,
      pxS, pxE, pxW: nativeW,
      td, tr,
    });
  }

  const warn: string[] = [];
  if (overlapPct < 10 && n > 1) warn.push('Overlap < 10% — visible seams likely.');
  if (overlapPct > 30) warn.push('Overlap > 30% — excessive pixel waste.');
  if (canvasW > 7680) warn.push(`Canvas ${canvasW}×${canvasH} exceeds 8K.`);

  return { oPx, zones, canvasW, canvasH, projW, oPhys, cone, pixPerMeter: +pixPerMeter.toFixed(2), zones_ap, warn };
}

/**
 * Auto-determine number of projectors needed given one projector's coverage vs screen width.
 * Returns 1 (single) or n (multi) and the analysis status.
 */
export function autoCalcNProj(
  screenW: number,
  throwDistM: number,
  throwRatio: number,
  overlapPct = 15,
): { nProj: number; single: boolean; projCoverage: number } {
  const projCoverage = throwDistM / throwRatio;
  if (projCoverage >= screenW) {
    return { nProj: 1, single: true, projCoverage };
  }
  // Work backwards: given each projector covers projCoverage * (1 - overlapFraction) of unique content,
  // how many do we need to fill screenW?
  const oF = Math.max(MIN_OVERLAP_PCT, overlapPct) / 100;
  const nProj = Math.ceil(screenW / (projCoverage * (1 - oF * 0.5)));
  return { nProj: Math.max(2, nProj), single: false, projCoverage };
}

/**
 * Compute projector cone geometry for SVG rendering.
 */
export function calcCones(input: ConeInput, result: BlendResult): ConePoint[] {
  if (!result.zones_ap.length) return [];

  const posX = input.posX ?? 0;
  const posY = input.posY ?? 0;
  const projH = input.projHeight ?? (posY + input.screenH / 2);
  const screenW = result.projW * result.zones_ap.length - result.oPhys * (result.zones_ap.length - 1);
  const td = input.throwDistM ?? (input.throwRatio ? input.throwRatio * result.projW : 20);

  return result.zones_ap.map((ap) => {
    const px = posX - screenW / 2 + ap.cx;
    const py = projH;
    const pz = input.mountRear ? -td : td;

    const sL = posX - screenW / 2 + ap.l;
    const sR = posX - screenW / 2 + ap.r;
    const sB = posY;
    const sT = posY + input.screenH;

    const dz = Math.abs(pz);
    const haH = dz > 0 ? (Math.atan(ap.w / 2 / dz) * 180) / Math.PI : 45;
    const haV = dz > 0 ? (Math.atan(input.screenH / 2 / dz) * 180) / Math.PI : 30;
    const at = Math.sqrt((px - ap.cx) ** 2 + (py - (sB + input.screenH / 2)) ** 2 + pz * pz);

    return {
      px, py, pz, sL, sR, sT, sB,
      haH, haV,
      at,
      atr: ap.w > 0 ? +(dz / ap.w).toFixed(3) : 0,
    };
  });
}

/** Format aspect ratio as string e.g. "16:9" */
export function fmtAR(w: number, h: number): string {
  if (!h) return '—';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.round(w), Math.round(h));
  const rw = Math.round(w) / g;
  const rh = Math.round(h) / g;
  return rw > 100 ? `${(w / h).toFixed(2)}:1` : `${rw}:${rh}`;
}
