// Tuskovator: druga ewolucja Reapera, najsilniejszy odrzut w szczepie. Masywny zwierz o długim,
// płaskim pysku z wyszczerbionymi zębami, skołtunionej grzywie i ogromnym, spękanym kle wygiętym
// jak łyżka koparki, spiętym żelazną obręczą; na końcu ogona ciemny chwost (szkic autora).
import { intersect, union } from '../../raster.ts';
import {
  BONE,
  BONE_SHADE,
  MAW,
  type Palette,
  type PartCanvas,
  partCanvas,
  RAG_HARD,
} from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const TUSKOVATOR: Palette = {
  main: '#42291a',
  shade: '#22140b',
  light: '#674933',
  dark: '#0f0804',
  accent: '#7d6844',
  glow: '#e8a02a',
};

/** Grzywa: brudna, w dwóch odcieniach. */
const MANE = { main: '#7d6844', shade: '#4a3c25', dark: '#0f0804', light: '#9c8762' };
const IRON = { main: '#5e656c', shade: '#343a40', dark: '#0f0804', light: '#98a1a9' };

function head(p: Palette): PartCanvas {
  const c = partCanvas(-22, -30, 44, 16, 1);
  // Grzywa: skołtunione kłęby wokół karku, z wystającymi strąkami.
  c.form(
    union(
      c.dot(-3, -21, 5),
      c.dot(-9.5, -17, 5.4),
      c.dot(-13, -10, 5.6),
      c.dot(-12.5, -2, 5.6),
      c.dot(-8, 4.5, 5.2),
      c.dot(-1, 6, 4.4),
      c.horn(-12, -14, -19, -17, 2.2, 0.3),
      c.horn(-15, -4, -20.5, -1, 2.2, 0.3),
      c.horn(-9, 7, -13, 12.5, 2.2, 0.3),
      c.horn(-1, 8, 0, 13.5, 2, 0.3),
    ),
    MANE,
  );
  // Dolna szczęka wystaje przed pysk; z niej wyrasta kieł.
  c.form(c.box(13, -0.6, 12.5, 2.9, 2.4), p, { rag: 0.4 });
  const skull = union(c.oval(0, -9.5, 9.4, 9.2), c.box(13.5, -7.6, 12.6, 5.4, 4.4));
  const inside = c.form(skull, p, { rag: 0.45 });
  c.patches(intersect(inside, c.box(15, -10.4, 12, 2.2, 1.6)), p.light, 0.55, 3, 0.85);
  // Paszcza wzdłuż całego pyska; zęby wyszczerbione, kilku brakuje.
  c.fill(c.line(5, -2.9, 25, -3.2, 0.85), MAW);
  for (const [x, depth] of [
    [6.2, 3.4],
    [9.3, 2.2],
    [15.5, 3.6],
    [18.6, 1.6],
    [21.7, 3.2],
  ] as const) {
    c.ink(
      c.poly([
        [x, -3.2],
        [x + 1.3, -3.2 + depth],
        [x + 2.6, -3.2],
      ]),
      depth < 2.5 ? BONE_SHADE : BONE,
      p.dark,
    );
  }
  c.fill(c.dot(23.6, -10.4, 1.1), p.dark);
  c.scar([14, -12.5], [20.5, -8], p.dark, 3);
  // Kieł: od przodu żuchwy łukiem w górę, ponad pysk; spękany i spięty obręczą.
  const tusk = c.arc([19.5, 0.8], [43, 13], [36.5, -17], 4.3, 0.6);
  const tuskInside = c.form(
    tusk,
    { main: BONE, shade: BONE_SHADE, dark: p.dark, light: BONE },
    { rag: RAG_HARD },
  );
  c.patches(tuskInside, BONE_SHADE, 0.3, 2.4, 0.8);
  c.fill(
    c.path(
      [
        [36.4, -2],
        [37.6, -5],
        [36.6, -8],
        [37.8, -11.5],
      ],
      0.25,
    ),
    p.dark,
  );
  c.form(c.line(30.6, 1.4, 31.6, 8.2, 1.4), IRON, { rag: RAG_HARD, shadow: 0, rim: 0.6 });
  // Postrzępione ucho i wąskie oko pod ciężką brwią.
  c.form(
    c.poly([
      [-6, -15],
      [-4.5, -25.5],
      [1, -17],
    ]),
    p,
    { shadow: 0.5 },
  );
  c.eye(3.8, -12.6, 2.2, p, 0.9);
  c.fill(c.horn(-0.4, -17, 8.4, -15, 1.4, 0.7), p.dark);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-28, -34, 15, 14, 2);
  // Ogon z ciemnym, postrzępionym chwostem.
  c.form(c.arc([-8, -4], [-20, -6], [-20.5, 4], 1.7, 1.1), p);
  c.form(
    union(
      c.dot(-20.6, 6, 3.2),
      c.horn(-20.6, 6, -23.5, 12, 2.2, 0.3),
      c.horn(-20.6, 6, -18, 12, 2, 0.3),
    ),
    { main: p.dark, shade: p.dark, dark: p.dark, light: p.shade },
    { shadow: 0 },
  );
  const body = c.oval(0, -12, 11.4, 14.4);
  const inside = c.form(body, p);
  c.patches(intersect(inside, c.oval(6, -8, 5.4, 10)), p.light, 0.45, 3.2, 0.85);
  c.scar([2.5, -3], [8.5, -9], p.dark, 3);
  // Grzywa schodzi z karku na grzbiet.
  c.form(
    union(
      c.dot(-1.5, -25, 4.6),
      c.dot(-7.5, -22, 4.8),
      c.dot(-11, -15.5, 4.6),
      c.horn(-10, -24, -15.5, -28, 2, 0.3),
      c.horn(-13, -13, -18.5, -11, 2, 0.3),
    ),
    MANE,
  );
  return c.finish();
}

export function tuskovatorParts(): Record<string, PartCanvas> {
  const p = TUSKOVATOR;
  return {
    thigh: fleshThigh(p, 1.4),
    shin: fleshShin(p, 'hoof', 1.3),
    torso: torso(p),
    upper: fleshUpper(p, 1.3),
    fore: fleshFore(p, 'hoof', 1.3),
    head: head(p),
    weapon: claws(p, 3.5),
  };
}
