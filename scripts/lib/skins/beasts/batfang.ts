// Batfang: pierwsza ewolucja, strzelec. Kocio-nietoperzy łeb ze sterczącymi uszami i dwoma
// długimi kłami, na grzbiecie błoniaste skrzydło z pazurami na końcach palców (szkic autora).
import { intersect, subtract, union } from '../../raster.ts';
import { type BeastPalette, BONE, type PartCanvas, PUPIL, partCanvas } from '../kit.ts';
import { claws, fore, shin, thigh, upper } from '../limbs.ts';

export const BATFANG: BeastPalette = {
  main: '#6f4b3a',
  dark: '#26150f',
  light: '#a87a5e',
  accent: '#9c4a55',
  eye: '#ffb03a',
};

const MOUTH = '#1d0b0a';

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-17, -38, 19, 6);
  // Dalsze ucho.
  c.ink(
    c.poly([
      [-8, -14],
      [-11, -33],
      [0, -18],
    ]),
    p.accent,
    p.dark,
  );
  const skull = union(c.oval(0.5, -10.5, 10.5, 9.5), c.oval(9.5, -7.5, 5.2, 4.6));
  c.ink(union(skull, c.horn(-7, -6, -11.5, -1.5, 2.3, 0.3)), p.main, p.dark);
  const inside = c.inner(skull);
  c.fill(intersect(inside, c.oval(9, -5.5, 7, 4.5)), p.light);
  // Bliższe ucho z jasnym wnętrzem.
  const ear = c.poly([
    [-2, -17],
    [1, -37],
    [9, -18],
  ]);
  c.ink(ear, p.main, p.dark);
  c.fill(
    c.poly([
      [1, -19.5],
      [1.8, -31],
      [6, -19.5],
    ]),
    p.accent,
  );
  // Nos i pysk; dwa kły wystają poniżej szczęki.
  c.fill(c.dot(14, -9.4, 1.4), p.dark);
  c.fill(intersect(inside, c.oval(8.6, -4.4, 5.6, 1.9)), MOUTH);
  c.ink(c.horn(6.2, -5, 5.8, 2.6, 1.35, 0.2), BONE, p.dark);
  c.ink(c.horn(10.6, -5, 10.9, 1.6, 1.25, 0.2), BONE, p.dark);
  // Skośne, świecące oko.
  c.fill(c.oval(5.2, -13.2, 3.2, 2.2), p.dark);
  c.fill(c.oval(5.2, -13.2, 2.6, 1.6), p.eye);
  c.fill(c.oval(5.9, -13.2, 0.6, 1.5), PUPIL);
  c.fill(c.line(1.6, -16.4, 9, -14.6, 0.8), p.dark);
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-34, -51, 11, 5);
  // Skrzydło wyrasta z łopatki; błona rozpięta między trzema palcami, z wciętą krawędzią.
  const root = [-3, -19] as const;
  const tips = [
    [-13, -46],
    [-27, -39],
    [-31, -24],
  ] as const;
  const membrane = subtract(
    c.poly([root, tips[0], tips[1], tips[2], [-7, -6]]),
    union(c.dot(-21.5, -46.5, 5.2), c.dot(-32.5, -32, 5.4), c.dot(-22, -11.5, 9.5)),
  );
  c.ink(membrane, p.accent, p.dark);
  for (const [x, y] of tips) {
    c.fill(c.line(root[0], root[1], x, y, 0.75), p.dark);
    // Pazur na końcu palca.
    c.ink(c.horn(x, y, x - 1.2, y - 3, 1, 0.2), BONE, p.dark);
  }
  // Chudy ogon.
  c.ink(c.arc([-5, -2], [-11, 0], [-13, -6], 1.5, 0.3), p.main, p.dark);
  const body = c.oval(0, -11.5, 7.6, 13.2);
  c.ink(body, p.main, p.dark);
  c.fill(intersect(c.inner(body), c.oval(4, -10, 4.2, 9.5)), p.light);
  c.fill(c.line(-3.2, -19, -3.6, -9, 0.9), '#ffffff', 0.12);
  return c;
}

export function batfangParts(): Record<string, PartCanvas> {
  const p = BATFANG;
  return {
    thigh: thigh(p, 0.9),
    shin: shin(p, 'paw', 0.9),
    torso: torso(p),
    upper: upper(p, 0.85),
    fore: fore(p, 'paw', 0.85),
    head: head(p),
    weapon: claws(p, 6),
  };
}
