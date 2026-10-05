// Cardinal: pierwsza ewolucja Orba, strzelec. Zgarbiony hierarcha w wysokiej, spękanej mitrze;
// pod kapturem nie ma twarzy, tylko dwa światła. Szaty leżą warstwami o postrzępionych brzegach,
// za plecami wiszą wyliniałe skrzydła, w dłoni dymi kadzielnica (szkic autora: kopulasta głowa,
// warstwowy tułów w zygzaki, skrzydła).
import { union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { ragShin, ragThigh, sleeveFore, sleeveUpper } from '../limbs-immortals.ts';
import { ASH, FEATHER, GOLD, immortal, SOOT } from './palette.ts';

export const CARDINAL: Palette = immortal(ASH, GOLD.main);
const ROBE_DARK: Palette = immortal(
  { main: ASH.shade, shade: '#332e24', light: ASH.main, dark: ASH.dark },
  GOLD.main,
);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-14, -36, 14, 7, 1);
  // Wstęgi mitry zwisają na kark.
  c.form(
    union(
      c.poly([
        [-6.4, -10],
        [-3.6, -10],
        [-4.4, 3.4],
        [-7.6, 2.2],
      ]),
      c.poly([
        [-9.4, -10],
        [-7, -10],
        [-8.6, 0.6],
        [-10.6, -1.5],
      ]),
    ),
    { ...GOLD, main: GOLD.shade, shade: '#33270e' },
    { rag: 0.4 },
  );
  // Kaptur: pod nim ciemność i dwa światła zamiast oczu.
  c.form(c.oval(0.6, -6.4, 8.4, 8), p);
  c.fill(c.oval(4, -6, 4.9, 5.5), SOOT.dark);
  for (const [x, y, r] of [
    [5.2, -7.4, 0.9],
    [8, -7.1, 0.75],
  ] as const) {
    c.fill(c.dot(x, y, r * 2.3), p.glow, 0.25);
    c.fill(c.dot(x, y, r), p.glow);
  }
  // Mitra: wysoka, spękana, z wytartym złoceniem.
  const mitre = c.poly([
    [-7, -11.5],
    [-5.6, -22],
    [1, -34],
    [7.2, -22],
    [8.6, -12],
  ]);
  const inside = c.form(mitre, GOLD, { rag: 0.35, rim: 0.4 });
  c.patches(inside, GOLD.shade, 0.32, 2.6, 0.9);
  c.fill(c.line(-6.8, -12.8, 8.4, -13.2, 1.1), GOLD.dark);
  c.fill(c.line(-6.4, -12.8, 8, -13.2, 0.45), GOLD.light);
  c.fill(c.line(1, -31, 1, -14.5, 0.35), GOLD.dark);
  c.fill(
    c.path(
      [
        [-5, -20],
        [-2.4, -18.6],
        [0.4, -20.4],
        [3.2, -18.8],
        [6.4, -20.2],
      ],
      0.4,
    ),
    GOLD.dark,
  );
  c.fill(
    c.path(
      [
        [3, -30],
        [4.2, -27],
        [3.2, -25],
        [4.6, -22.6],
      ],
      0.24,
    ),
    GOLD.dark,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-29, -38, 14, 10, 2);
  // Wyliniałe skrzydła: lotki różnej długości, dwie złamane.
  for (const [x, y, radius] of [
    [-17, -35, 0.6],
    [-22.5, -28.5, 0.6],
    [-20, -22, 1.6],
    [-26, -12, 0.6],
    [-20.5, -4.5, 0.6],
    [-13, -1, 1.4],
  ] as const) {
    c.form(c.horn(-4, -18, x, y, 3, radius), FEATHER, { rag: 0.5 });
    c.fill(c.line(-4, -18, x, y, 0.26), FEATHER.dark, 0.7);
  }
  // Szaty warstwami, od dołu: suknia, komża, złota peleryna. Brzegi w strzępach.
  c.form(
    c.poly([
      [-7.6, -9],
      [7.6, -9],
      [9.6, 6],
      [7, 4],
      [4.6, 7.2],
      [2, 4.4],
      [-0.4, 7.6],
      [-3, 4.6],
      [-5.6, 7.2],
      [-9.6, 5],
    ]),
    ROBE_DARK,
    { rag: 0.45 },
  );
  const surplice = c.form(
    c.poly([
      [-7, -17],
      [7, -17],
      [9, -6],
      [6.4, -7.6],
      [4, -4.4],
      [1.4, -7.2],
      [-1.2, -4.4],
      [-3.8, -7.4],
      [-6.2, -4.8],
      [-9, -7],
    ]),
    p,
    { rag: 0.45 },
  );
  c.patches(surplice, p.shade, 0.22, 2.6, 0.85);
  const cape = c.form(
    c.poly([
      [-6, -24],
      [6, -24],
      [8.4, -14],
      [5.6, -15.6],
      [3, -12.6],
      [0.4, -15.4],
      [-2.2, -12.6],
      [-5, -15.6],
      [-8.4, -13.6],
    ]),
    GOLD,
    { rag: 0.4, rim: 0.35 },
  );
  c.patches(cape, GOLD.shade, 0.32, 2.4, 0.9);
  // Ciemny znak dziurki od klucza na piersi.
  c.fill(c.dot(1.2, -19.4, 1.25), GOLD.dark);
  c.fill(
    c.poly([
      [0.6, -19],
      [1.8, -19],
      [2.3, -16.4],
      [0.1, -16.4],
    ]),
    GOLD.dark,
  );
  return c.finish();
}

/** Kadzielnica na łańcuchu: w szczelinach tli się żar. */
function censer(p: Palette): PartCanvas {
  const c = partCanvas(-5, -3, 5, 14, 3);
  c.fill(c.line(0, 0, 0, 6, 0.3), GOLD.dark);
  c.form(
    union(
      c.dot(0, 8.6, 2.9),
      c.poly([
        [-1.6, 6.6],
        [0, 4.4],
        [1.6, 6.6],
      ]),
    ),
    GOLD,
    { rag: RAG_HARD, rim: 0.5 },
  );
  c.fill(c.line(-1.5, 8.2, 1.5, 8.2, 0.42), p.glow);
  c.fill(c.line(-1.1, 9.8, 1.1, 9.8, 0.36), p.glow, 0.8);
  return c.finish(0.6);
}

export function cardinalParts(): Record<string, PartCanvas> {
  const p = CARDINAL;
  return {
    thigh: ragThigh(ROBE_DARK),
    shin: ragShin(ROBE_DARK),
    torso: torso(p),
    upper: sleeveUpper(p),
    fore: sleeveFore(p),
    head: head(p),
    weapon: censer(p),
  };
}
