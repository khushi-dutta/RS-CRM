// =============================================================================
// Geometry Utilities — Used across the solar design studio
// =============================================================================

import type { Point2D } from '../store/types';

const DEG = Math.PI / 180;

/** Shoelace formula for polygon area */
export function polygonArea(polygon: Point2D[]): number {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2;
}

/** Ray-casting point-in-polygon test */
export function pointInPolygon(pt: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersects = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Check if all 4 corners of a rect are inside a polygon */
export function rectFullyInPolygon(cx: number, cy: number, hw: number, hh: number, polygon: Point2D[]): boolean {
  const corners: Point2D[] = [
    { x: cx - hw, y: cy - hh }, { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh }, { x: cx - hw, y: cy + hh },
  ];
  return corners.every(c => pointInPolygon(c, polygon));
}

/** Check if any corner of a rect overlaps a polygon */
export function rectOverlapsPolygon(cx: number, cy: number, hw: number, hh: number, polygon: Point2D[]): boolean {
  const corners: Point2D[] = [
    { x: cx - hw, y: cy - hh }, { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh }, { x: cx - hw, y: cy + hh },
  ];
  return corners.some(c => pointInPolygon(c, polygon));
}

/** Inset polygon by offset (simplified edge-parallel shrink) */
export function insetPolygon(polygon: Point2D[], offsetM: number): Point2D[] {
  if (polygon.length < 3) return polygon;
  const n = polygon.length;
  const result: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n];
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];

    const e1x = curr.x - prev.x, e1y = curr.y - prev.y;
    const e2x = next.x - curr.x, e2y = next.y - curr.y;
    const len1 = Math.hypot(e1x, e1y), len2 = Math.hypot(e2x, e2y);
    if (len1 === 0 || len2 === 0) { result.push({ ...curr }); continue; }

    const n1x = e1y / len1, n1y = -e1x / len1;
    const n2x = e2y / len2, n2y = -e2x / len2;

    const bx = n1x + n2x, by = n1y + n2y;
    const blen = Math.hypot(bx, by);
    if (blen < 1e-6) { result.push({ x: curr.x + n1x * offsetM, y: curr.y + n1y * offsetM }); continue; }

    const dot = n1x * (bx / blen) + n1y * (by / blen);
    const scale = dot === 0 ? offsetM : offsetM / dot;
    result.push({ x: curr.x + (bx / blen) * scale, y: curr.y + (by / blen) * scale });
  }
  return result;
}

/** Inset polygon with per-edge setbacks (N, E, S, W mapped to edges) */
export function insetPolygonPerEdge(polygon: Point2D[], setbacks: { n: number; e: number; s: number; w: number }): Point2D[] {
  // Simple approach: use average setback for the general inset
  const avg = (setbacks.n + setbacks.e + setbacks.s + setbacks.w) / 4;
  return insetPolygon(polygon, avg);
}

/** Rotate a point by angle (radians) around origin */
export function rotatePoint(p: Point2D, angle: number): Point2D {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Reflect a point across a line defined by p1 and p2 */
export function reflectAcrossLine(point: Point2D, p1: Point2D, p2: Point2D): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return point;

  const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;

  return {
    x: 2 * projX - point.x,
    y: 2 * projY - point.y,
  };
}

/** Euclidean distance between two points */
export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Get centroid of a polygon */
export function centroid(polygon: Point2D[]): Point2D {
  const n = polygon.length;
  if (n === 0) return { x: 0, y: 0 };
  return {
    x: polygon.reduce((s, p) => s + p.x, 0) / n,
    y: polygon.reduce((s, p) => s + p.y, 0) / n,
  };
}

/** Get bounding box of a polygon */
export function boundingBox(polygon: Point2D[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

/** Snap a value to nearest grid step */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Check if point is near another point (within threshold px) */
export function isNearPoint(a: Point2D, b: Point2D, threshold: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < threshold;
}

/** Get edges of a polygon as pairs */
export function getEdges(polygon: Point2D[]): [Point2D, Point2D][] {
  const edges: [Point2D, Point2D][] = [];
  for (let i = 0; i < polygon.length; i++) {
    edges.push([polygon[i], polygon[(i + 1) % polygon.length]]);
  }
  return edges;
}

/** Convert px to meters using scale */
export function pxToMeters(px: number, pxPerMeter: number): number {
  return px / pxPerMeter;
}

/** Convert meters to px using scale */
export function metersToPx(m: number, pxPerMeter: number): number {
  return m * pxPerMeter;
}

/** Shadow-free row spacing calculation */
export function shadowFreeRowSpacing(moduleLengthM: number, tiltDeg: number, latDeg: number): number {
  const dec = -23.45; // winter solstice declination
  const elevDeg = 90 - Math.abs(latDeg) - 23.45;
  const tilt = tiltDeg * DEG;
  const elev = elevDeg * DEG;
  if (Math.tan(elev) < 1e-6) return moduleLengthM * 2.0;
  const shadowLength = moduleLengthM * Math.cos(tilt) + moduleLengthM * Math.sin(tilt) / Math.tan(elev);
  return shadowLength;
}

/** Generate unique ID */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
