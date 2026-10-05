// Tuskovator: druga ewolucja Reapera, najsilniejszy odrzut w szczepie. Masywny zwierz o długim,
// płaskim pysku z zębami, kudłatej grzywie i ogromnym kle wygiętym jak łyżka koparki; na końcu
// ogona ciemny chwost (szkic autora).
import { intersect, union } from '../raster.ts';
import { type BeastPalette, BONE, BONE_SHADE, type PartCanvas, PUPIL, partCanvas } from './kit.ts';
import { claws, fore, shin, thigh, upper } from './limbs.ts';

export const TUSKOVATOR: BeastPalette = {
  main: '#5e3d26',
  dark: '#1f1109',
  light: '#93694a',
  accent: '#cfa268',
  eye: '#ffb62e',
};

const MOUTH = '#1a0a08';

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-20, -28, 42, 14);
  // Grzywa: kłęby jasnej sierści wokół karku.
  c.ink(
    union(
      c.dot(-3, -21, 5),
      c.dot(-9.5, -17, 5.4),
      c.dot(-13, -10, 5.6),
      c.dot(-12.5, -2, 5.6),
      c.dot(-8, 4.5, 5.2),
      c.dot(-1, 6, 4.4),
    ),
    p.accent,
    p.dark,
  );
  // Dolna szczęka wystaje przed pysk; z niej wyrasta kieł.
  c.ink(c.box(13, -0.6, 12.5, 2.9, 2.4), p.main, p.dark);
  const skull = union(c.oval(0, -9.5, 9.4, 9.2), c.box(13.5, -7.6, 12.6, 5.4, 4.4));
  c.ink(skull, p.main, p.dark);
  const inside = c.inner(skull);
  c.fill(intersect(inside, c.box(15, -10.6, 12, 2, 1.6)), p.light);
  // Paszcza wzdłuż całego pyska i zęby jak piła.
  c.fill(c.line(5, -2.9, 25, -3.2, 0.75), MOUTH);
  for (let x = 6.2; x < 23; x += 3.1) {
    c.ink(
      c.poly([
        [x, -3.2],
        [x + 1.3, 0.3],
        [x + 2.6, -3.2],
      ]),
      BONE,
      p.dark,
    );
  }
  c.fill(c.dot(23.6, -10.4, 1), p.dark);
  // Kieł: od przodu żuchwy łukiem w górę, ponad pysk.
  const tusk = c.arc([19.5, 0.8], [43, 13], [36.5, -17], 4.3, 0.6);
  c.ink(tusk, BONE, p.dark);
  c.fill(intersect(c.inner(tusk), c.arc([22, 3.6], [41, 11.5], [36.4, -11], 1.1, 0.2)), BONE_SHADE);
  // Ucho i romboidalne oko.
  c.ink(
    c.poly([
      [-6, -15],
      [-4.5, -24.5],
      [1, -17],
    ]),
    p.main,
    p.dark,
  );
  const eye = c.poly([
    [0.6, -12.6],
    [3.9, -15.2],
    [7.2, -12.6],
    [3.9, -10],
  ]);
  c.ink(eye, p.eye, p.dark);
  c.fill(c.oval(4.2, -12.6, 0.7, 1.5), PUPIL);
  c.fill(c.line(0, -16.6, 8, -15.4, 0.9), p.dark);
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-27, -32, 14, 12);
  // Ogon z ciemnym chwostem.
  c.ink(c.arc([-8, -4], [-20, -6], [-20.5, 4], 1.7, 1.1), p.main, p.dark);
  c.ink(union(c.dot(-20.6, 6, 3.4), c.horn(-20.6, 6, -22.5, 11, 2.2, 0.3)), p.dark, p.dark);
  const body = c.oval(0, -12, 11.6, 14.6);
  c.ink(body, p.main, p.dark);
  c.fill(intersect(c.inner(body), c.oval(6, -8, 5.6, 10)), p.light);
  // Grzywa schodzi z karku na grzbiet.
  c.ink(
    union(c.dot(-1.5, -25, 4.6), c.dot(-7.5, -22, 4.8), c.dot(-11, -15.5, 4.6)),
    p.accent,
    p.dark,
  );
  c.fill(c.line(-5, -13, -5.6, -3, 1.2), '#ffffff', 0.1);
  return c;
}

export function tuskovatorParts(): Record<string, PartCanvas> {
  const p = TUSKOVATOR;
  return {
    thigh: thigh(p, 1.4),
    shin: shin(p, 'hoof', 1.3),
    torso: torso(p),
    upper: upper(p, 1.3),
    fore: fore(p, 'hoof', 1.3),
    head: head(p),
    weapon: claws(p, 3),
  };
}
