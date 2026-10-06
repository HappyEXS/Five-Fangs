// Ice Ivy: druga ewolucja Ivy, strzelec leczący drużynę; nie rusza się z miejsca. Przemarznięte,
// zwinięte w pętlę pnącze oblepione bryłami lodu i soplami; zamiast łba ma wieniec lodowych
// odłamków wokół ciemnego pąka, w którym świeci płatek śniegu (szkic autora: spirala w kostkach
// lodu, głowa ze śnieżynką).
import { union } from '../../raster.ts';
import { type Palette, type PartCanvas, type Point, partCanvas, RAG_HARD } from '../kit.ts';
import { thornShin, thornThigh, vineFore, vineUpper } from '../limbs-plants.ts';
import { plant } from './palette.ts';

const INK = '#0c1210';
/** Przemarznięta łodyga: szarozielona, z szronem. */
const FROSTBITE = { main: '#5c7065', shade: '#33423b', light: '#9bb0a6', dark: INK };
const ICE = { main: '#a4c8cf', shade: '#6a95a0', light: '#e0f2f3', dark: '#15242a' };
const FROST_GLOW = '#d4f3f6';

export const ICE_IVY: Palette = plant(FROSTBITE, ICE.main, FROST_GLOW);
const ROOT: Palette = plant(
  { main: '#3a443f', shade: '#1f2623', light: '#5c7065', dark: INK },
  ICE.main,
  FROST_GLOW,
);

/** Odłamek lodu: wydłużony romb od nasady w kierunku `degrees` (0 = w prawo, 90 = w dół). */
function shard(c: PartCanvas, base: Point, degrees: number, length: number, width = 0.28): void {
  const angle = (degrees * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const half = length * width;
  const mid: Point = [base[0] + dx * length * 0.42, base[1] + dy * length * 0.42];
  const shape = c.poly([
    base,
    [mid[0] - dy * half, mid[1] + dx * half],
    [base[0] + dx * length, base[1] + dy * length],
    [mid[0] + dy * half, mid[1] - dx * half],
  ]);
  c.form(shape, ICE, { rag: RAG_HARD, shadow: 0.7, rim: 0.7 });
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-13, -25, 16, 7, 1);
  const cx = 1.5;
  const cy = -8;
  // Wieniec odłamków: nierówny, dwa krótkie.
  for (const [degrees, length] of [
    [-155, 9.6],
    [-108, 12.4],
    [-62, 8],
    [-18, 11.4],
    [28, 7.4],
    [78, 9.8],
    [150, 7.6],
  ] as const) {
    const angle = (degrees * Math.PI) / 180;
    shard(c, [cx + Math.cos(angle) * 3.4, cy + Math.sin(angle) * 3.4], degrees, length);
  }
  // Ciemny, zmarznięty pąk; w nim płatek śniegu ze światła.
  c.form(
    c.dot(cx, cy, 5.6),
    { main: '#27312d', shade: '#141a18', dark: INK, light: FROSTBITE.main },
    { rag: 0.35 },
  );
  c.fill(c.dot(cx + 0.4, cy, 3.6), p.glow, 0.18);
  for (const degrees of [0, 60, 120]) {
    const angle = (degrees * Math.PI) / 180;
    const dx = Math.cos(angle) * 3;
    const dy = Math.sin(angle) * 3;
    c.fill(c.line(cx + 0.4 - dx, cy - dy, cx + 0.4 + dx, cy + dy, 0.34), p.glow);
  }
  c.fill(c.dot(cx + 0.4, cy, 0.9), '#ffffff');
  return c.finish(0.7);
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-15, -27, 16, 30, 2);
  c.form(union(c.horn(-2, 23.4, -10, 25.8, 1.8, 0.4), c.horn(-2, 23.4, 7, 26, 1.8, 0.4)), ROOT, {
    rag: 0.4,
  });
  // Łodyga zwinięta w pętlę.
  const stem = union(
    c.arc([-2, 24.6], [11.5, 17], [2.5, 7], 3.4, 3.2),
    c.arc([2.5, 7], [-10.5, -1], [0, -9], 3.2, 2.9),
    c.arc([0, -9], [7.5, -15], [0, -23], 2.9, 2.5),
  );
  const inside = c.form(stem, p, { rag: 0.35 });
  // Szron na wierzchu łodygi.
  c.patches(inside, ICE.light, 0.3, 2.2, 0.8);
  c.patches(inside, p.shade, 0.18, 2.4, 0.85);
  // Sople.
  for (const [x, y, length] of [
    [7, 18.4, 5.4],
    [3, 9.6, 4.6],
    [-6.4, 1.4, 5.2],
    [4.4, -13.4, 4],
  ] as const) {
    c.ink(c.horn(x, y, x + 0.3, y + length, 1, 0.12), ICE.light, ICE.dark);
  }
  // Bryły lodu przymarznięte do łodygi.
  shard(c, [8, 15.5], 20, 6.4, 0.34);
  shard(c, [-6.5, 3], 200, 6, 0.34);
  shard(c, [6, -13.5], -30, 5.6, 0.34);
  shard(c, [-3.6, -18.4], 215, 5, 0.34);
  shard(c, [-4.6, 21], 160, 5.4, 0.34);
  return c.finish(0.8);
}

/** Kiść lodowych odłamków na końcu łodygi. */
function crystalBloom(c: PartCanvas): void {
  shard(c, [2, 10], 60, 7.4, 0.3);
  shard(c, [2, 10], 100, 9.4, 0.26);
  shard(c, [2, 10], 140, 6.6, 0.3);
}

function icicle(): PartCanvas {
  const c = partCanvas(-2, -2, 2, 6, 5);
  c.ink(c.horn(0, 0, 0, 4.4, 0.9, 0.12), ICE.light, ICE.dark);
  return c;
}

export function iceIvyParts(): Record<string, PartCanvas> {
  const p = ICE_IVY;
  return {
    thigh: thornThigh(p),
    shin: thornShin(p),
    torso: torso(p),
    upper: vineUpper(p),
    fore: vineFore(p, crystalBloom),
    head: head(p),
    weapon: icicle(),
  };
}
