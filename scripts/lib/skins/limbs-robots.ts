// Kończyny robotów na szkielecie humanoid: stalowy tłok, przegub i osłona z łuszczącą się
// farbą, nity, rdza. Rozmieszczenie stawów opisuje limbs.ts.
import { union } from '../raster.ts';
import { type Palette, type PartCanvas, partCanvas, RAG_HARD, RUST, STEEL } from './kit.ts';

/** Twarda krawędź z wytartym, jaśniejszym brzegiem od strony światła. */
export const HARD = { rag: RAG_HARD, rim: 0.55 } as const;
/** Ciemna stal stóp i szczęk. */
export const DARK_STEEL = {
  main: STEEL.shade,
  shade: STEEL.dark,
  dark: STEEL.dark,
  light: STEEL.main,
};

export function rivet(c: PartCanvas, x: number, y: number): void {
  c.fill(c.dot(x, y, 0.75), STEEL.dark);
  c.fill(c.dot(x - 0.18, y - 0.18, 0.36), STEEL.light);
}

function joint(c: PartCanvas, r: number): void {
  c.form(c.dot(0, 0, r), STEEL, HARD);
  c.fill(c.dot(0, 0, r * 0.36), STEEL.dark);
}

export function metalThigh(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-8, -7, 8, 16, 41);
  c.form(c.line(0, 0, 0, 10.6, 1.3 * girth), STEEL, { rag: RAG_HARD, shadow: 0.5 });
  const plate = c.form(c.box(0.6, 4.8, 3.5 * girth, 4.4, 1.2), p, HARD);
  c.patches(plate, RUST, 0.3, 2.2, 0.95);
  rivet(c, 0.6, 2);
  joint(c, 2.7 * girth);
  return c.finish();
}

/** Goleń ze stopą: `spike` to szpic trójnogu, `pad` płaska stopka, `heavy` ciężka podstawa. */
export function metalShin(p: Palette, foot: 'spike' | 'pad' | 'heavy', girth = 1): PartCanvas {
  const c = partCanvas(-9, -5, 12, 17, 42);
  c.form(c.line(0, 0, 0, 11, 1.2 * girth), STEEL, { rag: RAG_HARD, shadow: 0.5 });
  const plate = c.form(c.box(0.5, 5.4, 2.8 * girth, 3.6, 1), p, HARD);
  c.patches(plate, RUST, 0.3, 2.2, 0.95);
  if (foot === 'spike') {
    c.form(
      c.poly([
        [-1.8, 10.4],
        [2, 10.4],
        [5, 14.7],
        [0.2, 12.9],
        [-3.4, 14.7],
      ]),
      DARK_STEEL,
      HARD,
    );
  } else if (foot === 'pad') {
    c.form(
      c.poly([
        [-1.4, 10.2],
        [1.6, 10.2],
        [5.6, 14.7],
        [-3.6, 14.7],
      ]),
      DARK_STEEL,
      HARD,
    );
  } else {
    const base = c.form(
      c.poly([
        [-3.4 * girth, 9.8],
        [3.4 * girth, 9.8],
        [6 * girth, 14.7],
        [-4.6 * girth, 14.7],
      ]),
      DARK_STEEL,
      HARD,
    );
    c.patches(base, RUST, 0.35, 2.2, 0.95);
  }
  joint(c, 2.4 * girth);
  return c.finish();
}

export function metalUpper(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-7, -6, 7, 15, 43);
  c.form(c.line(0, 0, 0, 9.8, 1.15 * girth), STEEL, { rag: RAG_HARD, shadow: 0.5 });
  const pad = c.form(c.dot(0, 0.4, 3.2 * girth), p, HARD);
  c.patches(pad, RUST, 0.3, 2, 0.95);
  rivet(c, 0, 0.4);
  return c.finish();
}

/** Przedramię: `clamp` to szczypce, `nozzle` dysza, `stub` gładki kikut. */
export function metalFore(p: Palette, hand: 'clamp' | 'nozzle' | 'stub', girth = 1): PartCanvas {
  const c = partCanvas(-8, -5, 9, 20, 44);
  c.form(c.line(0, 0, 0, 8.6, 1.1 * girth), STEEL, { rag: RAG_HARD, shadow: 0.5 });
  const bracer = c.form(c.box(0, 4.6, 2.4 * girth, 3, 0.8), p, HARD);
  c.patches(bracer, RUST, 0.3, 2, 0.95);
  if (hand === 'clamp') {
    c.form(
      union(
        c.arc([-0.6, 8.4], [-3.8, 11], [-1.2, 14.4], 1.2, 0.4),
        c.arc([0.6, 8.4], [3.8, 11], [1.2, 14.4], 1.2, 0.4),
      ),
      STEEL,
      HARD,
    );
  } else if (hand === 'nozzle') {
    c.form(
      c.poly([
        [-1.6, 7.8],
        [1.6, 7.8],
        [3, 13.6],
        [-3, 13.6],
      ]),
      STEEL,
      HARD,
    );
    c.fill(c.oval(0, 13.4, 2.1, 0.8), STEEL.dark);
  } else {
    c.form(c.dot(0, 9, 2.2 * girth), STEEL, HARD);
  }
  joint(c, 2.2 * girth);
  return c.finish();
}
