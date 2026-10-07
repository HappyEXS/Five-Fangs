// Tuskovator: druga ewolucja Reapera, najsilniejszy odrzut w szczepie. Taran z mięsa i kości:
// beczkowaty korpus w fałdach grubej skóry, na karku szczecina jak grzebień, a łeb to długa,
// ciężka paszcza z zazębionymi kłami na całej długości, kościana płyta na czole, wąskie
// czerwone oko i ogromny, spękany kieł wygięty jak hak, spięty żelazną obręczą (szkic autora:
// długi pysk z zębami, wielki półksiężyc kła z przodu, romb oka, grzywa z tyłu łba).
import { intersect, union } from '../../raster.ts';
import { BONE, BONE_SHADE, MAW, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper, hooks } from '../limbs-beasts.ts';
import { beast, crack, HIDE, INK, OLD_BONE, strands, teeth, VOID } from './palette.ts';

/** Szczecina grzywy: prawie czarna. */
const BRISTLE = { main: '#211812', shade: '#0f0a07', light: '#3d2e22', dark: INK };

export const TUSKOVATOR: Palette = beast(HIDE, BRISTLE.main, '#ff4a30');

function head(p: Palette): PartCanvas {
  const c = partCanvas(-25, -32, 47, 20, 1);
  // Grzywa: sztywna szczecina sterczy z potylicy i karku.
  const mane = c.poly([
    [-6, 6],
    [-12, 0],
    [-19.6, 3.6],
    [-16, -6],
    [-22.6, -11],
    [-14.6, -14.6],
    [-18.6, -24],
    [-9.6, -20.4],
    [-7.6, -29],
    [-2, -20.6],
    [3.6, -27],
    [5, -17],
    [7, -6],
    [2, 5],
  ]);
  const maneInside = c.form(mane, BRISTLE, { rag: 0.7 });
  for (const [ax, ay, bx, by] of [
    [-3, -8, -17, -9.6],
    [-2, -12, -14, -21],
    [0, -13, -6.6, -25],
    [-3, -3, -15.6, 1.6],
  ] as const) {
    c.fill(intersect(maneInside, c.line(ax, ay, bx, by, 0.32)), BRISTLE.light, 0.7);
  }
  // Dalszy kieł: w cieniu.
  const farTusk = c.arc([21, 0], [22.6, 19], [35.6, -1], 3.2, 0.35);
  c.ink(farTusk, BONE_SHADE, INK);
  // Bliższy kieł: wychodzi spod wargi, opada i wraca hakiem w górę przed nozdrza.
  const tusk = c.arc([24.6, -1], [26.6, 26], [43, -7], 4.3, 0.4);
  c.ink(tusk, BONE, INK);
  crack(c, tusk, [
    [31, 12.6],
    [33, 10.6],
    [33.4, 12.4],
    [35.6, 9.6],
  ]);
  // Żelazna obręcz na kle.
  c.fill(intersect(tusk, c.line(22, 9.4, 32, 6.6, 1.5)), '#14181c');
  c.fill(intersect(tusk, c.line(22, 9.1, 32, 6.3, 0.75)), '#5c636a');
  c.fill(c.dot(27, 7.9, 0.5), '#14181c');
  // Żuchwa: ciężka belka.
  const jaw = c.poly([
    [0, -3.6],
    [10, -1.4],
    [24, -1.6],
    [32, -2.6],
    [33.4, 0.4],
    [30.6, 4],
    [12, 5.6],
    [1, 3.6],
  ]);
  const jawInside = c.form(jaw, { ...p, main: p.shade, shade: INK, light: p.main }, { rag: 0.4 });
  c.patches(jawInside, p.main, 0.2, 2.4, 0.7);
  // Czaszka z długim, płaskim pyskiem.
  const skull = c.poly([
    [-3.6, -13],
    [3, -18],
    [11, -17],
    [20, -13.4],
    [31, -12],
    [34.6, -8.6],
    [34, -4.4],
    [22, -3],
    [10, -2.6],
    [2, -3.4],
    [-3.6, -7],
  ]);
  const inside = c.form(skull, p, { rag: 0.4 });
  c.patches(inside, p.light, 0.16, 2.6, 0.6);
  c.patches(inside, p.shade, 0.16, 2.4, 0.7);
  // Fałdy skóry na pysku.
  for (const x of [17, 21, 25]) {
    c.fill(intersect(inside, c.arc([x, -13.6], [x + 1.6, -9], [x - 0.4, -4.6], 0.3, 0.3)), p.shade);
  }
  c.fill(c.dot(31.6, -9.6, 0.9), VOID);
  // Paszcza: ciemna szczelina na całą długość pyska, kły zazębione jak pułapka.
  c.fill(c.line(7, -2.7, 33, -3.7, 1.9), MAW);
  teeth(c, [9, -4.6], [31.6, -5.6], 7, 4.2, BONE, 1.45);
  teeth(c, [11, -0.6], [29.8, -1.6], 6, -4, BONE_SHADE, 1.4);
  // Romb oka: ciemność i wąska czerwona źrenica.
  c.fill(
    c.poly([
      [8.6, -9.6],
      [12.6, -12.4],
      [16.6, -9.4],
      [12.4, -7],
    ]),
    VOID,
  );
  c.fill(c.oval(12.6, -9.6, 3.6, 2.6), p.glow, 0.16);
  c.fill(
    c.poly([
      [10, -9.6],
      [12.6, -10.8],
      [15.2, -9.5],
      [12.5, -8.5],
    ]),
    p.glow,
  );
  c.fill(c.line(12.6, -10.6, 12.6, -8.6, 0.3), VOID);
  // Kościana płyta na czole, spękana, z guzem.
  const plate = c.poly([
    [-1.6, -14.6],
    [6, -20.6],
    [14.6, -16.6],
    [12.4, -12.6],
    [3, -12],
  ]);
  const bone = c.form(plate, OLD_BONE, { rag: 0.25, rim: 0.5 });
  c.patches(bone, BONE_SHADE, 0.24, 2.2, 0.7);
  crack(c, bone, [
    [5.6, -19.6],
    [7, -16.6],
    [5.6, -14.4],
    [7.4, -12.6],
  ]);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-29, -37, 16, 12, 2);
  // Cienki ogon z chwostem.
  c.form(
    union(
      c.arc([-12, -3], [-23, -5], [-22, 5], 1.5, 0.9),
      strands(c, [
        [-22, 5, -2.6, 5, 1.8],
        [-22, 5, 0.6, 6, 1.8],
        [-22, 5, 2.6, 4, 1.6],
      ]),
    ),
    BRISTLE,
  );
  // Grzebień szczeciny na karku i grzbiecie.
  c.form(
    strands(c, [
      [-3, -24, -3.6, -9, 2.6],
      [-7, -23, -6.6, -8.6, 2.6],
      [-10.6, -19.6, -8.4, -6, 2.6],
      [-13.4, -14, -8.6, -3, 2.4],
      [-15, -7, -7.6, -0.6, 2.2],
    ]),
    BRISTLE,
  );
  // Beczka korpusu.
  const body = c.poly([
    [-13, 4.6],
    [-16.4, -6],
    [-14.4, -17],
    [-8, -24.6],
    [0, -26],
    [7, -22],
    [10.6, -14],
    [10.4, -5],
    [7.4, 4],
    [-2, 6.6],
  ]);
  const inside = c.form(body, p, { rag: 0.45 });
  // Fałdy grubej skóry jak płyty pancerza.
  for (const [ax, ay, bx, by, cx, cy] of [
    [-14.6, -13, -3, -8, 10.4, -13.6],
    [-16, -3, -4, 1, 9.6, -2],
    [-3, -25.6, -6, -17, -1.6, -9.4],
  ] as const) {
    c.fill(intersect(inside, c.arc([ax, ay], [bx, by], [cx, cy], 0.4, 0.4)), p.shade);
  }
  c.patches(inside, p.light, 0.16, 2.8, 0.6);
  c.patches(inside, p.shade, 0.18, 2.6, 0.8);
  c.scar([1.6, -5], [7.6, -10], INK, 3);
  c.scar([-10, -9], [-5.6, -4.6], INK, 2);
  return c.finish();
}

export function tuskovatorParts(): Record<string, PartCanvas> {
  const p = TUSKOVATOR;
  return {
    thigh: beastThigh(p, 1.36),
    shin: beastShin(p, 'hoof', 1.3),
    torso: torso(p),
    upper: beastUpper(p, 1.3),
    fore: beastFore(p, 'hoof', 1.3),
    head: head(p),
    weapon: hooks(p, 3.5, 1),
  };
}
