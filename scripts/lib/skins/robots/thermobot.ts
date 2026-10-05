// Thermobot: druga ewolucja Egzo-bota, strzelec. Chodzący piec: okopcony okrągły hełm z jedną
// rozżarzoną szczeliną, kopulasty kocioł z uchylonymi drzwiczkami paleniska, z komina i dysz
// w dłoniach strzelają płomienie (szkic autora: okrągła głowa ze szczeliną, kopuła, wokół ogień).
import { intersect, union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas, STEEL } from '../kit.ts';
import {
  DARK_STEEL,
  HARD,
  metalFore,
  metalShin,
  metalThigh,
  metalUpper,
  rivet,
} from '../limbs-robots.ts';
import { BRASS, plate, robot, rustStreak, SCORCHED, SOOT_BLACK, seam, visor } from './palette.ts';

const FIRE = '#e8742a';
const FIRE_CORE = '#f6c35a';
const FIRE_INK = '#5a1c0a';

export const THERMOBOT: Palette = robot(SCORCHED, '#f79a3a');

/** Płomień od nasady do czubka: brudny pomarańcz, jaśniejszy rdzeń. */
function flame(c: PartCanvas, x: number, y: number, tx: number, ty: number, width: number): void {
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  const shape = union(
    c.horn(x, y, tx, ty, width, 0.2),
    c.horn(x - width * 0.5, y, mx - width * 0.9, my, width * 0.6, 0.15),
    c.horn(x + width * 0.5, y, mx + width * 0.8, my + (ty - y) * 0.1, width * 0.6, 0.15),
  );
  c.fill(c.dot(mx, my, width * 2.2), FIRE, 0.14);
  c.ink(shape, FIRE, FIRE_INK);
  c.fill(c.horn(x, y, x + (tx - x) * 0.55, y + (ty - y) * 0.55, width * 0.5, 0.15), FIRE_CORE);
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-13, -27, 13, 5, 1);
  // Komin na potylicy, z niego płomień.
  flame(c, -5.6, -17.6, -7.6, -25.4, 1.9);
  c.form(c.line(-4.4, -12, -5.6, -17.4, 1.7), DARK_STEEL, HARD);
  // Kryza i hełm.
  plate(c, c.box(0.4, 1, 4, 1.8, 0.8), DARK_STEEL, 0.3);
  const inside = plate(c, c.oval(0.8, -7.4, 7.8, 8), p, 0.2);
  // Sadza wokół szczeliny i na czubku.
  c.patches(inside, SOOT_BLACK, 0.22, 2.8, 0.6);
  seam(c, inside, [
    [-6.6, -10.6],
    [-1, -12],
    [8.4, -10.6],
  ]);
  for (const x of [-4.4, -0.6, 3.2, 6.6]) rivet(c, x, -13.2 + Math.abs(x - 1) * 0.3);
  visor(c, inside, [1, -7], [8.8, -7], 1.05, p.glow);
  c.fill(intersect(inside, c.oval(5.4, -7, 5, 2.6)), p.glow, 0.12);
  rustStreak(c, inside, 2.6, -5.6, 4);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-18, -33, 14, 8, 2);
  // Rura wydechowa na plecach, z płomieniem.
  flame(c, -11.6, -22.6, -13.2, -30.6, 1.8);
  c.form(
    c.path(
      [
        [-8, -12],
        [-11.4, -15],
        [-11.6, -22.4],
      ],
      1.6,
    ),
    DARK_STEEL,
    HARD,
  );
  // Kocioł: kopuła na szerokiej podstawie.
  const boiler = union(c.oval(0, -8.6, 10.4, 12.4), c.box(0, -1, 10.4, 5.4, 2.4));
  const inside = plate(c, boiler, p, 0.22);
  c.patches(inside, SOOT_BLACK, 0.2, 3, 0.55);
  // Obręcz kotła z nitami.
  const band = intersect(inside, c.box(0, -1.4, 14, 1.1, 0));
  c.fill(band, STEEL.dark);
  c.fill(intersect(inside, c.box(0, -1.5, 14, 0.6, 0)), STEEL.shade);
  for (const x of [-7.6, -3.8, 0, 3.8, 7.6])
    c.fill(intersect(inside, c.dot(x, -1.5, 0.45)), STEEL.light);
  // Uchylone drzwiczki paleniska: ruszt i żar.
  const door = intersect(inside, c.box(3.6, -9.6, 4.2, 4.6, 1.2));
  c.fill(door, SOOT_BLACK);
  c.fill(intersect(door, c.oval(3.6, -7.4, 3.6, 2.6)), FIRE, 0.75);
  c.fill(intersect(door, c.oval(3.8, -6.8, 2.2, 1.4)), FIRE_CORE, 0.9);
  for (const x of [1.2, 3.6, 6]) c.fill(intersect(door, c.line(x, -14, x, -5, 0.42)), SOOT_BLACK);
  c.fill(intersect(inside, c.oval(3.6, -9.6, 6.6, 7)), p.glow, 0.08);
  // Manometr z pękniętym szkłem.
  c.form(c.dot(-4.6, -12.6, 2.4), BRASS, { rag: 0.15, shadow: 0.7, rim: 0.4 });
  c.fill(c.dot(-4.6, -12.6, 1.5), '#c9c3ad');
  c.fill(c.line(-4.6, -12.6, -3.6, -13.6, 0.22), SOOT_BLACK);
  rustStreak(c, inside, -4.6, -10.2, 5);
  rustStreak(c, inside, -8, -1, 3.6);
  return c.finish();
}

/** Płomyk pilotujący u wylotu dyszy. */
function pilot(): PartCanvas {
  const c = partCanvas(-5, -2, 5, 12, 3);
  flame(c, 0, 0.8, 0.4, 10, 2);
  return c;
}

export function thermobotParts(): Record<string, PartCanvas> {
  const p = THERMOBOT;
  return {
    thigh: metalThigh(p, 1.1),
    shin: metalShin(p, 'pad', 1.1),
    torso: torso(p),
    upper: metalUpper(p, 1.1),
    fore: metalFore(p, 'nozzle', 1.15),
    head: head(p),
    weapon: pilot(),
  };
}
