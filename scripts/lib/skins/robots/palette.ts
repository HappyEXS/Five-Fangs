// Kolory i wspólne kształty szczepu Robots: łuszcząca się niebieska farba (kolor szczepu ze
// szkicu to niebieski; tu przygaszony, stalowy), goła stal, rdza, mosiądz i jedyne żywe światło:
// bursztyn lamp albo cyjan hologramu.
import { intersect, type Shape } from '../../raster.ts';
import { type Palette, type PartCanvas, type Point, RUST, STEEL } from '../kit.ts';
import { HARD } from '../limbs-robots.ts';

const INK = STEEL.dark;

export const PAINT = { main: '#3e5c76', shade: '#243849', light: '#6d8ba3', dark: INK };
export const PAINT_DARK = { main: '#2c4358', shade: '#182734', light: '#4d6c86', dark: INK };
/** Blacha przepalona żarem: sina, okopcona. */
export const SCORCHED = { main: '#3b4654', shade: '#1f262f', light: '#647284', dark: INK };
/** Wytarta jasna stal masek i ostrzy. */
export const PALE_STEEL = { main: '#8b9299', shade: '#535a61', light: '#c5cbd1', dark: INK };
export const BRASS = { main: '#86672e', shade: '#4c3a17', light: '#b59458', dark: INK };
export const AMBER = '#f5a742';
export const CYAN = '#74e3e8';
export const SOOT_BLACK = '#07090b';

export function robot(
  base: typeof PAINT = PAINT,
  glow: string = AMBER,
  accent: string = RUST,
): Palette {
  return { ...base, accent, glow };
}

/** Płyta pancerza: twarda krawędź, wytarty brzeg, rdza. Zwraca wnętrze. */
export function plate(c: PartCanvas, shape: Shape, palette: typeof PAINT, rust = 0.28): Shape {
  const inside = c.form(shape, palette, HARD);
  if (rust > 0) c.patches(inside, RUST, rust, 2.4, 0.95);
  return inside;
}

/** Szew albo pęknięcie blachy wewnątrz `clip`. */
export function seam(c: PartCanvas, clip: Shape, points: readonly Point[], width = 0.28): void {
  c.fill(intersect(clip, c.path(points, width)), INK, 0.85);
}

/** Szklana soczewka: oprawa, ciemne szkło i mały punkt światła w głębi. */
export function lens(
  c: PartCanvas,
  x: number,
  y: number,
  r: number,
  glow: string,
  rim: typeof PAINT = BRASS,
): void {
  c.form(c.dot(x, y, r), rim, { rag: 0.15, shadow: 0.6, rim: 0.5 });
  c.fill(c.dot(x, y, r * 0.7), SOOT_BLACK);
  c.fill(c.dot(x + r * 0.08, y, r * 0.5), glow, 0.2);
  c.fill(c.dot(x + r * 0.1, y, r * 0.24), glow);
  // Odblask na szkle: wąski, brudny.
  c.fill(c.line(x - r * 0.42, y - r * 0.36, x - r * 0.16, y - r * 0.5, r * 0.07), '#ffffff', 0.35);
}

/** Szczelina wizjera z żarem w środku. */
export function visor(
  c: PartCanvas,
  clip: Shape,
  from: Point,
  to: Point,
  width: number,
  glow: string,
): void {
  c.fill(intersect(clip, c.line(from[0], from[1], to[0], to[1], width)), SOOT_BLACK);
  const mx = from[0] + (to[0] - from[0]) * 0.72;
  const my = from[1] + (to[1] - from[1]) * 0.72;
  c.fill(intersect(clip, c.dot(mx, my, width * 2.6)), glow, 0.25);
  c.fill(intersect(clip, c.line(mx - width, my, mx + width, my, width * 0.55)), glow);
}

/** Zaciek rdzy spływający spod nitu albo krawędzi. */
export function rustStreak(c: PartCanvas, clip: Shape, x: number, y: number, length: number): void {
  c.fill(intersect(clip, c.horn(x, y, x - 0.2, y + length, 0.7, 0.2)), RUST, 0.85);
}
