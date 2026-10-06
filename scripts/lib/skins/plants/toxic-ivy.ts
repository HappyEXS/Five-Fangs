// Toxic Ivy: druga ewolucja Ivy, strzelec, którego pocisk przechodzi przez wszystkich wrogów;
// nie rusza się z miejsca. Nabrzmiałe, żółtozielone pnącze obsypane ropnymi pęcherzami, z których
// część pękła i cieknie; łeb to ciemny, zgniły strąk z rozdziawioną zębatą paszczą (szkic autora:
// zwój w bąblach, ciemna głowa z wyciętą paszczą).
import { intersect, union } from '../../raster.ts';
import { BONE_SHADE, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { thornShin, thornThigh, vineFore, vineUpper } from '../limbs-plants.ts';
import { BARK, plant, ROT } from './palette.ts';

const INK = '#0d1006';
const TOXIC = { main: '#72802b', shade: '#404915', light: '#a8b350', dark: INK };
/** Ropa w pęcherzach. */
const PUS = { main: '#cdbf58', shade: '#8a7d2c', light: '#ece39a', dark: INK };
const OOZE = '#d9f04a';

export const TOXIC_IVY: Palette = plant(TOXIC, ROT.main, OOZE);
const ROOT: Palette = plant(
  { ...BARK, main: BARK.shade, shade: '#1a140d', light: BARK.main },
  ROT.main,
  OOZE,
);

/** Zaciek jadu: cienka strużka zakończona kroplą. */
function drip(c: PartCanvas, x: number, y: number, length: number): void {
  c.fill(c.horn(x, y, x + 0.2, y + length, 0.28, 0.5), OOZE, 0.9);
  c.fill(c.dot(x + 0.2, y + length, 0.62), OOZE);
}

/** Pęcherz: cały albo pęknięty, z którego ścieka jad. */
function boil(c: PartCanvas, x: number, y: number, r: number, burst = false): void {
  if (burst) {
    c.fill(c.dot(x, y, r), INK);
    c.fill(c.dot(x, y, r * 0.6), ROT.shade);
    drip(c, x, y, r * 2.6);
    return;
  }
  c.form(c.dot(x, y, r), PUS, { rag: 0.15, shadow: 0.6 });
  c.fill(c.dot(x + r * 0.3, y - r * 0.3, r * 0.3), PUS.light);
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-13, -23, 17, 10, 1);
  const pod = c.oval(1.5, -8, 8.2, 7.8);
  const inside = c.form(pod, ROT, { rag: 0.45 });
  c.patches(inside, ROT.shade, 0.3, 2.6, 0.9);
  c.patches(inside, p.shade, 0.14, 2.2, 0.85);
  // Paszcza: klin wycięty z przodu strąka, w środku poświata jadu, na krawędziach ciernie.
  const maw = intersect(
    inside,
    c.poly([
      [0.2, -6.6],
      [12, -14.6],
      [12, 0.6],
    ]),
  );
  c.fill(maw, '#070804');
  c.fill(intersect(maw, c.dot(2.6, -6.6, 1.5)), p.glow, 0.55);
  for (const [x, y, ty] of [
    [4, -9.6, -6.8],
    [6.2, -11, -7.6],
    [8.4, -12.6, -8.8],
    [4.2, -3.8, -6.4],
    [6.4, -2.4, -5.6],
    [8.4, -1, -4.6],
  ] as const) {
    c.fill(intersect(maw, c.horn(x, y, x + 0.5, ty, 0.85, 0.1)), BONE_SHADE);
  }
  // Ślina z jadu.
  drip(c, 7.4, -1.6, 5.4);
  c.eye(-0.6, -12, 1.7, p, 0.8);
  boil(c, -3.6, -13.6, 1.9);
  boil(c, 2.6, -15.4, 1.5);
  boil(c, -5.4, -6.4, 1.4, true);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-16, -27, 16, 30, 2);
  c.form(union(c.horn(-2, 23.4, -11, 25.8, 2, 0.4), c.horn(-2, 23.4, 7.6, 26, 2, 0.4)), ROOT, {
    rag: 0.4,
  });
  // Nabrzmiała łodyga z guzami.
  const stem = union(
    c.arc([-2, 24.6], [10.5, 14], [-3, 3], 4.8, 4.4),
    c.arc([-3, 3], [-10.5, -9], [0, -23], 4.4, 3.4),
    c.dot(5.6, 15, 4.6),
    c.dot(-6.8, -4, 4.4),
  );
  const inside = c.form(stem, p, { rag: 0.4 });
  c.patches(inside, p.shade, 0.24, 2.6, 0.85);
  // Fioletowe żyły zgnilizny.
  for (const vein of [
    [
      [-1, 22],
      [3.6, 17],
      [2, 12],
      [-1.6, 8],
    ],
    [
      [-5, 0],
      [-7, -6],
      [-4.4, -12],
      [-2, -18],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(vein, 0.34)), ROT.main, 0.85);
  }
  boil(c, 7, 13.6, 2.2);
  boil(c, 2.4, 18.6, 1.6);
  boil(c, -8, -5, 2.1);
  boil(c, -4.6, 3.6, 1.6, true);
  boil(c, -2.6, -14, 1.6);
  boil(c, 4.6, 8.4, 1.4, true);
  boil(c, -6.4, 9, 1.3);
  return c.finish();
}

/** Nabrzmiały worek zarodników na końcu łodygi. */
function sporeSac(c: PartCanvas): void {
  c.form(c.oval(2, 14.2, 3.4, 4.4), PUS, { rag: 0.3 });
  c.fill(c.dot(3, 12.6, 1), PUS.light);
  c.fill(c.dot(1.4, 15.6, 1.1), ROT.main, 0.85);
  drip(c, 2, 18.2, 2.8);
}

function droplet(): PartCanvas {
  const c = partCanvas(-2, -2, 2, 6, 5);
  drip(c, 0, 0, 3.4);
  return c;
}

export function toxicIvyParts(): Record<string, PartCanvas> {
  const p = TOXIC_IVY;
  return {
    thigh: thornThigh(p),
    shin: thornShin(p),
    torso: torso(p),
    upper: vineUpper(p),
    fore: vineFore(p, sporeSac),
    head: head(p),
    weapon: droplet(),
  };
}
