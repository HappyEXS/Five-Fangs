// Xartix: druga ewolucja Guardian of hell, walczy wręcz. Skarabeusz-rycerz: blada, jajowata
// twarz o wąskich szparach oczu wyziera spod czarno-złotego pancerza, który otula ją jak kaptur;
// na głowie dwa czułki, jeden pierzasty, drugi zakręcony w hak; ręce kończą się hakowatymi
// pazurami (szkic autora: jajo w żebrowanej skorupie, czułki, pazury).
import { intersect, union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';
import { GOLD, HALO, PORCELAIN } from './palette.ts';

/** Pancerz: czerń z przetartym złotem na krawędziach. */
export const XARTIX: Palette = {
  main: '#352b1a',
  shade: '#1a140b',
  light: '#7d6630',
  dark: '#0a0705',
  accent: GOLD.main,
  glow: HALO,
};

function head(p: Palette): PartCanvas {
  const c = partCanvas(-13, -33, 17, 7, 1);
  // Czułek pierzasty odchyla się do tyłu, hakowaty wygina do przodu.
  const plume = union(
    c.horn(-1, -16, -7, -30, 1.2, 0.3),
    c.horn(-2.6, -20, -6.6, -19.4, 0.7, 0.15),
    c.horn(-3.8, -23, -8, -23, 0.7, 0.15),
    c.horn(-5, -26, -9.2, -26.8, 0.7, 0.15),
    c.horn(-2.4, -20, -1, -23.6, 0.7, 0.15),
    c.horn(-3.8, -23.4, -2.4, -27, 0.7, 0.15),
  );
  c.form(plume, GOLD, { rag: RAG_HARD, shadow: 0.4 });
  c.form(
    union(
      c.arc([3, -17], [4.6, -31], [12, -27.4], 1.4, 0.5),
      c.arc([12, -27.4], [14.6, -24.4], [11.6, -23], 0.5, 0.25),
    ),
    GOLD,
    { rag: RAG_HARD, shadow: 0.4 },
  );
  // Pancerz nasunięty na głowę jak kaptur, żebrowany.
  const hood = c.oval(0, -10, 9, 9.6);
  const hoodInside = c.form(hood, p, { rag: RAG_HARD, rim: 0.6 });
  for (const x of [-6, -3, 0]) {
    c.fill(
      intersect(hoodInside, c.arc([x + 2, -19], [x - 2.4, -10], [x + 1, -1], 0.26, 0.26)),
      p.dark,
    );
  }
  c.patches(hoodInside, p.light, 0.14, 2, 0.9);
  // Blada twarz: wąskie szpary oczu pod ściągniętymi brwiami i drobne, krzywe usta z żuwaczkami.
  const face = c.oval(3.2, -8.4, 6.2, 7.8);
  const inside = c.form(face, PORCELAIN, { rag: RAG_HARD });
  c.patches(inside, PORCELAIN.shade, 0.25, 2.4, 0.8);
  for (const [x, w] of [
    [1.6, 1.6],
    [6.2, 1.4],
  ] as const) {
    c.fill(c.box(x, -10.6, w, 0.95, 0.3), PORCELAIN.dark);
    c.fill(c.box(x + 0.2, -10.6, w * 0.55, 0.38, 0.15), p.glow);
  }
  c.fill(c.line(-0.4, -13, 3.4, -11.9, 0.45), PORCELAIN.dark);
  c.fill(c.line(4.6, -11.9, 8.2, -12.8, 0.45), PORCELAIN.dark);
  c.fill(
    c.path(
      [
        [2.4, -4.4],
        [3.4, -3.8],
        [4.4, -4.6],
        [5.4, -3.8],
        [6.4, -4.4],
      ],
      0.3,
    ),
    PORCELAIN.dark,
  );
  c.ink(c.horn(2.2, -3.4, 3.2, -0.6, 0.8, 0.2), p.light, p.dark);
  c.ink(c.horn(6.6, -3.4, 5.6, -0.8, 0.8, 0.2), p.light, p.dark);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-16, -29, 13, 8, 2);
  // Pokrywy skrzydeł: garbata, żebrowana kopuła na plecach.
  const shell = c.oval(-2.4, -11, 10.6, 14.4);
  const shellInside = c.form(shell, p, { rag: RAG_HARD, rim: 0.6 });
  for (const x of [-9, -5.4, -1.8]) {
    c.fill(
      intersect(shellInside, c.arc([x + 3, -25], [x - 3, -11], [x + 2.4, 3], 0.28, 0.28)),
      p.dark,
    );
  }
  c.patches(shellInside, p.light, 0.14, 2.2, 0.9);
  c.patches(shellInside, '#4a2a18', 0.12, 2.4, 0.85);
  // Blady, segmentowany odwłok z przodu.
  const belly = c.oval(4.2, -9, 5, 10.6);
  const bellyInside = c.form(belly, PORCELAIN, { rag: RAG_HARD });
  for (const y of [-15, -11, -7, -3]) {
    c.fill(
      intersect(bellyInside, c.arc([-0.6, y], [4.4, y + 1.6], [9.4, y - 0.4], 0.28, 0.28)),
      PORCELAIN.dark,
      0.8,
    );
  }
  c.patches(bellyInside, PORCELAIN.shade, 0.25, 2.4, 0.8);
  return c.finish();
}

export function xartixParts(): Record<string, PartCanvas> {
  const p = XARTIX;
  return {
    thigh: fleshThigh(p, 0.72),
    shin: fleshShin(p, 'paw', 0.72),
    torso: torso(p),
    upper: fleshUpper(p, 0.72),
    fore: fleshFore(p, 'paw', 0.72),
    head: head(p),
    weapon: claws(p, 12.5, 1.3, 1.5),
  };
}
