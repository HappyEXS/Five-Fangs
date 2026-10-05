// Trunk: pierwsza ewolucja Busha, strzelec. Rozłupany pień na korzeniach: dwa konary, jeden
// z gęstą koroną, drugi obumarły, z gołymi gałęziami; w rozwidleniu dwa wypróchniałe oczy
// i pęknięcie krzywego uśmiechu. Ciska kolczastymi nasionami (szkic autora: pień w kształcie Y
// z liśćmi na końcach, oczy i uśmiech w rozwidleniu).
import { intersect, union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { barkFore, barkShin, barkThigh, barkUpper } from '../limbs-plants.ts';
import { BARK, FUNGUS, LEAF, LEAF_DARK, MOSS, plant } from './palette.ts';

export const TRUNK: Palette = plant(BARK);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-21, -36, 21, 8, 1);
  // Korona na tylnym konarze: gęsta, ciemna.
  const crown = union(
    c.dot(-10, -25, 6.2),
    c.dot(-14.4, -21.6, 4.6),
    c.dot(-6, -28.6, 4.8),
    c.dot(-13.4, -29.4, 4.2),
  );
  const crownInside = c.form(crown, LEAF_DARK, { rag: 0.75 });
  c.patches(crownInside, LEAF.main, 0.25, 2.4, 0.9);
  // Przedni konar obumiera: resztka liści i gołe gałązki.
  c.form(
    union(
      c.horn(8.5, -22, 14.5, -33.5, 1.2, 0.2),
      c.horn(9, -23, 18, -26.5, 1.1, 0.2),
      c.horn(11.4, -28, 15.4, -27, 0.7, 0.15),
    ),
    p,
    { rag: 0.4, shadow: 0.5 },
  );
  const sick = { main: '#7a7434', shade: '#48441c', light: '#a39c52', dark: LEAF.dark };
  c.form(union(c.dot(7.4, -25.6, 4), c.dot(4.6, -28.4, 3)), sick, { rag: 0.75 });
  // Dwa konary i nasada z twarzą.
  const wood = union(
    c.horn(0, -3, -9, -21, 4.2, 3),
    c.horn(1, -3, 8.5, -22, 4.2, 3),
    c.box(0.5, -1, 6.4, 5.6, 2),
  );
  const inside = c.form(wood, p, { rag: 0.5 });
  c.patches(inside, MOSS, 0.16, 2.4, 0.85);
  for (const crack of [
    [
      [-4.6, -8],
      [-6, -12.5],
      [-5.4, -16],
    ],
    [
      [4.4, -8.4],
      [5.8, -13],
      [5.2, -17],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(crack, 0.28)), p.dark, 0.85);
  }
  // Wypróchniałe oczy i pęknięcie uśmiechu.
  c.eye(-1.8, -2.6, 2, p, 0.8);
  c.eye(3.9, -3, 1.9, p, -0.6);
  c.fill(
    c.path(
      [
        [-2.8, 1.4],
        [-0.8, 2.8],
        [1, 1.6],
        [2.8, 3],
        [5, 1.6],
      ],
      0.5,
    ),
    p.dark,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-14, -27, 13, 6, 2);
  // Ułamana gałąź z tyłu.
  c.form(c.horn(-5.6, -14, -11.4, -18.6, 1.9, 1.1), p, { rag: 0.4 });
  const inside = c.form(c.box(0, -10.6, 6.6, 13.4, 2.6), p, { rag: 0.5 });
  for (const crack of [
    [
      [-2.6, -22],
      [-1.4, -17],
      [-2.8, -12],
      [-1.6, -7],
    ],
    [
      [3, -18],
      [4.2, -13],
      [3, -9],
    ],
    [
      [0.6, -4],
      [1.6, 0],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(crack, 0.3)), p.dark, 0.85);
  }
  // Dziupla po sęku i mech u dołu pnia.
  c.fill(intersect(inside, c.oval(-2.6, -2.4, 2.2, 2.8)), p.dark);
  c.fill(intersect(inside, c.oval(-2.4, -2.2, 1.3, 1.9)), '#050402');
  c.patches(intersect(inside, c.box(0, -1, 7, 4, 0)), MOSS, 0.45, 2.4, 0.9);
  c.patches(inside, MOSS, 0.12, 2.2, 0.85);
  // Huba z boku.
  c.form(c.oval(6.6, -9.6, 3.2, 1.3), FUNGUS, { rag: 0.3, shadow: 0.7 });
  return c.finish();
}

/** Garść zeschłych liści w dłoni. */
function leafFist(): PartCanvas {
  const c = partCanvas(-6, -4, 6, 8, 3);
  const inside = c.form(
    union(c.dot(-1.6, 2, 2.8), c.dot(1.8, 1.6, 2.6), c.dot(0, 4.2, 2.6)),
    LEAF_DARK,
    { rag: 0.7 },
  );
  c.patches(inside, LEAF.main, 0.25, 2, 0.9);
  return c.finish();
}

export function trunkParts(): Record<string, PartCanvas> {
  const p = TRUNK;
  return {
    thigh: barkThigh(p),
    shin: barkShin(p),
    torso: torso(p),
    upper: barkUpper(p, 0.9),
    fore: barkFore(p, 'twigs', 0.9),
    head: head(p),
    weapon: leafFist(),
  };
}
