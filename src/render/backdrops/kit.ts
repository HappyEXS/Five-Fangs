// Przybory do teł światów. Tło to kilka warstw płaskich sylwetek, jak dekoracje teatrzyku
// z wycinanek (ADR 0015): każda warstwa to wielokąty jednego koloru. Czysta geometria, bez
// canvasu, więc da się ją sprawdzić w testach; ścieżki buduje z niej background.ts.
// Współrzędne w jednostkach logicznych sceny: (0, 0) to lewy górny róg, podłoga leży na FLOOR.
import { GROUND_Y } from '../camera.ts';
import { LOGICAL_WIDTH } from '../viewport.ts';

/** Wielokąt jako płaska lista x0, y0, x1, y1, … */
export type Polygon = readonly number[];

export interface BackdropLayer {
  readonly color: string;
  readonly polygons: readonly Polygon[];
}

export interface BackdropSpec {
  readonly sky: string;
  readonly ground: string;
  readonly floorLine: string;
  /** Warstwy od najdalszej do najbliższej. */
  readonly layers: readonly BackdropLayer[];
}

export const W = LOGICAL_WIDTH;
export const FLOOR = GROUND_Y;

/**
 * Stała „losowość”: liczba 0..n-1 wyliczona z numeru elementu. Tło jest zawsze takie samo,
 * bez generatora liczb losowych.
 */
export function vary(i: number, n: number, salt = 0): number {
  return (i * 53 + salt * 31 + 17) % n;
}

/** Prostokąt o lewym górnym rogu (x, y). */
export function rect(x: number, y: number, w: number, h: number): Polygon {
  return [x, y, x + w, y, x + w, y + h, x, y + h];
}

/** Koło jako wielokąt foremny. */
export function disc(cx: number, cy: number, r: number, sides = 28): Polygon {
  const points: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    points.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  return points;
}

/** Elipsa jako wielokąt: korony drzew, kłęby dymu. */
export function oval(cx: number, cy: number, rx: number, ry: number, sides = 20): Polygon {
  const points: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    points.push(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
  }
  return points;
}

/** Mały romb: gwiazda, świetlik, iskra. */
export function spark(cx: number, cy: number, r: number): Polygon {
  return [cx, cy - r, cx + r, cy, cx, cy + r, cx - r, cy];
}

/**
 * Sylwetka od lewej do prawej krawędzi sceny: `tops` to kolejne punkty grzbietu (x, y), a dół
 * domyka linia `base`.
 */
export function ridge(tops: readonly number[], base = FLOOR): Polygon {
  return [0, base, ...tops, W, base];
}

/**
 * Grzbiet o stałym kroku: wysokość każdego punktu z funkcji jego numeru. Ostatni punkt leży
 * na prawej krawędzi sceny albo za nią.
 */
export function steps(step: number, heightOf: (i: number) => number, base = FLOOR): Polygon {
  const tops: number[] = [];
  for (let i = 0; i * step <= W + step; i++) tops.push(i * step, base - heightOf(i));
  return ridge(tops, base);
}

/** Mur z blankami od `x0` do `x1` o górnej krawędzi `top`; zęby mają szerokość `tooth`. */
export function battlement(
  x0: number,
  x1: number,
  top: number,
  tooth = 14,
  depth = 10,
  base = FLOOR,
): Polygon {
  const points: number[] = [x0, base, x0, top];
  let x = x0;
  let up = true;
  while (x < x1) {
    const next = Math.min(x + tooth, x1);
    const y = up ? top : top + depth;
    points.push(x, y, next, y);
    x = next;
    up = !up;
  }
  points.push(x1, base);
  return points;
}

/** Trójkąt: dach, szczyt, proporzec. */
export function tri(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): Polygon {
  return [ax, ay, bx, by, cx, cy];
}

/** Koło zębate: środek, promień podstawy, liczba i wysokość zębów. */
export function gear(cx: number, cy: number, r: number, teeth: number, tooth: number): Polygon {
  const points: number[] = [];
  const stepAngle = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * stepAngle;
    for (const [offset, radius] of [
      [0, r],
      [0.12, r + tooth],
      [0.38, r + tooth],
      [0.5, r],
    ] as const) {
      const angle = a + offset * stepAngle;
      points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
  }
  return points;
}

/** Łuk o grubości `width` przez trzy punkty (krzywa Béziera 2. stopnia): żebro, liana, konar. */
export function bow(
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  width: number,
  taper = 1,
): Polygon {
  const SEGMENTS = 10;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const u = 1 - t;
    const x = u * u * ax + 2 * u * t * cx + t * t * bx;
    const y = u * u * ay + 2 * u * t * cy + t * t * by;
    // Styczna krzywej: jej normalna rozsuwa oba brzegi łuku.
    const dx = 2 * u * (cx - ax) + 2 * t * (bx - cx);
    const dy = 2 * u * (cy - ay) + 2 * t * (by - cy);
    const length = Math.hypot(dx, dy) || 1;
    const half = (width / 2) * (1 - t * (1 - taper));
    left.push(x - (dy / length) * half, y + (dx / length) * half);
    right.push(x + (dy / length) * half, y - (dx / length) * half);
  }
  // Obwód: lewy brzeg od początku do końca, prawy z powrotem.
  const points = [...left];
  for (let i = right.length - 2; i >= 0; i -= 2) points.push(right[i] ?? 0, right[i + 1] ?? 0);
  return points;
}
