// Bot: forma bazowa szczepu Robots, walczy wręcz. Poobijana kula na cienkich nóżkach: jedno
// wielkie szklane oko pod ciężką stalową powieką, dziób jak dysza, na czubku pogięta antena
// z dogorywającą żarówką, pod spodem zębata płyta (szkic autora: kula z okiem, dziobem i anteną).
//
// Na szkielecie ludzi kulą jest „głowa”: wisi pod stawem szyi, więc przy dziobnięciu cała się
// wychyla. Tułów to widełki, w których kula siedzi, a ramię to powieka nad okiem.
import { intersect } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas, STEEL } from '../kit.ts';
import { DARK_STEEL, HARD, metalShin, metalThigh, rivet } from '../limbs-robots.ts';
import {
  AMBER,
  BRASS,
  lens,
  PAINT,
  PAINT_DARK,
  plate,
  robot,
  rustStreak,
  seam,
} from './palette.ts';

export const BOT: Palette = robot(PAINT, AMBER);

/** Środek kuli w układzie szyi: wisi tuż pod nią. */
const CX = 1;
const CY = 9;
const R = 10.5;

function head(p: Palette): PartCanvas {
  const c = partCanvas(-13, -18, 25, 25, 1);
  // Antena: pogięty drut, żarówka ledwie się żarzy.
  c.fill(
    c.path(
      [
        [-1, 0],
        [-1.8, -6],
        [-0.4, -9.6],
        [-1.4, -13],
      ],
      0.42,
    ),
    STEEL.dark,
  );
  c.fill(c.dot(-1.4, -14.2, 2.8), p.glow, 0.16);
  c.form(c.dot(-1.4, -14.2, 1.7), BRASS, { rag: 0.15, shadow: 0.6 });
  c.fill(c.dot(-1.1, -14.4, 0.7), p.glow);
  // Zębata płyta pod spodem.
  c.form(
    c.poly([
      [2, 16],
      [4, 23],
      [5.8, 18.6],
      [8, 22.4],
      [9.4, 17],
      [11.6, 20.4],
      [11.2, 12],
    ]),
    DARK_STEEL,
    HARD,
  );
  // Dziób: stalowa dysza na przegubie.
  c.form(c.horn(10, 11.4, 22, 12.8, 3, 1.5), STEEL, HARD);
  c.fill(c.oval(22.2, 12.8, 0.8, 1.3), STEEL.dark);
  c.form(c.dot(11, 11.4, 2.7), DARK_STEEL, HARD);
  // Kula: szew z nitami, obita farba, zacieki rdzy.
  const inside = plate(c, c.dot(CX, CY, R), p, 0.3);
  c.patches(inside, STEEL.main, 0.1, 2.6, 0.9);
  seam(c, inside, [
    [-3, -1.5],
    [-5.6, 4],
    [-5.8, 12],
    [-3.4, 19.5],
  ]);
  for (const [x, y] of [
    [-6.6, 3],
    [-7.4, 8],
    [-6.8, 13.4],
  ] as const) {
    rivet(c, x, y);
  }
  rustStreak(c, inside, -6.6, 3.6, 5);
  rustStreak(c, inside, 3, 14, 5.4);
  // Wgniecenie.
  c.fill(intersect(inside, c.oval(-3.4, 15.4, 2.6, 1.8)), p.dark, 0.35);
  lens(c, 4.6, CY, 5, p.glow);
  // Pęknięte szkło.
  c.fill(
    c.path(
      [
        [2.2, 6.4],
        [4, 8.4],
        [3.4, 10],
        [5.2, 12.4],
      ],
      0.16,
    ),
    '#c5cbd1',
    0.55,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-13, -15, 15, 5, 2);
  // Widełki obejmują kulę od spodu.
  c.form(c.arc([-10.5, -11], [1, 3.6], [12.5, -11], 1.4, 1.4), STEEL, HARD);
  plate(c, c.box(0.4, 0.4, 3.8, 2.6, 1), p, 0.35);
  rivet(c, 0.4, 0.4);
  return c.finish();
}

/** Stalowa powieka: ramię szkieletu, więc przy dziobnięciu unosi się i oko otwiera się szerzej. */
function lid(): PartCanvas {
  const c = partCanvas(-13, -7, 13, 8, 3);
  // Bark leży 6 jednostek nad środkiem kuli.
  const dome = c.dot(0, 6, R + 0.7);
  const shape = intersect(
    dome,
    c.poly([
      [-13, -7],
      [13, -7],
      [13, 1.6],
      [-13, 4.6],
    ]),
  );
  const inside = plate(c, shape, PAINT_DARK, 0.4);
  c.fill(intersect(dome, c.line(-12, 4.5, 12, 1.6, 0.5)), STEEL.dark);
  rivet(c, -6.4, 1.4);
  rivet(c, 0, 0.4);
  rivet(c, 6.4, -0.6);
  rustStreak(c, inside, 0, 1, 3);
  return c.finish();
}

/** Luźne nity na blasze: przedramię i broń szkieletu, których kula nie ma. */
function looseRivet(salt: number): PartCanvas {
  const c = partCanvas(-2, -2, 2, 2, salt);
  c.fill(c.dot(0, 0, 1), STEEL.dark);
  c.fill(c.dot(-0.2, -0.2, 0.45), STEEL.light);
  return c;
}

export function botParts(): Record<string, PartCanvas> {
  const p = BOT;
  return {
    thigh: metalThigh(p, 0.7),
    shin: metalShin(p, 'spike', 0.75),
    torso: torso(p),
    upper: lid(),
    fore: looseRivet(4),
    head: head(p),
    weapon: looseRivet(5),
  };
}
