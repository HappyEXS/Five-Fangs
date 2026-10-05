// Polaris: druga ewolucja Cardinala, strzelec, który nie rusza się z miejsca. Święty w spękanej
// porcelanowej masce z zastygłym szerokim uśmiechem, w strąkach ciemnych włosów, pod krzywą,
// pękniętą aureolą; szata sięga ziemi jak relikwiarz (szkic autora: uśmiechnięta twarz
// z aureolą, długie włosy, uniesione dłonie).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { sleeveFore, sleeveUpper } from '../limbs-immortals.ts';
import { ASH, GOLD, immortal, PORCELAIN, SOOT } from './palette.ts';

export const POLARIS: Palette = immortal(ASH, GOLD.main);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-14, -31, 16, 17, 1);
  // Aureola: przechylona, pęknięta obręcz z poświatą.
  const ring = subtract(
    c.oval(1.4, -25, 9, 2.8),
    union(c.oval(1.4, -25, 7.2, 1.5), c.dot(8.4, -23.6, 1.3)),
  );
  c.fill(c.oval(1.4, -25, 10, 3.6), p.glow, 0.16);
  c.form(ring, GOLD, { rag: RAG_HARD, shadow: 0.4, rim: 0.6 });
  // Włosy: tłuste strąki po obu stronach maski.
  c.form(
    union(
      c.oval(1, -13, 8.6, 8.6),
      c.horn(-5, -16, -9.5, 11.5, 3.2, 0.5),
      c.horn(-2.4, -17, -6.4, 14, 3, 0.5),
      c.horn(6.6, -16, 10.4, 9, 2.6, 0.4),
      c.horn(4.4, -17.5, 12.6, 2.5, 2.2, 0.4),
    ),
    SOOT,
  );
  // Maska: gładka porcelana, spękana od czoła.
  const mask = c.oval(2.4, -9.4, 6.6, 8.8);
  const inside = c.form(mask, PORCELAIN, { rag: RAG_HARD });
  for (const crack of [
    [
      [-0.6, -17],
      [0.6, -13.6],
      [-0.4, -11],
      [0.8, -9],
    ],
    [
      [5.6, -2.2],
      [6.6, -4.4],
      [5.8, -6],
    ],
    [
      [0.6, -13.6],
      [2.6, -14.4],
    ],
  ] as const) {
    c.fill(intersect(inside, c.path(crack, 0.22)), PORCELAIN.dark);
  }
  c.patches(inside, PORCELAIN.shade, 0.2, 2.4, 0.8);
  // Małe, puste oczy i zastygły uśmiech od ucha do ucha.
  c.eye(0.4, -11.2, 1.5, { dark: PORCELAIN.dark, glow: p.glow }, 0.4);
  c.eye(5.4, -11.4, 1.4, { dark: PORCELAIN.dark, glow: p.glow }, -0.4);
  const grin = intersect(
    inside,
    c.poly([
      [-1.8, -6.6],
      [1.6, -5.4],
      [5, -5.6],
      [8, -6.8],
      [6.6, -3.2],
      [3.2, -2.2],
      [0, -3.2],
    ]),
  );
  c.fill(grin, SOOT.dark);
  for (const x of [-0.4, 1.3, 3, 4.7, 6.4]) {
    c.fill(intersect(grin, c.box(x, -5.4, 0.62, 0.95, 0.15)), BONE);
  }
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-14, -27, 14, 28, 2);
  // Szata jak dzwon: wąska w pasie, do samej ziemi, u dołu w strzępach.
  const robe = c.poly([
    [-7.5, -23.5],
    [7.5, -23.5],
    [8.6, -10],
    [6.6, -2],
    [10.6, 24.6],
    [7, 22.8],
    [3.6, 25],
    [0, 23],
    [-3.6, 25],
    [-7, 22.8],
    [-10.6, 24.6],
    [-6.6, -2],
    [-8.6, -10],
  ]);
  const inside = c.form(robe, p, { rag: 0.45 });
  c.patches(inside, p.shade, 0.24, 3, 0.85);
  // Fałdy.
  for (const [x1, x2] of [
    [-3.4, -5.6],
    [5.2, 7.6],
  ] as const) {
    c.fill(intersect(inside, c.line(x1, 0, x2, 22, 0.32)), p.shade);
  }
  // Złota stuła przez środek, z wytartym wzorem.
  const stole = intersect(inside, c.line(1.4, -22, 1.4, 22, 1.9));
  c.fill(stole, GOLD.dark);
  c.fill(intersect(inside, c.line(1.4, -22, 1.4, 22, 1.35)), GOLD.main);
  c.patches(stole, GOLD.shade, 0.35, 2.2, 0.9);
  for (const y of [-14, -6, 2, 10, 18]) {
    c.fill(intersect(stole, c.dot(1.4, y, 0.6)), GOLD.dark);
  }
  // Złoty kołnierz.
  const collar = c.form(c.box(0.6, -21.6, 7.2, 2.4, 1.2), GOLD, { rag: RAG_HARD, rim: 0.4 });
  c.patches(collar, GOLD.shade, 0.3, 2.2, 0.9);
  return c.finish();
}

/** Ćwiek na stule: nogi są pod szatą, więc części nóg to tylko jej ozdoby. */
function stud(salt: number): PartCanvas {
  const c = partCanvas(-3, -3, 3, 3, salt);
  c.form(c.dot(0, 0, 1.5), GOLD, { rag: RAG_HARD, shadow: 0.5, rim: 0.6 });
  return c.finish(0.5);
}

/** Odłamek gwiazdy w dłoni: z niego Polaris ciska światłem. */
function shard(p: Palette): PartCanvas {
  const c = partCanvas(-5, -5, 5, 6, 5);
  const star = c.poly([
    [0, -3.6],
    [0.9, -0.8],
    [3.4, 0.4],
    [0.9, 1.2],
    [0, 4.4],
    [-0.9, 1.2],
    [-3.4, 0.4],
    [-0.9, -0.8],
  ]);
  c.fill(c.dot(0, 0.3, 3.6), p.glow, 0.22);
  c.ink(star, p.glow, GOLD.dark);
  return c;
}

export function polarisParts(): Record<string, PartCanvas> {
  const p = POLARIS;
  return {
    thigh: stud(3),
    shin: stud(4),
    torso: torso(p),
    upper: sleeveUpper(p),
    fore: sleeveFore(p, PORCELAIN.main),
    head: head(p),
    weapon: shard(p),
  };
}
