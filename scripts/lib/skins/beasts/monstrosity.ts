// Monstrosity: forma bazowa szczepu Beasts. Kopiec skołtunionej sierści na krótkich łapach:
// spod kudłów nie widać pyska, tylko dwie skośne szpary oczu i szeroki wyszczerz kwadratowych
// zębów, a nad nimi dwa wielkie rogi (szkic autora: kudłaty kopiec z rogami, złe oczy, zęby).
import { intersect, union } from '../../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper, hooks } from '../limbs-beasts.ts';
import { beast, crack, grime, INK, PELT, slitEye, strands, VOID } from './palette.ts';

export const MONSTROSITY: Palette = beast(PELT, '#241810', '#f2c838');

function head(p: Palette): PartCanvas {
  const c = partCanvas(-23, -43, 26, 16, 1);
  // Dalszy róg: w cieniu.
  const farHorn = c.arc([-7, -19], [-17.5, -30], [-6.5, -39.5], 3.6, 0.35);
  c.ink(farHorn, BONE_SHADE, INK);
  grime(c, farHorn, [-7, -19], 7, '#4f4733');
  // Kopiec kudłów: kopuła, z której pasma zwisają aż na ramiona i pierś.
  const mound = c.poly([
    [-14.6, 4],
    [-16.4, -6],
    [-13.6, -16],
    [-7, -23],
    [2, -25.4],
    [11, -22.6],
    [16.6, -15],
    [18.6, -5],
    [17.6, 3],
    [15.6, 10.6],
    [13, 3.6],
    [10.4, 12],
    [7.6, 4],
    [4.8, 12.6],
    [2, 4.4],
    [-1.2, 13],
    [-4.2, 4.4],
    [-7.6, 12],
    [-10.4, 4],
    [-13.2, 10],
  ]);
  const inside = c.form(
    union(
      mound,
      strands(c, [
        [-14.2, -13, -5.4, 4.5, 2.3],
        [-15.4, -4, -4.8, 6.5, 2.3],
        [-10, -20, -5.8, 1.5, 2.1],
      ]),
    ),
    p,
    { rag: 0.8 },
  );
  // Pasma sierści: ciemne smugi opadające z czubka.
  for (const [x, top, bottom, lean] of [
    [-10, -17, 2, -2.6],
    [-5, -21, -3, -1.8],
    [-2.4, -9, 7, -0.8],
    [10.4, 4.4, 9.4, 0.2],
    [4.8, 4.6, 9, -0.2],
    [-7.6, 4.6, 9, -0.4],
  ] as const) {
    c.fill(intersect(inside, c.line(x, top, x + lean, bottom, 0.34)), p.shade);
  }
  c.patches(inside, p.light, 0.14, 2.4, 0.5);
  // Ciemność w miejscu pyska.
  const face = intersect(
    inside,
    c.ragged(
      c.poly([
        [0.6, -16],
        [8.6, -19.6],
        [16, -14.6],
        [18.6, -5],
        [16.6, 2.8],
        [4.6, 3.2],
        [-0.8, -4],
      ]),
      0.9,
      3,
    ),
  );
  c.fill(face, VOID);
  // Skośne, złe oczy; dalsze węższe.
  slitEye(c, 5.2, -11.6, 3.1, 1.4, 1.5, p.glow);
  slitEye(c, 13.4, -11.8, 2.5, 1.3, -1.4, p.glow);
  // Wyszczerz: rząd wielkich, nierównych zębów od ucha do ucha.
  for (const [x, y, w, h, far] of [
    [2.6, -3.6, 1.05, 1.7, true],
    [5.1, -2.6, 1.25, 2.3, false],
    [8, -2.1, 1.3, 2.6, false],
    [10.9, -2.2, 1.3, 2.4, false],
    [13.7, -2.7, 1.2, 2.1, false],
    [16, -3.7, 0.85, 1.5, true],
  ] as const) {
    c.ink(c.box(x, y, w, h, 0.3), far ? BONE_SHADE : BONE, INK);
  }
  // Bliższy róg: wyrasta z czoła, wygina się na zewnątrz i wraca czubkiem nad głowę.
  const horn = c.arc([9.6, -21.6], [20.6, -32], [9.6, -40.6], 3.8, 0.35);
  c.ink(horn, BONE, INK);
  grime(c, horn, [9.6, -21.6], 7.5);
  crack(c, horn, [
    [12.8, -25.6],
    [15, -27.4],
    [14, -29.6],
    [15.8, -31.4],
  ]);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-19, -28, 15, 15, 2);
  // Beczkowaty korpus; sierść zwisa z niego strzępami poniżej bioder.
  const body = c.poly([
    [-10, -20],
    [-3, -24],
    [5, -22],
    [9.6, -14],
    [9.6, -4],
    [8.6, 4],
    [6.4, 10.6],
    [3.8, 4.4],
    [0.8, 11.6],
    [-2, 4.6],
    [-5.2, 11],
    [-8, 4.4],
    [-11, 9.4],
    [-13, -3],
    [-13.4, -13],
  ]);
  const inside = c.form(
    union(
      body,
      strands(c, [
        [-12.2, -15, -4.4, 5, 2.2],
        [-12.4, -7, -4, 6, 2.2],
      ]),
    ),
    p,
    { rag: 0.8 },
  );
  for (const [x, top, bottom] of [
    [-7, -14, 5],
    [-2, -10, 6],
    [3.8, -8, 5],
  ] as const) {
    c.fill(intersect(inside, c.line(x, top, x - 0.8, bottom, 0.34)), p.shade);
  }
  c.patches(inside, p.light, 0.14, 2.4, 0.5);
  return c.finish();
}

export function monstrosityParts(): Record<string, PartCanvas> {
  const p = MONSTROSITY;
  // Łapy ciemniejsze od kudłów: gołe, żylaste.
  const limb: Palette = { ...p, main: '#2c1f15', shade: '#150e09', light: '#4a3626' };
  return {
    thigh: beastThigh(p, 1.05),
    shin: beastShin(limb, 'paw', 1),
    torso: torso(p),
    upper: beastUpper(limb, 0.86, false),
    fore: beastFore(limb, 'paw', 0.9),
    head: head(p),
    weapon: hooks(limb, 8.5),
  };
}
