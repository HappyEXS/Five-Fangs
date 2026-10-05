// Mother-tree: druga ewolucja Trunka. Nie atakuje i nie rusza się z miejsca: rodzi krzaki, które
// walczą za nią. Ogromne, stare drzewo o pniu rozchodzącym się w korzenie; pod ciężką, zwisającą
// koroną smutna twarz z wypróchniałych dziupli, a w wielkiej dziupli u podstawy świecą oczy
// krzaka, który jeszcze nie wyszedł. Z gałęzi zwisają strąki (szkic autora: wielkie drzewo
// z koroną, twarzą i korzeniami).
import { intersect, union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { barkFore, barkUpper, thornShin, thornThigh } from '../limbs-plants.ts';
import { FUNGUS, LEAF, LEAF_DARK, MOSS, plant, SWAMP_GLOW } from './palette.ts';

const OLD_BARK = { main: '#463a2c', shade: '#271f17', light: '#6f5e49', dark: '#0d0906' };
export const MOTHER_TREE: Palette = plant(OLD_BARK, MOSS, '#cfe0a0');

/** Strąk na szypułce: z takich wyrastają krzaki. */
function pod(c: PartCanvas, x: number, y: number, size = 1): void {
  c.fill(c.line(x, y - 3.4 * size, x, y - 1.6 * size, 0.3), LEAF_DARK.dark);
  const inside = c.form(c.oval(x, y, 1.9 * size, 2.7 * size), FUNGUS, { rag: 0.3, shadow: 0.8 });
  c.fill(
    intersect(inside, c.line(x + 0.2, y - 1.6 * size, x + 0.2, y + 1.6 * size, 0.24)),
    FUNGUS.dark,
    0.8,
  );
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-28, -35, 28, 16, 1);
  // Odcinek pnia z twarzą; zachodzi na tułów.
  const trunk = c.form(c.box(0, -5.5, 7.8, 9, 2.6), p, { rag: 0.5 });
  c.patches(trunk, MOSS, 0.14, 2.4, 0.85);
  // Smutne oczy: dziuple opadające ku bokom, w głębi blade światło.
  c.eye(-2.2, -6.2, 2, p, -1.2);
  c.eye(3.8, -6.4, 1.9, p, 1.2);
  // Zacieki żywicy pod oczami.
  c.fill(intersect(trunk, c.horn(-2.6, -4.4, -2.8, 0.4, 0.5, 0.2)), p.dark, 0.6);
  c.fill(intersect(trunk, c.horn(4.2, -4.6, 4.4, -0.2, 0.5, 0.2)), p.dark, 0.6);
  c.fill(
    intersect(
      trunk,
      c.path(
        [
          [-1.4, -1.2],
          [0.2, -2.4],
          [2, -2.3],
          [3.4, -1],
        ],
        0.5,
      ),
    ),
    p.dark,
  );
  // Zwisające pędy korony, na niektórych strąki.
  const strands = union(
    c.horn(-22, -10, -24, 5.6, 2.4, 0.4),
    c.horn(-16.4, -9, -17, 9.4, 2.2, 0.4),
    c.horn(-11, -10, -11.6, 1.6, 2, 0.4),
    c.horn(11.4, -10, 12, 0.6, 2, 0.4),
    c.horn(17, -9, 18, 7.6, 2.2, 0.4),
    c.horn(23, -10, 24.6, 3, 2.4, 0.4),
  );
  // Korona: szeroka, ciężka, opadająca na boki.
  const canopy = union(
    strands,
    c.dot(0, -22.4, 10.4),
    c.dot(-11.6, -19, 9),
    c.dot(11.6, -19, 9),
    c.dot(-19.6, -12.6, 7),
    c.dot(19.6, -12.6, 7),
    c.dot(-6, -25, 7.4),
    c.dot(7, -25.4, 7.4),
  );
  const leaves = c.form(canopy, LEAF_DARK, { rag: 0.8 });
  c.patches(leaves, LEAF.main, 0.26, 3, 0.9);
  c.patches(leaves, LEAF_DARK.shade, 0.24, 3.2, 0.9);
  c.patches(leaves, MOSS, 0.08, 2.2, 0.9);
  pod(c, -17, 12.4);
  pod(c, 18, 10.6);
  pod(c, -11.6, 4.6, 0.8);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-21, -27, 21, 29, 2);
  // Pień: szeroki, u dołu rozchodzi się w korzenie.
  const trunk = union(
    c.poly([
      [-8, -24.6],
      [8, -24.6],
      [7.4, -6],
      [8.6, 8],
      [12.6, 25.4],
      [-12.6, 25.4],
      [-8.6, 8],
      [-7.4, -6],
    ]),
    c.horn(-8, 18, -19, 25.8, 3.6, 0.7),
    c.horn(8, 18, 19, 26, 3.6, 0.7),
    c.horn(-3, 22, -7, 27, 2.6, 0.6),
    c.horn(4, 22, 9, 27, 2.6, 0.6),
  );
  const inside = c.form(trunk, p, { rag: 0.55 });
  for (const crack of [
    [
      [-3.6, -22],
      [-2.4, -16],
      [-4, -10],
      [-2.8, -4],
    ],
    [
      [4.4, -20],
      [5.2, -14],
      [4, -8],
    ],
    [
      [-7, 12],
      [-8.4, 18],
      [-11, 22],
    ],
    [
      [7.6, 13],
      [9.4, 19],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(crack, 0.32)), p.dark, 0.85);
  }
  c.patches(intersect(inside, c.box(0, 21, 20, 6, 0)), MOSS, 0.4, 2.6, 0.9);
  c.patches(inside, MOSS, 0.12, 2.4, 0.85);
  // Dziupla, w której dojrzewa następny krzak.
  const hollow = intersect(inside, c.ragged(c.oval(1.4, 9.6, 4.8, 6.6), 0.4, 3));
  c.fill(hollow, p.dark);
  c.fill(intersect(hollow, c.oval(1.8, 10, 3.6, 5.4)), '#040502');
  for (const x of [0.4, 3.4]) {
    c.fill(c.dot(x, 9.4, 1.5), SWAMP_GLOW, 0.2);
    c.fill(c.dot(x, 9.4, 0.62), SWAMP_GLOW);
  }
  // Huby na plecach pnia.
  c.form(c.oval(-8.6, -8.6, 3.4, 1.4), FUNGUS, { rag: 0.3, shadow: 0.7 });
  c.form(c.oval(-9.2, -3.6, 2.8, 1.2), FUNGUS, { rag: 0.3, shadow: 0.7 });
  c.form(c.oval(9, 1.4, 2.8, 1.2), FUNGUS, { rag: 0.3, shadow: 0.7 });
  return c.finish();
}

/** Strąk w dłoni: przy przyzywaniu drzewo nim potrząsa. */
function seedPod(): PartCanvas {
  const c = partCanvas(-4, -3, 4, 9, 3);
  pod(c, 0, 4.4, 1.15);
  return c.finish();
}

export function motherTreeParts(): Record<string, PartCanvas> {
  const p = MOTHER_TREE;
  return {
    thigh: thornThigh(p),
    shin: thornShin(p),
    torso: torso(p),
    upper: barkUpper(p, 0.95),
    fore: barkFore(p, 'twigs', 0.95),
    head: head(p),
    weapon: seedPod(),
  };
}
