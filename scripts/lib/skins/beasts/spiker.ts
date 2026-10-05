// Spiker: druga ewolucja Batfanga, strzelec. Przygarbiony stwór o długim ryjku, z grzbietem
// i łbem najeżonymi kolcami, którymi strzela (szkic autora: kolce na grzbiecie i przy stopach).
import { intersect, union } from '../../raster.ts';
import { type BeastPalette, BONE, type PartCanvas, PUPIL, partCanvas } from '../kit.ts';
import { claws, fore, shin, thigh, upper } from '../limbs.ts';

export const SPIKER: BeastPalette = {
  main: '#86704a',
  dark: '#2b2212',
  light: '#d6c493',
  accent: '#5b3a1c',
  eye: '#9be06f',
};

type Quill = readonly [baseX: number, baseY: number, tipX: number, tipY: number];

/** Kolce: kościane, z ciemnym czubkiem. */
function quills(c: PartCanvas, p: BeastPalette, list: readonly Quill[], radius: number): void {
  for (const [bx, by, tx, ty] of list) {
    c.ink(c.horn(bx, by, tx, ty, radius, 0.2), BONE, p.dark);
    const mx = bx + (tx - bx) * 0.68;
    const my = by + (ty - by) * 0.68;
    c.fill(c.horn(mx, my, tx, ty, radius * 0.34, 0.1), p.accent);
  }
}

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-18, -31, 21, 5);
  quills(
    c,
    p,
    [
      [-7, -9, -16.5, -13],
      [-6, -13, -14.5, -22.5],
      [-2, -16, -7, -28.5],
      [2.5, -17, 1.5, -29.5],
    ],
    1.7,
  );
  // Niski łeb z długim, szpiczastym ryjkiem.
  const skull = union(c.oval(0.5, -9.5, 9.8, 8.6), c.horn(5, -7.6, 17.6, -4.8, 5.2, 2));
  c.ink(skull, p.main, p.dark);
  const inside = c.inner(skull);
  c.fill(intersect(inside, c.oval(8.5, -2.8, 12, 3.8)), p.light);
  c.fill(c.dot(18.4, -5.4, 1.7), p.dark);
  c.fill(c.line(9, -3.4, 16.6, -3.4, 0.4), p.dark);
  // Małe ucho i okrągłe oko.
  c.ink(c.dot(-3.4, -15.4, 2.4), p.light, p.dark);
  c.fill(c.dot(5.6, -11.6, 2.5), p.dark);
  c.fill(c.dot(5.6, -11.6, 1.9), p.eye);
  c.fill(c.dot(6.1, -11.5, 0.95), PUPIL);
  // Krótsze kolce z przodu grzywy zachodzą na czoło.
  quills(
    c,
    p,
    [
      [-4, -14.5, -10.5, -17.5],
      [0.5, -16.5, -2.5, -24],
    ],
    1.4,
  );
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-27, -45, 11, 6);
  // Wachlarz długich kolców na grzbiecie.
  quills(
    c,
    p,
    [
      [-1.5, -22, -3.5, -43.5],
      [-4.5, -21, -13, -40],
      [-7, -17.5, -20.5, -32.5],
      [-8.5, -13, -25, -22],
      [-8.5, -8, -25.5, -10.5],
      [-7.5, -3.5, -22, 1],
    ],
    2,
  );
  // Garb: tułów pochylony do przodu.
  const body = union(c.oval(0, -11.5, 8.6, 13.3), c.oval(-3.2, -14.5, 7.4, 9.6));
  c.ink(body, p.main, p.dark);
  c.fill(intersect(c.inner(body), c.oval(4.6, -8.5, 4.6, 10)), p.light);
  // Drugi, krótszy rząd kolców leży na boku.
  quills(
    c,
    p,
    [
      [-3.5, -19, -9.5, -28.5],
      [-5.5, -14.5, -14.5, -19.5],
      [-5.5, -9.5, -15, -9],
    ],
    1.5,
  );
  return c;
}

export function spikerParts(): Record<string, PartCanvas> {
  const p = SPIKER;
  return {
    thigh: thigh(p, 1.1),
    shin: shin(p, 'paw', 1.05),
    torso: torso(p),
    upper: upper(p, 1.05),
    fore: fore(p, 'paw', 1.05),
    head: head(p),
    weapon: claws(p, 7),
  };
}
