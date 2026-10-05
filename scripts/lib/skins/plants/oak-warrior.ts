// Oak warrior: druga ewolucja Trunka, walczy wręcz i odrzuca najdalej w całej grze. Stary dąb
// spięty żelaznymi obręczami jak beczka: kanciasty łeb z porożem z uschłych konarów, zmarszczone
// czoło, w paszczy drzazgi zamiast zębów; od pasa wisi spódnica z desek, w garści maczuga
// nabijana gwoździami (szkic autora: gruby pień z koroną, zła twarz, spódnica z desek).
import { intersect, union } from '../../raster.ts';
import {
  BONE_SHADE,
  MAW,
  type Palette,
  type PartCanvas,
  partCanvas,
  RAG_HARD,
  RUST,
  STEEL,
} from '../kit.ts';
import { barkFore, barkShin, barkThigh, barkUpper } from '../limbs-plants.ts';
import { FUNGUS, LEAF, LEAF_DARK, leaf, MOSS, plant } from './palette.ts';

const OAK_BARK = { main: '#54402a', shade: '#2e2216', light: '#836a4c', dark: '#0e0a06' };
/** Suche, wyblakłe drewno desek i maczugi. */
const DEADWOOD = { main: '#6d5a41', shade: '#3f3324', light: '#9a8463', dark: '#0e0a06' };
const EMBER = '#f0a832';

export const OAK: Palette = plant(OAK_BARK, MOSS, EMBER);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-17, -32, 17, 6, 1);
  // Poroże z uschłych konarów, na końcach resztki liści.
  leaf(c, [-13.2, -22.6], [-15.8, -17.6], 1.5, LEAF_DARK);
  leaf(c, [13.4, -24], [15.6, -19.4], 1.4, LEAF_DARK);
  c.form(
    union(
      c.horn(-4, -14, -9.5, -25.5, 1.9, 0.5),
      c.horn(-7.4, -20.6, -13.6, -22.6, 1.3, 0.3),
      c.horn(-8.6, -23.4, -8, -28.6, 1.1, 0.3),
      c.horn(5, -14, 9.5, -26.5, 1.9, 0.5),
      c.horn(7.4, -20.6, 13.8, -24, 1.3, 0.3),
      c.horn(8.8, -24.4, 6.6, -29.4, 1.1, 0.3),
    ),
    p,
    { rag: 0.4, shadow: 0.6 },
  );
  // Grzywa z liści na karku.
  const mane = c.form(
    union(c.dot(-7.6, -11.6, 4.8), c.dot(-8.8, -5, 4.4), c.dot(-3.4, -16, 4)),
    LEAF_DARK,
    { rag: 0.75 },
  );
  c.patches(mane, LEAF.main, 0.25, 2.4, 0.9);
  // Kanciasty łeb z wysuniętą szczęką.
  const block = union(c.box(1.2, -7.8, 7.6, 8, 2), c.box(3.6, -2, 7, 3.2, 1.2));
  const inside = c.form(block, p, { rag: 0.5 });
  c.patches(inside, MOSS, 0.14, 2.4, 0.85);
  for (const crack of [
    [
      [-3.6, -15],
      [-2.4, -11.4],
      [-3.8, -8],
      [-2.8, -4.6],
    ],
    [
      [8.4, -6],
      [7.4, -4.2],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(crack, 0.3)), p.dark, 0.85);
  }
  // Zmarszczone czoło: ciężki wał opadający ku przodowi, pod nim żar oczu.
  c.eye(0.4, -8.4, 1.8, p, 1.1);
  c.eye(6.2, -7.6, 1.6, p, 1);
  c.form(
    c.poly([
      [-4, -11.4],
      [-3.2, -14],
      [9.8, -10.4],
      [9.6, -8.4],
    ]),
    { ...p, main: p.shade },
    { rag: 0.3, shadow: 0 },
  );
  // Paszcza: drzazgi zamiast zębów, nierówne i połamane.
  const maw = intersect(inside, c.box(4.4, -1.6, 5, 2, 0.5));
  c.fill(maw, MAW);
  for (const [x, length] of [
    [0.4, 1.6],
    [2.4, 1],
    [4.4, 1.8],
    [6.4, 1.2],
    [8.2, 1.6],
  ] as const) {
    c.fill(intersect(maw, c.box(x, -3.6 + length / 2, 0.75, length / 2, 0.1)), BONE_SHADE);
  }
  for (const [x, length] of [
    [1.4, 1.2],
    [3.4, 1.7],
    [5.4, 1],
    [7.4, 1.5],
  ] as const) {
    c.fill(intersect(maw, c.box(x, 0.4 - length / 2, 0.75, length / 2, 0.1)), BONE_SHADE);
  }
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-16, -30, 16, 15, 2);
  // Spódnica z desek: nierówne, spróchniałe u dołu.
  for (const [x, bottom, tilt] of [
    [-7.4, 9.4, -0.9],
    [-3.8, 11.6, -0.3],
    [-0.2, 10, 0],
    [3.4, 12, 0.3],
    [7, 9.6, 0.9],
  ] as const) {
    const plank = c.poly([
      [x - 1.9, 0],
      [x + 1.9, 0],
      [x + 1.8 + tilt, bottom],
      [x - 0.2 + tilt, bottom + 1.3],
      [x - 1.8 + tilt, bottom - 0.8],
    ]);
    const wood = c.form(plank, DEADWOOD, { rag: 0.3, shadow: 0.6 });
    c.patches(wood, DEADWOOD.shade, 0.25, 2, 0.9);
  }
  // Ułamany konar za barkiem.
  c.form(c.horn(-6.4, -21, -12.8, -27, 2.1, 1.1), p, { rag: 0.4 });
  // Pień jak beczka.
  const inside = c.form(c.box(0, -11.5, 9.6, 13.6, 4.4), p, { rag: 0.5 });
  for (const crack of [
    [
      [2.4, -24],
      [3.6, -19],
      [2.2, -14],
      [3.4, -9],
    ],
    [
      [-5.4, -3],
      [-4.4, 0.6],
    ],
    [
      [5.6, -2.6],
      [6.4, 1],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(crack, 0.3)), p.dark, 0.85);
  }
  // Dziupla po sęku.
  c.fill(intersect(inside, c.oval(-3, -12, 2.4, 3)), p.dark);
  c.fill(intersect(inside, c.oval(-2.8, -11.8, 1.4, 2)), '#050402');
  c.patches(inside, MOSS, 0.14, 2.4, 0.85);
  // Żelazne obręcze: przerdzewiałe, z nitami.
  for (const y of [-19.4, -4.4]) {
    const band = intersect(inside, c.box(0, y, 14, 1.4, 0));
    c.fill(band, STEEL.dark);
    c.fill(intersect(inside, c.box(0, y - 0.15, 14, 0.85, 0)), STEEL.shade);
    c.patches(band, RUST, 0.5, 2, 0.95);
    for (const x of [-6.4, -2, 2.6, 7])
      c.fill(intersect(inside, c.dot(x, y - 0.1, 0.5)), STEEL.light);
  }
  // Huby na plecach.
  c.form(c.oval(-9.6, -13.6, 3.2, 1.3), FUNGUS, { rag: 0.3, shadow: 0.7 });
  c.form(c.oval(-9.8, -9.4, 2.6, 1.1), FUNGUS, { rag: 0.3, shadow: 0.7 });
  return c.finish();
}

/** Maczuga z konaru: żelazna obręcz, krzywe gwoździe. */
function club(): PartCanvas {
  const c = partCanvas(-9, -6, 9, 31, 3);
  for (const [x, y, tx, ty] of [
    [-3.4, 17.6, -7.4, 16.4],
    [3.8, 19.4, 7.6, 18],
    [-3.6, 23.4, -7.2, 24.6],
    [3.4, 25.2, 7, 26.8],
    [0.4, 27.4, 0.8, 30],
  ] as const) {
    c.ink(c.horn(x, y, tx, ty, 0.7, 0.12), STEEL.light, STEEL.dark);
  }
  const wood = c.form(
    union(c.horn(0, -3.4, 0, 12, 1.2, 1.7), c.horn(0, 11, 0, 23.6, 2.2, 4.6), c.dot(-2.8, 19, 2.4)),
    DEADWOOD,
    { rag: 0.45 },
  );
  c.patches(wood, DEADWOOD.shade, 0.25, 2.2, 0.9);
  const band = intersect(wood, c.box(0, 14.4, 6, 1.2, 0));
  c.fill(band, STEEL.dark);
  c.fill(intersect(wood, c.box(0, 14.3, 6, 0.7, 0)), STEEL.shade);
  c.patches(band, RUST, 0.5, 2, 0.95);
  c.form(c.dot(0, -3.6, 1.6), DEADWOOD, { rag: RAG_HARD, shadow: 0.5 });
  return c.finish();
}

export function oakWarriorParts(): Record<string, PartCanvas> {
  const p = OAK;
  return {
    thigh: barkThigh(p, 1.3),
    shin: barkShin(p, 1.3),
    torso: torso(p),
    upper: barkUpper(p, 1.35),
    fore: barkFore(p, 'fist', 1.3),
    head: head(p),
    weapon: club(),
  };
}
