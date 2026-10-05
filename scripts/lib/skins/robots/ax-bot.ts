// Ax-bot: druga ewolucja Egzo-bota, walczy wręcz; co piąty cios zadaje podwójne obrażenia.
// Kat w żelaznym hełmie z klinowym wizjerem, przez który widać jeden czerwony punkt; napierśnik
// spękany na wskroś, z pęknięć bije żar. W kleszczach topór o dwóch wyszczerbionych ostrzach
// (szkic autora: hełm z trójkątnym wizjerem, spękany tors, wielki dwustronny topór).
import { intersect, subtract, union } from '../../raster.ts';
import { type Palette, type PartCanvas, type Point, partCanvas, RUST, STEEL } from '../kit.ts';
import {
  DARK_STEEL,
  HARD,
  metalFore,
  metalShin,
  metalThigh,
  metalUpper,
  rivet,
} from '../limbs-robots.ts';
import { PAINT_DARK, PALE_STEEL, plate, robot, rustStreak, SOOT_BLACK, seam } from './palette.ts';

const EXECUTIONER_RED = '#f0553a';

export const AX_BOT: Palette = robot(PAINT_DARK, EXECUTIONER_RED);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-11, -22, 15, 5, 1);
  plate(c, c.box(0.4, 1, 4.2, 1.8, 0.8), DARK_STEEL, 0.3);
  // Hełm z grzebieniem.
  c.form(c.arc([-6, -11], [0, -20.6], [7, -12.6], 0.9, 0.9), DARK_STEEL, HARD);
  const dome = union(c.oval(0.4, -8, 7.6, 8.2), c.box(1, -2.6, 6.4, 3.2, 1.6));
  const inside = plate(c, dome, p, 0.26);
  seam(c, inside, [
    [-4.4, -15],
    [-5.6, -9],
    [-4.6, -2],
  ]);
  rivet(c, -6, -11);
  rivet(c, -6.2, -5.4);
  // Klinowy wizjer: ostrze wysunięte przed twarz, w szczelinie jeden czerwony punkt.
  const wedge = c.poly([
    [-1.6, -12.4],
    [12.6, -7.4],
    [-1.6, -2.6],
  ]);
  const visorInside = plate(c, wedge, PALE_STEEL, 0.22);
  c.fill(intersect(visorInside, c.horn(0.4, -7.5, 10.4, -7.4, 1, 0.3)), SOOT_BLACK);
  c.fill(intersect(visorInside, c.dot(4.4, -7.5, 2.4)), p.glow, 0.25);
  c.fill(intersect(visorInside, c.dot(4.4, -7.5, 0.62)), p.glow);
  rustStreak(c, visorInside, 2.6, -5.6, 2.6);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-14, -27, 14, 9, 2);
  // Napierśnik rozszerzający się ku dołowi, jak opończa z blachy.
  const cuirass = c.poly([
    [-5.4, -23.6],
    [5.4, -23.6],
    [8.6, -14],
    [10.8, -2],
    [9.2, 5.6],
    [-9.2, 5.6],
    [-10.8, -2],
    [-8.6, -14],
  ]);
  const inside = plate(c, cuirass, p, 0.26);
  // Pęknięcia na wskroś: w najgłębszym tli się żar.
  const cracks: readonly (readonly Point[])[] = [
    [
      [-1.6, -22],
      [0.6, -16.4],
      [-1.4, -12],
      [1.8, -7],
      [0.2, -2.4],
      [2.6, 4],
    ],
    [
      [0.6, -16.4],
      [4.6, -13.4],
      [6.4, -9],
    ],
    [
      [-1.4, -12],
      [-5.6, -9.4],
      [-7.4, -4.6],
    ],
    [
      [1.8, -7],
      [6, -3.6],
      [7.4, 1.4],
    ],
    [
      [0.2, -2.4],
      [-3.6, 0.6],
    ],
  ];
  const main = cracks[0];
  if (main !== undefined) {
    c.fill(intersect(inside, c.path(main, 1.1)), p.glow, 0.16);
    c.fill(intersect(inside, c.path(main, 0.52)), SOOT_BLACK);
    c.fill(intersect(inside, c.path(main.slice(1, 5), 0.18)), p.glow, 0.85);
  }
  for (const crack of cracks.slice(1)) seam(c, inside, crack, 0.32);
  // Ryngraf pod szyją.
  const gorget = plate(c, c.box(0, -22, 5, 1.7, 0.7), DARK_STEEL, 0.35);
  rustStreak(c, inside, -6.4, -3, 5);
  rustStreak(c, gorget, 3, -22, 2);
  rivet(c, -7.6, 3.4);
  rivet(c, 7.6, 3.4);
  return c.finish();
}

/** Topór o dwóch ostrzach: wyszczerbiony, z otworami wzdłuż krawędzi, zardzewiały u nasady. */
function axe(): PartCanvas {
  const c = partCanvas(-14, -10, 14, 33, 3);
  c.form(c.line(0, -5.6, 0, 30, 1.15), DARK_STEEL, HARD);
  c.form(c.dot(0, -6, 1.7), STEEL, HARD);
  const blade = (side: 1 | -1): void => {
    const chips = union(c.dot(side * 12.6, 16.6, 1.2), c.dot(side * 11.2, 25.6, 1));
    const shape = subtract(
      c.poly([
        [side * 0.8, 15],
        [side * 6.4, 13.6],
        [side * 9.4, 9.4],
        [side * 12.4, 14.6],
        [side * 13, 20],
        [side * 12, 25.6],
        [side * 8.8, 30.6],
        [side * 6.2, 26.4],
        [side * 0.8, 25],
      ]),
      chips,
    );
    const inside = c.form(shape, PALE_STEEL, { rag: 0.15, shadow: 0.9, rim: 0.6 });
    c.patches(intersect(inside, c.box(side * 3, 20, 3.4, 8, 0)), RUST, 0.5, 2.2, 0.95);
    c.patches(inside, RUST, 0.14, 2, 0.95);
    // Otwory wzdłuż ostrza.
    for (const [x, y] of [
      [8.6, 15],
      [9.6, 20],
      [8.6, 25],
    ] as const) {
      c.fill(c.oval(side * x, y, 0.9, 1.3), SOOT_BLACK);
    }
  };
  blade(1);
  blade(-1);
  // Okucie, które trzyma ostrza na trzonku.
  plate(c, c.box(0, 20, 2.2, 6, 0.8), DARK_STEEL, 0.4);
  rivet(c, 0, 16.4);
  rivet(c, 0, 23.6);
  return c.finish();
}

export function axBotParts(): Record<string, PartCanvas> {
  const p = AX_BOT;
  return {
    thigh: metalThigh(p, 1.1),
    shin: metalShin(p, 'heavy', 1),
    torso: torso(p),
    upper: metalUpper(p, 1.15),
    fore: metalFore(p, 'clamp', 1.1),
    head: head(p),
    weapon: axe(),
  };
}
