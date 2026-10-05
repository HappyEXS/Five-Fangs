// Monstrosity: forma bazowa szczepu Beasts. Mały, kudłaty stwór o zapadniętym oku, z jednym
// rogiem ułamanym i szczęką pełną krzywych kłów (szkic autora: głowa z rogami i wyszczerzonymi
// zębami).
import { intersect, union } from '../../raster.ts';
import { BONE, BONE_SHADE, MAW, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const MONSTROSITY: Palette = {
  main: '#6a4930',
  shade: '#3a2719',
  light: '#8b6b49',
  dark: '#150d08',
  accent: '#4a2f20',
  glow: '#e6c33a',
};

function head(p: Palette): PartCanvas {
  const c = partCanvas(-18, -34, 19, 7, 1);
  // Dalszy róg ułamany tuż nad czaszką.
  c.ink(
    c.poly([
      [-5.5, -18.5],
      [-7.5, -25],
      [-4.8, -23.4],
      [-3.4, -26.2],
      [-0.5, -19.5],
    ]),
    BONE_SHADE,
    p.dark,
  );
  const skull = c.oval(1, -10.5, 11.5, 10.5);
  const inside = c.form(
    union(
      skull,
      c.horn(-8, -15, -14.5, -13, 2.6, 0.3),
      c.horn(-9.5, -9, -15.5, -5.5, 2.6, 0.3),
      c.horn(-7, -3.5, -12, 2.5, 2.6, 0.3),
      c.horn(1, -1.5, -0.5, 4.5, 2.3, 0.3),
    ),
    p,
  );
  // Wyliniały pysk.
  c.patches(intersect(inside, c.oval(8.5, -6, 7.5, 6.5)), p.light, 0.55, 3.2, 0.9);
  // Paszcza: szeroka, krzywa szczelina od ucha do przodu pyska.
  const maw = intersect(
    inside,
    c.poly([
      [2.2, -8.4],
      [7.5, -9.6],
      [13.4, -8.2],
      [12.8, -2.2],
      [7, -0.8],
      [3.4, -2.4],
    ]),
  );
  c.fill(maw, MAW);
  // Kły górne i dolne różnej długości; dolne wystają przed górne.
  for (const [x, length] of [
    [4.4, 2.4],
    [6.8, 3.4],
    [9.4, 2],
    [11.6, 3],
  ] as const) {
    c.fill(intersect(maw, c.horn(x, -9, x + 0.3, -9 + length, 0.95, 0.15)), BONE);
  }
  for (const [x, length] of [
    [5.4, 2.6],
    [8.2, 3.6],
    [10.8, 2.4],
  ] as const) {
    c.fill(intersect(maw, c.horn(x, -1.4, x - 0.2, -1.4 - length, 0.95, 0.15)), BONE_SHADE);
  }
  // Zapadnięte oko pod ciężkim łukiem brwiowym; przez pysk biegnie blizna.
  c.eye(6.2, -13.6, 2.3, p, 1.1);
  c.fill(c.horn(1.6, -17.6, 10.6, -14.6, 1.5, 0.7), p.dark);
  c.scar([10.5, -12.5], [14, -6.5], p.dark, 2);
  // Bliższy róg wyrasta z czoła i wygina się do przodu; u nasady spękany.
  const horn = c.arc([5, -19.5], [3.5, -30.5], [12.5, -30], 2.9, 0.35);
  c.ink(horn, BONE, p.dark);
  c.fill(intersect(horn, c.dot(5, -20, 4)), BONE_SHADE, 0.85);
  c.fill(
    c.path(
      [
        [4.4, -23.5],
        [5.8, -25.2],
        [4.9, -27],
      ],
      0.22,
    ),
    p.dark,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-17, -28, 13, 6, 2);
  // Krótki, wyliniały ogon.
  c.form(c.arc([-6, -2], [-13, -1], [-14.5, -8.5], 2.1, 0.4), p);
  // Przygarbiony grzbiet z kępami sierści.
  const body = union(c.oval(0, -11.5, 9.2, 13.4), c.oval(-3, -17, 7.5, 7.5));
  const inside = c.form(
    union(
      body,
      c.horn(-8, -20, -13.5, -20.5, 2.4, 0.3),
      c.horn(-9.5, -13.5, -15, -11, 2.4, 0.3),
      c.horn(-8, -6, -12.5, -1.5, 2.4, 0.3),
    ),
    p,
  );
  c.patches(intersect(inside, c.oval(4.6, -8.5, 5, 9.5)), p.light, 0.5, 3, 0.85);
  // Żebra odznaczają się pod skórą.
  for (const y of [-14, -10.5, -7]) {
    c.fill(intersect(inside, c.arc([1.2, y], [4.6, y + 1.8], [8, y - 0.2], 0.3, 0.3)), p.shade);
  }
  c.scar([-4.5, -15], [0.5, -19], p.dark, 2);
  return c.finish();
}

export function monstrosityParts(): Record<string, PartCanvas> {
  const p = MONSTROSITY;
  return {
    thigh: fleshThigh(p, 1.05),
    shin: fleshShin(p, 'paw'),
    torso: torso(p),
    upper: fleshUpper(p),
    fore: fleshFore(p, 'paw'),
    head: head(p),
    weapon: claws(p, 7.5),
  };
}
