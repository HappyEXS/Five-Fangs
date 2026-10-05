// Spiker: druga ewolucja Batfanga, strzelec. Przygarbiony stwór o długim ryjku, z grzbietem
// i łbem najeżonymi kolcami, którymi strzela; część kolców jest połamana (szkic autora: kolce
// na grzbiecie i przy stopach).
import { intersect, union } from '../../raster.ts';
import { BONE, BONE_SHADE, MAW, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const SPIKER: Palette = {
  main: '#5a5036',
  shade: '#342d1d',
  light: '#8c825e',
  dark: '#13100a',
  accent: '#3a2815',
  glow: '#a8cc5c',
};

/** Kolec: [nasada x, y, czubek x, y]; `broken` ucina go w dwóch trzecich długości. */
type Quill = readonly [baseX: number, baseY: number, tipX: number, tipY: number, broken?: boolean];

function quills(c: PartCanvas, p: Palette, list: readonly Quill[], radius: number): void {
  for (const [bx, by, tx, ty, broken = false] of list) {
    if (broken) {
      const mx = bx + (tx - bx) * 0.55;
      const my = by + (ty - by) * 0.55;
      c.ink(c.horn(bx, by, mx, my, radius, radius * 0.7), BONE_SHADE, p.dark);
      continue;
    }
    const shape = c.horn(bx, by, tx, ty, radius, 0.2);
    c.ink(shape, BONE, p.dark);
    // Ciemny, brudny czubek i nasada.
    const mx = bx + (tx - bx) * 0.66;
    const my = by + (ty - by) * 0.66;
    c.fill(c.horn(mx, my, tx, ty, radius * 0.34, 0.1), p.accent);
    c.fill(intersect(shape, c.dot(bx, by, radius * 2.2)), BONE_SHADE, 0.8);
  }
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-20, -33, 23, 7, 1);
  quills(
    c,
    p,
    [
      [-7, -9, -17.5, -13.5],
      [-6, -13, -15, -23.5, true],
      [-2, -16, -7.5, -30],
      [2.5, -17, 1.5, -31],
    ],
    1.8,
  );
  // Niski łeb z długim, szpiczastym ryjkiem.
  const skull = union(c.oval(0.5, -9.5, 9.6, 8.4), c.horn(5, -7.6, 18.6, -4.6, 5, 1.9));
  const inside = c.form(union(skull, c.horn(-6, -4, -10.5, 1, 2.2, 0.3)), p);
  c.patches(intersect(inside, c.oval(8.5, -2.6, 12, 3.6)), p.light, 0.55, 3, 0.9);
  c.fill(c.dot(19.4, -5.2, 1.8), p.dark);
  // Uchylony pysk z drobnymi zębami.
  const mouth = intersect(inside, c.horn(8.5, -3, 17.4, -3.3, 1.3, 0.7));
  c.fill(mouth, MAW);
  for (const x of [9.6, 11.8, 14, 16]) {
    c.fill(intersect(mouth, c.horn(x, -4.4, x + 0.2, -2.2, 0.6, 0.1)), BONE);
  }
  // Postrzępione ucho i małe, głęboko osadzone oko.
  c.form(
    c.poly([
      [-5.5, -13.5],
      [-4.5, -19.5],
      [-0.5, -15],
    ]),
    p,
    { shadow: 0.5 },
  );
  c.eye(5.4, -11.6, 2, p, 0.8);
  c.fill(c.horn(1.6, -14.8, 9, -13.6, 1.1, 0.6), p.dark);
  // Krótsze kolce z przodu grzywy zachodzą na czoło.
  quills(
    c,
    p,
    [
      [-4, -14.5, -11, -18, true],
      [0.5, -16.5, -2.5, -25],
    ],
    1.5,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-29, -47, 12, 7, 2);
  // Wachlarz długich kolców na grzbiecie; dwa połamane.
  quills(
    c,
    p,
    [
      [-1.5, -22, -3.5, -45],
      [-4.5, -21, -13.5, -41, true],
      [-7, -17.5, -21.5, -33.5],
      [-8.5, -13, -26.5, -22.5],
      [-8.5, -8, -27, -10.5, true],
      [-7.5, -3.5, -23, 1.5],
    ],
    2.1,
  );
  // Garb: tułów pochylony do przodu.
  const body = union(c.oval(0, -11.5, 8.4, 13.2), c.oval(-3.2, -14.5, 7.4, 9.6));
  const inside = c.form(body, p);
  c.patches(intersect(inside, c.oval(4.6, -8.5, 4.4, 10)), p.light, 0.5, 3, 0.85);
  for (const y of [-13, -9.5, -6]) {
    c.fill(intersect(inside, c.arc([1.4, y], [4.6, y + 1.8], [7.6, y - 0.2], 0.3, 0.3)), p.shade);
  }
  // Drugi, krótszy rząd kolców leży na boku.
  quills(
    c,
    p,
    [
      [-3.5, -19, -10, -29.5],
      [-5.5, -14.5, -15, -20],
      [-5.5, -9.5, -15.5, -9, true],
    ],
    1.6,
  );
  return c.finish();
}

export function spikerParts(): Record<string, PartCanvas> {
  const p = SPIKER;
  return {
    thigh: fleshThigh(p, 1.1),
    shin: fleshShin(p, 'paw', 1.05),
    torso: torso(p),
    upper: fleshUpper(p, 1.05),
    fore: fleshFore(p, 'paw', 1.05),
    head: head(p),
    weapon: claws(p, 7.5),
  };
}
