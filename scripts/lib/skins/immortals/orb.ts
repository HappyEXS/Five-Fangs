// Orb: forma bazowa szczepu Immortals, strzelec. Pożyłkowane oko w wieńcu połamanych złotych
// promieni, zawieszone nad ziemią na wiciach nerwów; źrenica ma kształt pękniętego serca
// (szkic autora: oko w poszarpanej aureoli).
//
// Na szkielecie ludzi okiem jest „głowa” (wisi pod stawem szyi i kołysze się przy strzale),
// tułów to wieniec za nim, ramię to ciężka powieka, a przedramię błysk na tęczówce.
import { intersect, union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { tendrilShin, tendrilThigh } from '../limbs-immortals.ts';
import { GOLD, immortal, PORCELAIN } from './palette.ts';

export const ORB: Palette = immortal(GOLD, '#4a3320');
/** Wici nerwów: ciemne, mięsiste złoto. */
const NERVE: Palette = immortal(
  { main: '#5c4526', shade: '#33240f', light: '#8c6f2e', dark: GOLD.dark },
  GOLD.main,
);
/** Środek oka w układzie szyi: oko wisi tuż pod nią. */
const EYE_X = 1;
const EYE_Y = 9;

function head(p: Palette): PartCanvas {
  const c = partCanvas(-13, -5, 15, 23, 1);
  const inside = c.form(c.dot(EYE_X, EYE_Y, 10), PORCELAIN, { rag: 0.35 });
  // Żyłki biegną od brzegu ku tęczówce.
  for (const vein of [
    [
      [-7.5, 4],
      [-4.5, 6.5],
      [-2.4, 6],
    ],
    [
      [-7, 13.5],
      [-4, 12],
      [-2.6, 13],
      [-1, 12],
    ],
    [
      [-1, 17.5],
      [0.5, 15.5],
      [0, 14],
    ],
    [
      [-5, -0.5],
      [-2.5, 2.5],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(vein, 0.28)), '#6b3a26');
  }
  // Tęczówka ze ściemniałego złota patrzy w stronę wroga.
  c.fill(intersect(inside, c.dot(4, EYE_Y, 5.7)), p.dark);
  c.fill(intersect(inside, c.dot(4, EYE_Y, 5)), p.main);
  c.fill(intersect(inside, c.dot(4.4, EYE_Y, 3.7)), p.shade);
  // Źrenica: pęknięte serce.
  c.fill(
    c.ragged(
      c.poly([
        [2.4, 7.6],
        [3.9, 6.3],
        [5.1, 7.5],
        [6.3, 6.3],
        [7.7, 7.8],
        [5.1, 12.6],
      ]),
      0.25,
      2,
    ),
    p.dark,
  );
  c.fill(
    c.path(
      [
        [5.1, 7.4],
        [4.6, 9],
        [5.5, 10.2],
      ],
      0.2,
    ),
    p.shade,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-19, -34, 21, 5, 2);
  const cx = EYE_X;
  const cy = -23 + EYE_Y;
  // Wieniec promieni: nierówny, kilka ułamanych.
  const rays = [
    [-172, 16],
    [-142, 13.5],
    [-114, 17.5],
    [-86, 12.6],
    [-58, 16.5],
    [-30, 13],
    [4, 16],
    [34, 12.4],
    [62, 17],
    [94, 13],
    [124, 16.5],
    [154, 12.6],
  ] as const;
  const corona = union(
    c.dot(cx, cy, 11.6),
    ...rays.map(([degrees, length]) => {
      const angle = (degrees * Math.PI) / 180;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      return c.horn(cx + dx * 8, cy + dy * 8, cx + dx * length, cy + dy * length, 3.2, 0.3);
    }),
  );
  const inside = c.form(corona, p, { rag: 0.45 });
  c.patches(inside, p.shade, 0.3, 2.6, 0.9);
  c.patches(inside, p.light, 0.14, 2, 0.9);
  // Pęk nerwów od tyłu oka do miejsca, z którego wyrastają wici.
  c.form(c.arc([cx - 3, cy + 8], [-3.4, -3], [0, 1.2], 2.4, 1.9), NERVE, { rag: 0.3 });
  return c.finish();
}

/** Ciężka górna powieka: ramię szkieletu, więc przy strzale unosi się i oko otwiera się szerzej. */
function lid(p: Palette): PartCanvas {
  const c = partCanvas(-13, -7, 13, 8, 3);
  // Bark leży 6 jednostek nad środkiem oka.
  const shape = intersect(
    c.dot(0, 6, 10.7),
    c.poly([
      [-13, -7],
      [13, -7],
      [13, 2.4],
      [-13, 5],
    ]),
  );
  const inside = c.form(shape, p, { rag: RAG_HARD, shadow: 0.7 });
  c.patches(inside, p.shade, 0.3, 2.4, 0.9);
  c.fill(intersect(c.dot(0, 6, 10.7), c.line(-12, 4.9, 12, 2.4, 0.5)), p.dark);
  return c.finish();
}

/** Błysk na tęczówce (przedramię szkieletu) i kropla złota pod okiem (broń). */
function glint(p: Palette): PartCanvas {
  const c = partCanvas(-3, -3, 3, 3, 4);
  c.fill(c.dot(0.4, -0.4, 1.9), p.glow, 0.3);
  c.fill(c.dot(0.4, -0.4, 0.9), p.glow);
  return c;
}

function drip(p: Palette): PartCanvas {
  const c = partCanvas(-2, -2, 2, 3, 5);
  c.fill(c.dot(0, 0.4, 0.8), p.shade);
  return c;
}

export function orbParts(): Record<string, PartCanvas> {
  const p = ORB;
  return {
    thigh: tendrilThigh(NERVE),
    shin: tendrilShin(NERVE),
    torso: torso(p),
    upper: lid(p),
    fore: glint(p),
    head: head(p),
    weapon: drip(p),
  };
}
