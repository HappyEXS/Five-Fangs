// Whirl-bot: druga ewolucja Holo-bota, walczy wręcz, najszybszy w grze; unika siedmiu ciosów
// na dziesięć. Maska jak ptasia czaszka ze spiralą zamiast oka i zębatym dziobem, wąski korpus
// z segmentów zwężający się do wirującej tarczy, na której sunie tuż nad ziemią; zamiast rąk
// dwa długie ostrza (szkic autora: głowa ze spiralą i dziobem, tors z płyt, ostrza do ziemi,
// tarcza pod spodem).
import { intersect, union } from '../../raster.ts';
import { type Palette, type PartCanvas, type Point, partCanvas, RUST, STEEL } from '../kit.ts';
import { DARK_STEEL, HARD, metalUpper, rivet } from '../limbs-robots.ts';
import {
  BRASS,
  CYAN,
  PAINT,
  PAINT_DARK,
  PALE_STEEL,
  plate,
  robot,
  rustStreak,
  SOOT_BLACK,
  seam,
} from './palette.ts';

export const WHIRL_BOT: Palette = robot(PAINT, CYAN);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-10, -20, 21, 6, 1);
  // Segmentowa szyja.
  for (const y of [-0.4, 1.6]) c.form(c.box(0.2, y, 2.4, 1, 0.5), STEEL, HARD);
  // Dziób: długi, zakrzywiony w dół, z zębami piły od spodu.
  const beak = union(
    c.arc([4, -7], [13, -8.4], [19.4, -1.6], 3.4, 0.5),
    c.horn(5, -4.6, 15.4, -1.6, 1.8, 0.4),
  );
  const beakInside = c.form(beak, PALE_STEEL, { rag: 0.15, shadow: 0.8, rim: 0.5 });
  c.fill(intersect(beakInside, c.arc([5.4, -4.6], [12, -5.6], [18.6, -1.8], 0.3, 0.2)), SOOT_BLACK);
  for (const [x, y] of [
    [7.4, -4.6],
    [9.6, -4.6],
    [11.8, -4.2],
    [13.8, -3.6],
    [15.6, -2.8],
  ] as const) {
    c.fill(intersect(beakInside, c.horn(x, y, x + 0.4, y + 1.7, 0.6, 0.1)), SOOT_BLACK);
  }
  c.patches(beakInside, RUST, 0.16, 2, 0.95);
  // Czaszka z jasnej, wytartej blachy.
  const skull = plate(c, c.oval(0.6, -8.4, 7.2, 7.6), PALE_STEEL, 0.14);
  seam(c, skull, [
    [-5.4, -4.4],
    [-2, -3.2],
    [2.4, -3.6],
  ]);
  // Ciemny czepiec na potylicy.
  const cap = plate(
    c,
    intersect(
      c.oval(0.6, -8.4, 7.8, 8.2),
      c.poly([
        [-9, -18],
        [8, -18],
        [5, -13.6],
        [-4.6, -9.6],
        [-9, -3],
      ]),
    ),
    PAINT_DARK,
    0.3,
  );
  rustStreak(c, cap, -3.4, -12, 3);
  // Oko: ciemny oczodół, w nim spirala światła.
  const ex = 1.6;
  const ey = -7.6;
  c.fill(c.dot(ex, ey, 3.5), SOOT_BLACK);
  c.fill(c.dot(ex, ey, 3.3), p.glow, 0.12);
  const spiral: Point[] = [];
  for (let i = 0; i <= 26; i++) {
    const angle = i * 0.52;
    const radius = 0.25 + i * 0.105;
    spiral.push([ex + Math.cos(angle) * radius, ey + Math.sin(angle) * radius]);
  }
  c.fill(c.path(spiral, 0.26), p.glow, 0.95);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-15, -26, 15, 28, 2);
  // Kręgosłup i ostrze, na którym stoi.
  c.form(c.line(0, -12, 0, 17, 1.3), STEEL, HARD);
  c.form(c.horn(0, 20, 0, 25, 1.5, 0.3), DARK_STEEL, HARD);
  // Segmenty odwłoka, coraz węższe.
  for (const [y, half] of [
    [-8.6, 5.2],
    [-3.8, 4.4],
    [1, 3.6],
    [5.6, 2.9],
    [10, 2.3],
    [14, 1.8],
  ] as const) {
    plate(c, c.box(0, y, half, 1.9, 0.9), PAINT_DARK, 0.3);
  }
  // Pierś z płyt.
  const chest = c.poly([
    [-6.6, -23.6],
    [6.6, -23.6],
    [7.4, -17.6],
    [5, -11],
    [-5, -11],
    [-7.4, -17.6],
  ]);
  const inside = plate(c, chest, p, 0.28);
  seam(c, inside, [
    [-0.4, -23],
    [0.6, -19],
    [-0.6, -15],
    [0.4, -11.4],
  ]);
  seam(c, inside, [
    [-6.6, -17.4],
    [-0.4, -19],
    [6.6, -17.4],
  ]);
  rivet(c, -4.4, -21.4);
  rivet(c, 4.4, -21.4);
  rustStreak(c, inside, 3.6, -16.6, 4);
  // Wirująca tarcza: mosiężne ogniwa na ciemnym kole.
  const disc = c.form(c.oval(0, 19.6, 12.4, 2.9), DARK_STEEL, HARD);
  for (let i = 0; i < 9; i++) {
    const x = -10 + i * 2.5;
    c.fill(intersect(disc, c.oval(x, 19.4, 1, 1.5)), BRASS.dark);
    c.fill(intersect(disc, c.oval(x, 19.3, 0.7, 1.1)), i % 3 === 1 ? BRASS.shade : BRASS.main);
  }
  // Smugi ruchu po bokach tarczy.
  c.fill(c.line(-14.2, 18.8, -12.6, 18.8, 0.22), p.glow, 0.5);
  c.fill(c.line(12.6, 20.4, 14.2, 20.4, 0.22), p.glow, 0.5);
  return c.finish();
}

/** Ostrze zamiast przedramienia: długie, zakrzywione jak kosa, wyszczerbione. */
function blade(): PartCanvas {
  const c = partCanvas(-7, -5, 9, 28, 4);
  const edge = c.arc([0, 0], [-3, 13], [5, 25.4], 2.6, 0.3);
  const inside = c.form(edge, PALE_STEEL, { rag: 0.14, shadow: 0.9, rim: 0.6 });
  c.patches(intersect(inside, c.box(0, 3, 6, 5, 0)), RUST, 0.5, 2.2, 0.95);
  c.patches(inside, RUST, 0.12, 2, 0.95);
  c.fill(intersect(inside, c.arc([0.2, 2], [-2, 13], [4, 22.6], 0.2, 0.2)), SOOT_BLACK, 0.5);
  c.form(c.dot(0, 0, 2.3), STEEL, HARD);
  c.fill(c.dot(0, 0, 0.8), STEEL.dark);
  return c.finish();
}

/** Błysk na krawędzi ostrza. */
function gleam(): PartCanvas {
  const c = partCanvas(-2, -2, 2, 2, 5);
  c.fill(c.dot(0, 0, 1), '#dfe4e8');
  return c;
}

/**
 * Regulator odśrodkowy zamiast nóg: dwa pręty z mosiężnymi ciężarkami wiszą przy kręgosłupie
 * i rozchylają się, gdy robot nabiera prędkości (udo i goleń szkieletu).
 */
function governorRod(): PartCanvas {
  const c = partCanvas(-2, -2, 2, 13, 6);
  c.fill(c.line(0, 0, 0, 11, 0.55), STEEL.dark);
  c.fill(c.line(-0.1, 0.4, -0.1, 10.6, 0.2), STEEL.main);
  return c;
}

function governorWeight(): PartCanvas {
  const c = partCanvas(-3, -3, 3, 4, 7);
  c.form(c.dot(0, 0.6, 1.9), BRASS, { rag: 0.15, shadow: 0.7, rim: 0.4 });
  return c.finish(0.5);
}

export function whirlBotParts(): Record<string, PartCanvas> {
  const p = WHIRL_BOT;
  return {
    thigh: governorRod(),
    shin: governorWeight(),
    torso: torso(p),
    upper: metalUpper(p, 0.85),
    fore: blade(),
    head: head(p),
    weapon: gleam(),
  };
}
