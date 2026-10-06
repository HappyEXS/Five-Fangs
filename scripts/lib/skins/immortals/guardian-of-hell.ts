// Guardian of hell: pierwsza ewolucja Orba, walczy wręcz. Żylasty, czarny jak sadza strażnik
// w trójkątnej żelaznej masce z jednym okrągłym otworem, za którym tli się żar; na masce dwa
// wielkie rogi wygięte jak szczęki klucza, na plecach podarte skrzydło (szkic autora).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE_SHADE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';
import { ASH, GOLD, SOOT } from './palette.ts';

export const GUARDIAN: Palette = { ...SOOT, accent: GOLD.main, glow: '#ff7a3a' };
/** Błona skrzydła: ciemny, zaśniedziały brąz. */
const MEMBRANE = { main: '#3f2f1c', shade: '#211809', dark: SOOT.dark, light: '#6a5230' };

/** Róg jak szczęka klucza: półksiężyc otwarty ku górze, osadzony na masce. */
function crescentHorn(c: PartCanvas, cx: number, cy: number): void {
  const horn = subtract(
    c.dot(cx, cy, 6.6),
    union(c.dot(cx, cy - 3.4, 5.3), c.box(cx, cy - 8.4, 2.6, 3, 0)),
  );
  const inside = c.form(horn, GOLD, { rag: RAG_HARD, rim: 0.5 });
  c.patches(inside, GOLD.shade, 0.35, 2.4, 0.9);
  c.fill(
    intersect(
      inside,
      c.path(
        [
          [cx - 4.6, cy + 1.5],
          [cx - 3.4, cy + 3.2],
          [cx - 4, cy + 5],
        ],
        0.24,
      ),
    ),
    GOLD.dark,
  );
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-17, -36, 20, 6, 1);
  crescentHorn(c, -4.4, -23.6);
  crescentHorn(c, 7.4, -23.6);
  // Maska: odwrócony trójkąt z kutego żelaza, porysowany.
  const mask = c.poly([
    [-9, -18.5],
    [12, -18.5],
    [1.6, 3],
  ]);
  const inside = c.form(mask, p, { rag: 0.3, rim: 0.4 });
  c.fill(intersect(inside, c.line(-6, -15, 0, -3.5, 0.25)), p.light, 0.8);
  c.fill(intersect(inside, c.line(8.5, -16, 5, -9, 0.25)), p.light, 0.8);
  c.patches(inside, '#4a2a18', 0.16, 2.4, 0.9);
  // Jedyny otwór: złota obręcz, w środku żar.
  c.fill(c.dot(1.6, -11.2, 4), GOLD.dark);
  c.fill(c.dot(1.6, -11.2, 3.4), GOLD.shade);
  c.fill(c.dot(1.6, -11.2, 2.7), '#050302');
  c.fill(c.dot(2, -11.2, 2.3), p.glow, 0.3);
  c.fill(c.dot(2.1, -11.2, 1.25), p.glow);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-28, -37, 13, 8, 2);
  // Skrzydło: podarta błona między trzema palcami.
  const root = [-3, -19] as const;
  const tips = [
    [-12, -32],
    [-23, -27],
    [-25.5, -15],
  ] as const;
  const membrane = subtract(
    c.poly([root, tips[0], tips[1], tips[2], [-8, -8]]),
    union(
      c.dot(-18.5, -33, 4.6),
      c.dot(-27.5, -21.5, 4.6),
      c.dot(-19, -9.5, 7.2),
      c.dot(-15.5, -22, 1.9),
      c.dot(-10.5, -15, 1.2),
    ),
  );
  c.form(membrane, MEMBRANE, { shadow: 0.7 });
  for (const [x, y] of tips) {
    c.fill(c.horn(root[0], root[1], x, y, 0.9, 0.45), p.dark);
    c.ink(c.horn(x, y, x - 1.2, y - 3, 1, 0.2), BONE_SHADE, p.dark);
  }
  const body = c.oval(0, -11.5, 7.4, 13);
  const inside = c.form(body, p);
  for (const y of [-14, -10.5, -7]) {
    c.fill(
      intersect(inside, c.arc([0.6, y], [3.8, y + 1.8], [6.8, y - 0.2], 0.32, 0.32)),
      p.light,
      0.7,
    );
  }
  // Złoty napierśnik pod szyją i strzęp przepaski na biodrach.
  const gorget = c.form(c.box(1, -20.6, 6.6, 2.7, 1.3), GOLD, { rag: RAG_HARD, rim: 0.5 });
  c.patches(gorget, GOLD.shade, 0.35, 2.2, 0.9);
  c.form(
    c.poly([
      [-6.2, -2.4],
      [6.6, -2.4],
      [5.2, 5.2],
      [2.6, 3],
      [0, 5.8],
      [-2.6, 3.2],
      [-5.6, 5.4],
    ]),
    { main: ASH.shade, shade: '#2c271e', dark: p.dark, light: ASH.main },
    { rag: 0.45 },
  );
  return c.finish();
}

export function guardianParts(): Record<string, PartCanvas> {
  const p = GUARDIAN;
  return {
    thigh: fleshThigh(p, 0.95),
    shin: fleshShin(p, 'hoof', 0.95),
    torso: torso(p),
    upper: fleshUpper(p, 0.95),
    fore: fleshFore(p, 'paw', 0.95),
    head: head(p),
    weapon: claws(p, 9.5, 1.2),
  };
}
