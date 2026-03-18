/**
 * useViewTransform — zoom & pan state for SVG canvases.
 *
 * Usage pattern:
 *   const vt = useViewTransform(SVG_W, SVG_H);
 *   ...
 *   <svg onWheel={vt.onWheel} onPointerDown={vt.onMiddleDown}
 *        onPointerMove={vt.onMiddleMove} onPointerUp={vt.onMiddleUp}>
 *     <g transform={`translate(${vt.t.panX} ${vt.t.panY}) scale(${vt.t.zoom})`}>
 *       {/* content using base-canvas coordinates — zoom/pan applied by SVG *‌/}
 *     </g>
 *     {/* HUD outside the transform group — always in SVG pixel space *‌/}
 *   </svg>
 *
 * Converting pointer events → world coordinates:
 *   getSvgPt(e, rect)        → [svgX, svgY]   (SVG pixel space)
 *   vt.toBase(svgX, svgY)    → [baseX, baseY] (base-canvas space, pre-zoom)
 *   viewFn(baseX, baseY)     → world coords   (view-specific inverse of wx/wy etc.)
 */

import { useState, useRef, useCallback } from 'react';

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

const ZOOM_MIN = 0.08;
const ZOOM_MAX = 20;
const ZOOM_STEP = 1.12;

export function useViewTransform(svgW: number, svgH: number) {
  const [t, setT] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const midRef = useRef<{ clientX: number; clientY: number } | null>(null);

  /**
   * Fit a rectangle (in base-canvas coordinates) to fill the SVG with `margin` padding.
   * Call after computing context bounds (e.g., room bounding box in base coords).
   */
  const fitRect = useCallback(
    (bx: number, by: number, bw: number, bh: number, margin = 32) => {
      if (bw <= 0 || bh <= 0) return;
      const zoom = Math.min(
        (svgW - 2 * margin) / bw,
        (svgH - 2 * margin) / bh,
      );
      const panX = svgW / 2 - (bx + bw / 2) * zoom;
      const panY = svgH / 2 - (by + bh / 2) * zoom;
      setT({ zoom, panX, panY });
    },
    [svgW, svgH],
  );

  /** Zoom toward the cursor. Attach to SVG onWheel. */
  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * svgW;
      const cy = ((e.clientY - rect.top) / rect.height) * svgH;
      setT(prev => {
        const f = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.zoom * f));
        const wx_ = (cx - prev.panX) / prev.zoom;
        const wy_ = (cy - prev.panY) / prev.zoom;
        return { zoom, panX: cx - wx_ * zoom, panY: cy - wy_ * zoom };
      });
    },
    [svgW, svgH],
  );

  /** Begin middle-mouse pan. Attach to SVG onPointerDown. */
  const onMiddleDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 1) return;
    e.preventDefault();
    midRef.current = { clientX: e.clientX, clientY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  /** Continue middle-mouse pan. Attach to SVG onPointerMove. */
  const onMiddleMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!midRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = svgW / rect.width;
      const scaleY = svgH / rect.height;
      const dx = (e.clientX - midRef.current.clientX) * scaleX;
      const dy = (e.clientY - midRef.current.clientY) * scaleY;
      midRef.current = { clientX: e.clientX, clientY: e.clientY };
      setT(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
    },
    [svgW, svgH],
  );

  /** End middle-mouse pan. Attach to SVG onPointerUp / onPointerLeave. */
  const onMiddleUp = useCallback(() => {
    midRef.current = null;
  }, []);

  const isPanning = () => !!midRef.current;

  /** Reset zoom/pan to default (zoom=1, no offset) */
  const resetZoom = useCallback(() => setT({ zoom: 1, panX: 0, panY: 0 }), []);

  /**
   * Convert SVG pixel coordinates → base-canvas coordinates (pre-transform).
   * Base-canvas coords are what wx()/wy()/sy()/sz()/fx()/fz() output directly.
   */
  const toBase = useCallback(
    (svgX: number, svgY: number): [number, number] => [
      (svgX - t.panX) / t.zoom,
      (svgY - t.panY) / t.zoom,
    ],
    [t],
  );

  return {
    t,
    setT,
    fitRect,
    onWheel,
    onMiddleDown,
    onMiddleMove,
    onMiddleUp,
    isPanning,
    resetZoom,
    toBase,
  };
}
