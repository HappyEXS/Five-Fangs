// Kolory i wspólne kształty szczepu Plants: chorobliwa bagienna zieleń (kolor szczepu ze szkicu
// to jasna zieleń; tu przygaszona i brudna), gnijąca kora, pleśń i blade światło oczu.
import type { Shape } from '../../raster.ts';
import type { Palette, PartCanvas, Point } from '../kit.ts';

const INK = '#0d1208';

export const LEAF = { main: '#566a30', shade: '#313f1a', light: '#86984f', dark: INK };
export const LEAF_DARK = { main: '#3a4a22', shade: '#212b12', light: '#566a30', dark: INK };
export const BARK = { main: '#4b3c2b', shade: '#2a2117', light: '#75614a', dark: '#0e0a06' };
export const VINE = { main: '#4f6a34', shade: '#2c3d1c', light: '#7f9a52', dark: INK };
export const MOSS = '#6b7a35';
/** Huby i strąki: blady, brudny ugier. */
export const FUNGUS = { main: '#a8914a', shade: '#665628', light: '#cbb873', dark: INK };
/** Zgnilizna: przygaszony fiolet. */
export const ROT = { main: '#5c3a54', shade: '#33202f', light: '#8a6080', dark: INK };
export const SWAMP_GLOW = '#dfe86a';

export function plant(
  base: typeof LEAF,
  accent: string = MOSS,
  glow: string = SWAMP_GLOW,
): Palette {
  return { ...base, accent, glow };
}

/** Liść: soczewka od nasady do czubka; `width` to połowa szerokości w najszerszym miejscu. */
export function leafShape(c: PartCanvas, base: Point, tip: Point, width: number): Shape {
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * width;
  const ny = (dx / length) * width;
  const mx = base[0] + dx * 0.45;
  const my = base[1] + dy * 0.45;
  return c.poly([base, [mx + nx, my + ny], tip, [mx - nx, my - ny]]);
}

/** Liść z nerwem, postrzępiony. */
export function leaf(
  c: PartCanvas,
  base: Point,
  tip: Point,
  width: number,
  palette: typeof LEAF,
): void {
  c.form(leafShape(c, base, tip, width), palette, { rag: 0.5, shadow: 0.7 });
  c.fill(c.line(base[0], base[1], tip[0], tip[1], 0.22), palette.dark, 0.7);
}
