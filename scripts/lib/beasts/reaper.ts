// Reaper: pierwsza ewolucja, walczy wręcz. Lisi łeb o szpiczastych uszach i wąskim pysku,
// kępka jasnej sierści na piersi i długie, zakrzywione pazury jak kosy (szkic autora).
import { intersect, union } from '../raster.ts';
import { type BeastPalette, type PartCanvas, PUPIL, partCanvas } from './kit.ts';
import { claws, fore, shin, thigh, upper } from './limbs.ts';

export const REAPER: BeastPalette = {
  main: '#b65a2c',
  dark: '#3a160a',
  light: '#f1ddb6',
  accent: '#2b1610',
  eye: '#ffd34a',
};

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-15, -37, 23, 5);
  // Dalsze ucho.
  c.ink(
    c.poly([
      [-8, -15],
      [-9, -33],
      [0, -19],
    ]),
    p.accent,
    p.dark,
  );
  // Czaszka przechodzi w długi, zwężający się pysk.
  const skull = union(c.oval(0, -11, 9.6, 9.2), c.horn(3, -8.6, 18.5, -6.2, 6.2, 1.9));
  c.ink(union(skull, c.horn(-6.5, -6.5, -11, -1.5, 2.4, 0.3)), p.main, p.dark);
  const inside = c.inner(skull);
  // Jasny spód pyska i policzek.
  c.fill(intersect(inside, c.oval(9, -3.4, 13, 4.2)), p.light);
  c.fill(c.line(8.5, -4.3, 18, -4.9, 0.4), p.dark);
  c.fill(c.dot(19.2, -7, 1.6), p.accent);
  // Bliższe ucho z ciemnym czubkiem.
  c.ink(
    c.poly([
      [-3.5, -18],
      [0.5, -36],
      [6.5, -19],
    ]),
    p.main,
    p.dark,
  );
  c.fill(
    c.poly([
      [-0.6, -30],
      [0.5, -35],
      [2.4, -30],
    ]),
    p.accent,
  );
  c.fill(
    c.poly([
      [-0.5, -20],
      [0.8, -28],
      [4, -20],
    ]),
    p.light,
  );
  // Wąskie, skośne oko.
  c.fill(c.oval(5, -12.8, 3, 1.9), p.dark);
  c.fill(c.oval(5, -12.8, 2.4, 1.3), p.eye);
  c.fill(c.oval(5.7, -12.8, 0.55, 1.2), PUPIL);
  c.fill(c.line(1.4, -15.6, 8.6, -14.2, 0.75), p.dark);
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-29, -40, 12, 6);
  // Puszysty ogon uniesiony za plecami, z jasnym końcem.
  const tail = c.arc([-4, -3], [-25, 0], [-22, -27], 4.6, 4);
  c.ink(tail, p.main, p.dark);
  c.fill(intersect(c.inner(tail), c.dot(-22.5, -29, 7)), p.light);
  const body = c.oval(0, -11.5, 7.4, 13.3);
  c.ink(body, p.main, p.dark);
  c.fill(intersect(c.inner(body), c.oval(4.2, -8, 3.8, 9)), p.light);
  // Kępka sierści na piersi w kształcie muszki.
  c.ink(
    union(c.horn(4.5, -17.5, 10.2, -21.5, 2.3, 0.4), c.horn(4.5, -17.5, 10.2, -13.5, 2.3, 0.4)),
    p.light,
    p.dark,
  );
  c.fill(c.line(-3, -19, -3.4, -9, 0.9), '#ffffff', 0.12);
  return c;
}

export function reaperParts(): Record<string, PartCanvas> {
  const p = REAPER;
  // Ciemne „skarpety” na kończynach, jak u lisa.
  const socks: BeastPalette = { ...p, main: p.accent };
  return {
    thigh: thigh(p, 0.95),
    shin: shin(socks, 'paw', 0.9),
    torso: torso(p),
    upper: upper(p, 0.9),
    fore: fore(socks, 'paw', 0.9),
    head: head(p),
    weapon: claws({ ...p, main: p.accent }, 22, 1.9, 1.9),
  };
}
