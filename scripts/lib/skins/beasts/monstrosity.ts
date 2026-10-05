// Monstrosity: forma bazowa szczepu. Mały, okrągły, kudłaty stwór z rogami i szerokim
// zębatym uśmiechem (szkic autora: sama głowa z rogami i wyszczerzonymi zębami).
import { intersect, union } from '../../raster.ts';
import { type BeastPalette, BONE, BONE_SHADE, type PartCanvas, PUPIL, partCanvas } from '../kit.ts';
import { claws, fore, shin, thigh, upper } from '../limbs.ts';

export const MONSTROSITY: BeastPalette = {
  main: '#9a6238',
  dark: '#3a2112',
  light: '#cf9a62',
  accent: '#7a4526',
  eye: '#f2dc5a',
};

const MOUTH = '#2a100c';

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-16, -32, 17, 5);
  // Dalszy róg, schowany za głową.
  c.ink(c.arc([-3, -19], [-6, -28], [1, -30], 2.5, 0.4), BONE_SHADE, p.dark);
  const skull = c.oval(1, -10.5, 11.5, 10.5);
  const fur = union(
    skull,
    c.horn(-8, -15, -13.5, -13.5, 2.4, 0.3),
    c.horn(-9.5, -9, -14.5, -6, 2.4, 0.3),
    c.horn(-7, -3.5, -11, 1.5, 2.4, 0.3),
    c.horn(1, -1.5, -0.5, 3.5, 2.2, 0.3),
  );
  c.ink(fur, p.main, p.dark);
  const inside = c.inner(skull);
  // Jaśniejszy pysk.
  c.fill(intersect(inside, c.oval(8, -6.5, 7.5, 6.5)), p.light);
  // Paszcza od ucha do przodu pyska, z dwoma rzędami zębów.
  const mouth = intersect(inside, c.oval(8.5, -5.2, 7.2, 3.9));
  c.fill(mouth, MOUTH);
  for (const x of [3.6, 5.8, 8, 10.2]) {
    c.fill(intersect(mouth, c.box(x, -7.6, 0.85, 1.5, 0.3)), BONE);
    c.fill(intersect(mouth, c.box(x + 1.1, -2.7, 0.85, 1.4, 0.3)), BONE);
  }
  // Skośne, złe oko pod grubą brwią.
  c.fill(c.oval(6.4, -13.6, 3.1, 2.3), p.dark);
  c.fill(c.oval(6.4, -13.6, 2.5, 1.7), p.eye);
  c.fill(c.dot(7.3, -13.4, 1.05), PUPIL);
  c.fill(c.line(2.6, -17.2, 10.2, -14.6, 0.95), p.dark);
  // Bliższy róg wyrasta z czoła i wygina się do przodu.
  c.ink(c.arc([5, -19.5], [3.5, -29.5], [11.5, -29], 2.8, 0.4), BONE, p.dark);
  c.fill(c.line(-5, -17, 0.5, -19.5, 0.8), '#ffffff', 0.14);
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-15, -27, 12, 5);
  // Krótki ogon.
  c.ink(c.arc([-6, -2], [-12.5, -1], [-13, -8], 2.2, 0.5), p.main, p.dark);
  const body = c.oval(0, -11.5, 9.3, 13.5);
  const fur = union(
    body,
    c.horn(-7, -18, -11.5, -17.5, 2.2, 0.3),
    c.horn(-8.5, -11.5, -13, -9.5, 2.2, 0.3),
    c.horn(-7.5, -5, -11.5, -1.5, 2.2, 0.3),
  );
  c.ink(fur, p.main, p.dark);
  c.fill(intersect(c.inner(body), c.oval(4.5, -9, 5.2, 9.5)), p.light);
  c.fill(c.line(-4, -19, -4.5, -8, 1.1), '#ffffff', 0.12);
  return c;
}

export function monstrosityParts(): Record<string, PartCanvas> {
  const p = MONSTROSITY;
  return {
    thigh: thigh(p, 1.05),
    shin: shin(p, 'paw'),
    torso: torso(p),
    upper: upper(p),
    fore: fore(p, 'paw'),
    head: head(p),
    weapon: claws(p, 7),
  };
}
