// Ultimus: druga ewolucja Cardinala, najszybciej strzelający w szczepie. Serafin bez twarzy:
// wydłużona złota maska z jednym okiem w głębokim oczodole, wokół niej wachlarz wyliniałych
// skrzydeł, nad nią aureola z kolcami; ciało owinięte parą skrzydeł aż do ziemi, długie ręce
// o wielkich, chwytnych dłoniach (szkic autora).
import { intersect, subtract, union } from '../../raster.ts';
import { type Palette, type PartCanvas, type Point, partCanvas, RAG_HARD } from '../kit.ts';
import { featherLeg } from '../limbs-immortals.ts';
import { FEATHER, GOLD, immortal } from './palette.ts';

export const ULTIMUS: Palette = immortal(GOLD, FEATHER.main);
const PLUMAGE: Palette = immortal(FEATHER, GOLD.main);
const PLUMAGE_DARK: Palette = immortal(
  { main: FEATHER.shade, shade: '#373226', light: FEATHER.main, dark: FEATHER.dark },
  GOLD.main,
);

/** Skrzydło z trzech lotek rozchodzących się od nasady. */
function wing(c: PartCanvas, root: Point, tip: Point, spread: number): void {
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * spread;
  const ny = (dx / length) * spread;
  for (const [side, reach] of [
    [-1, 0.82],
    [1, 0.78],
    [0, 1],
  ] as const) {
    const x = root[0] + dx * reach + nx * side;
    const y = root[1] + dy * reach + ny * side;
    c.form(c.horn(root[0], root[1], x, y, 2.6, 0.5), FEATHER, { rag: 0.5, shadow: 0.7 });
    c.fill(c.line(root[0], root[1], x, y, 0.24), FEATHER.dark, 0.7);
  }
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-25, -43, 22, 8, 1);
  // Wachlarz skrzydeł za maską: cztery z tyłu, dwa mniejsze z przodu.
  wing(c, [-4, -21], [-18, -34], 3.4);
  wing(c, [-5, -17], [-21.5, -22], 3.4);
  wing(c, [-5, -11], [-21, -9], 3.4);
  wing(c, [-4, -6], [-17, 3], 3);
  wing(c, [5.5, -22], [14, -34], 2.8);
  wing(c, [7.5, -17], [18.5, -22], 2.6);
  // Aureola z kolcami, jeden ułamany.
  c.fill(c.oval(1.6, -30, 9.4, 3.6), p.glow, 0.16);
  c.form(
    union(
      subtract(c.oval(1.6, -30, 8.4, 2.6), c.oval(1.6, -30, 6.6, 1.3)),
      c.horn(-3.2, -32, -4.8, -38.6, 1, 0.2),
      c.horn(1.6, -32.4, 1.6, -40.6, 1, 0.2),
      c.horn(6.4, -32, 7.4, -35, 1, 0.6),
    ),
    GOLD,
    { rag: RAG_HARD, shadow: 0.4, rim: 0.6 },
  );
  // Maska: gładkie jajo ze ściemniałego złota, bez ust.
  const mask = c.oval(2, -12.5, 6.8, 11);
  const inside = c.form(mask, p, { rag: RAG_HARD, rim: 0.5 });
  c.patches(inside, p.shade, 0.32, 2.6, 0.9);
  // Jedno oko głęboko w oczodole; spod niego ściekają ciemne smugi.
  c.fill(intersect(inside, c.box(3.4, -12, 4.6, 3.4, 2.8)), p.dark);
  c.fill(c.dot(3.8, -12, 2.6), p.light);
  c.fill(c.dot(3.8, -12, 1.95), p.dark);
  c.fill(c.dot(3.8, -12, 2.4), p.glow, 0.25);
  c.fill(c.dot(4, -12, 0.95), p.glow);
  for (const [x, y] of [
    [1.6, -3.5],
    [4, -1.4],
    [6, -4.6],
  ] as const) {
    c.fill(intersect(inside, c.horn(x, -8.8, x + 0.2, y, 0.5, 0.15)), p.dark, 0.85);
  }
  return c.finish();
}

function torso(): PartCanvas {
  const c = partCanvas(-13, -29, 13, 17, 2);
  // Chude ciało i para skrzydeł, która zasłania je do ziemi.
  c.form(
    c.horn(0, -23, 0, 2, 4.2, 3),
    { ...GOLD, main: GOLD.shade, shade: '#33270e' },
    { rag: 0.3 },
  );
  for (const [x1, x2, y] of [
    [-3, -8.6, 12],
    [3, 8, 13],
    [0, 0.4, 14],
  ] as const) {
    const feather = c.horn(x1, -20, x2, y, 5, 0.8);
    c.form(feather, PLUMAGE, { rag: 0.5 });
    c.fill(c.line(x1, -18, x2, y - 2, 0.26), PLUMAGE.dark, 0.7);
  }
  // Złota klamra spina skrzydła pod szyją.
  const clasp = c.form(c.dot(0.4, -19.6, 2.6), GOLD, { rag: RAG_HARD, rim: 0.6 });
  c.patches(clasp, GOLD.shade, 0.3, 2, 0.9);
  c.fill(c.dot(0.4, -19.6, 0.9), GOLD.dark);
  return c.finish();
}

function upper(p: Palette): PartCanvas {
  const c = partCanvas(-5, -5, 5, 14, 3);
  c.form(c.horn(0, 0, 0, 9.8, 1.7, 1.3), p, { rag: 0.3 });
  c.form(c.dot(0, 0, 2.1), p, { rag: RAG_HARD, shadow: 0.6 });
  return c.finish();
}

/** Przedramię z wielką dłonią o długich, rozczapierzonych palcach. */
function fore(p: Palette): PartCanvas {
  const c = partCanvas(-8, -5, 9, 21, 4);
  c.form(
    union(
      c.horn(0, 0, 0, 8.6, 1.4, 1.2),
      c.dot(0, 9.4, 2.3),
      c.horn(0, 9.4, -4.6, 15.4, 1, 0.25),
      c.horn(0, 9.4, -1.6, 17.6, 1, 0.25),
      c.horn(0, 9.4, 1.6, 17.8, 1, 0.25),
      c.horn(0, 9.4, 4.6, 15.6, 1, 0.25),
      c.horn(0, 9.4, 5.2, 10.4, 0.9, 0.25),
    ),
    p,
    { rag: 0.3 },
  );
  return c.finish();
}

/** Znak w dłoni: małe złote oko, z którego wychodzi promień. */
function sigil(p: Palette): PartCanvas {
  const c = partCanvas(-4, -4, 4, 4, 5);
  c.fill(c.dot(0, 0, 3), p.glow, 0.22);
  c.form(c.dot(0, 0, 2), p, { rag: RAG_HARD, shadow: 0.4 });
  c.fill(c.dot(0, 0, 0.9), p.glow);
  return c;
}

export function ultimusParts(): Record<string, PartCanvas> {
  const p = ULTIMUS;
  return {
    thigh: featherLeg(PLUMAGE_DARK, false),
    shin: featherLeg(PLUMAGE_DARK, true),
    torso: torso(),
    upper: upper(p),
    fore: fore(p),
    head: head(p),
    weapon: sigil(p),
  };
}
