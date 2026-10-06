// Reaper: pierwsza ewolucja, walczy wręcz. Wyliniały lis o nadszarpniętym uchu i bliźnie przez
// oko, z wąskim pyskiem pełnym zębów, kępką brudnej sierści na piersi i długimi pazurami jak kosy
// (szkic autora).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE, BONE_SHADE, MAW, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const REAPER: Palette = {
  main: '#7a3e20',
  shade: '#452010',
  light: '#b09a76',
  dark: '#150a06',
  accent: '#21120c',
  glow: '#e8c640',
};

function head(p: Palette): PartCanvas {
  const c = partCanvas(-16, -39, 25, 7, 1);
  const tip = { main: p.accent, shade: p.dark, dark: p.dark, light: p.shade };
  // Dalsze ucho.
  c.form(
    c.poly([
      [-8, -15],
      [-9.5, -34],
      [0, -19],
    ]),
    tip,
  );
  // Czaszka przechodzi w długi, zwężający się pysk.
  const skull = union(c.oval(0, -11, 9.4, 9), c.horn(3, -8.8, 19.5, -6.4, 6, 1.8));
  const inside = c.form(
    union(skull, c.horn(-6.5, -6.5, -12, -0.5, 2.5, 0.3), c.horn(-8, -12, -13.5, -10, 2.2, 0.3)),
    p,
  );
  // Brudny, jasny spód pyska i policzek.
  c.patches(intersect(inside, c.oval(9, -3.2, 13, 4)), p.light, 0.62, 3.4, 0.95);
  // Wyszczerzone zęby wzdłuż pyska.
  const snarl = intersect(inside, c.horn(7.5, -4.6, 18.6, -5, 1.5, 0.8));
  c.fill(snarl, MAW);
  for (const x of [8.6, 10.6, 12.6, 14.6, 16.6]) {
    c.fill(intersect(snarl, c.horn(x, -6.2, x + 0.2, -3.6, 0.7, 0.12)), BONE);
  }
  c.fill(c.dot(20.2, -7.2, 1.7), p.accent);
  // Bliższe ucho: nadszarpnięte, z ciemnym czubkiem.
  c.form(
    subtract(
      c.poly([
        [-3.5, -18],
        [0.5, -37.5],
        [6.8, -19],
      ]),
      c.dot(5.6, -28.5, 1.9),
    ),
    p,
  );
  c.fill(
    c.poly([
      [-0.9, -30],
      [0.5, -36.5],
      [2.6, -30],
    ]),
    p.accent,
  );
  // Wąskie, skośne oko; blizna biegnie przez łuk brwiowy na policzek.
  c.eye(5, -12.8, 2.1, p, 1.3);
  c.fill(c.horn(0.8, -16, 9, -14.2, 1.2, 0.6), p.dark);
  c.scar([3, -18.5], [8.5, -8.5], p.dark, 3);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-31, -42, 13, 7, 2);
  // Wyleniały ogon uniesiony za plecami, z jaśniejszym, postrzępionym końcem.
  const tail = c.arc([-4, -3], [-26, 0.5], [-23, -28], 4.4, 3.4);
  const tailInside = c.form(
    union(
      tail,
      c.dot(-23, -29.5, 4.6),
      c.horn(-23, -30, -25.5, -37, 2.6, 0.3),
      c.horn(-22, -30, -20, -36, 2.2, 0.3),
      c.horn(-25, -29, -29, -33, 2, 0.3),
    ),
    p,
  );
  c.patches(intersect(tailInside, c.dot(-22.5, -30, 8)), p.light, 0.6, 3, 0.9);
  c.patches(tailInside, p.shade, 0.3, 2.6, 0.9);
  const body = c.oval(0, -11.5, 7.2, 13.2);
  const inside = c.form(body, p);
  c.patches(intersect(inside, c.oval(4.2, -8, 3.6, 9)), p.light, 0.55, 3, 0.9);
  for (const y of [-13, -9.5, -6]) {
    c.fill(intersect(inside, c.arc([0.6, y], [3.8, y + 1.8], [6.6, y - 0.2], 0.3, 0.3)), p.shade);
  }
  // Skołtuniona kępka sierści na piersi.
  c.form(
    union(
      c.horn(4.5, -17.5, 11, -22, 2.3, 0.3),
      c.horn(4.5, -17.5, 11.4, -15.5, 2, 0.3),
      c.horn(4.5, -17.5, 9.6, -11.5, 2.2, 0.3),
    ),
    { main: p.light, shade: BONE_SHADE, dark: p.dark, light: BONE },
    { shadow: 0.6 },
  );
  return c.finish();
}

export function reaperParts(): Record<string, PartCanvas> {
  const p = REAPER;
  // Ciemne „skarpety” na kończynach, jak u lisa.
  const socks: Palette = { ...p, main: p.accent, shade: p.dark, light: p.shade };
  return {
    thigh: fleshThigh(p, 0.92),
    shin: fleshShin(socks, 'paw', 0.88),
    torso: torso(p),
    upper: fleshUpper(p, 0.88),
    fore: fleshFore(socks, 'paw', 0.88),
    head: head(p),
    weapon: claws(socks, 23, 1.9, 1.9),
  };
}
