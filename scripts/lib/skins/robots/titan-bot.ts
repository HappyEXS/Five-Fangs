// Titan-bot: druga ewolucja Holo-bota, walczy wręcz; pancerz zatrzymuje dziesiątą część obrażeń.
// Garb z trójkątnych płyt pancerza na ciężkich nogach, a na długiej szyi łeb jak szczęki koparki:
// dwa rzędy stalowych zębów, z czoła sterczy ostrze, pod nim jedno małe oko (szkic autora:
// kopuła z trójkątów, płaski łeb z zębami i ostrzem na górze).
import { intersect, union } from '../../raster.ts';
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
import {
  AMBER,
  PAINT,
  PAINT_DARK,
  PALE_STEEL,
  plate,
  robot,
  rustStreak,
  SOOT_BLACK,
} from './palette.ts';

export const TITAN_BOT: Palette = robot(PAINT, AMBER);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-8, -29, 23, 8, 1);
  // Szyja z segmentów.
  for (const [x, y] of [
    [0, 2.4],
    [0.6, -0.6],
    [1.4, -3.4],
  ] as const) {
    c.form(c.box(x, y, 3.2, 1.3, 0.6), STEEL, HARD);
  }
  // Ostrze na czole.
  const horn = c.form(
    c.poly([
      [2.6, -10],
      [7.4, -10.4],
      [10.6, -27],
      [5.4, -19],
    ]),
    PALE_STEEL,
    { rag: 0.15, shadow: 0.9, rim: 0.6 },
  );
  rustStreak(c, horn, 5.6, -14, 4);
  // Dolna szczęka: uchylona, z siłownikiem przy zawiasie.
  const lower = c.poly([
    [-2.6, -2.6],
    [18.6, 0.6],
    [18, 3.6],
    [1, 4.4],
    [-3.4, 1.4],
  ]);
  plate(c, lower, PAINT_DARK, 0.3);
  // Gardziel i zęby.
  const maw = c.poly([
    [1, -5.6],
    [20, -4.6],
    [18.8, 0.4],
    [0.6, -2.4],
  ]);
  c.fill(maw, SOOT_BLACK);
  for (let i = 0; i < 7; i++) {
    const x = 4 + i * 2.4;
    c.ink(c.horn(x, -5.6, x + 0.3, -3 - (i % 2) * 0.5, 0.75, 0.12), STEEL.light, STEEL.dark);
    const y = -1.9 + i * 0.36;
    c.ink(c.horn(x + 1.2, y, x + 1, y - 2 + (i % 3) * 0.4, 0.7, 0.12), STEEL.light, STEEL.dark);
  }
  // Górna szczęka: płaski, kanciasty łeb.
  const upper = c.poly([
    [-4.6, -4.6],
    [-3, -10.6],
    [8, -11.6],
    [20.6, -8],
    [21, -4.6],
  ]);
  const inside = plate(c, upper, p, 0.28);
  c.fill(intersect(inside, c.line(-4, -6.2, 21, -6.2, 0.26)), p.dark, 0.85);
  for (const x of [0, 5, 10, 15]) rivet(c, x, -7.6 - (x > 8 ? -0.6 : 0.6));
  // Małe oko głęboko pod czołem.
  c.fill(intersect(inside, c.box(12.6, -8, 2.4, 0.9, 0.3)), SOOT_BLACK);
  c.fill(intersect(inside, c.dot(13.2, -8, 1.8)), p.glow, 0.22);
  c.fill(intersect(inside, c.dot(13.2, -8, 0.55)), p.glow);
  rustStreak(c, inside, 3, -8.6, 3.4);
  // Zawias szczęki.
  c.form(c.dot(-1, -3.4, 2.5), DARK_STEEL, HARD);
  c.fill(c.dot(-1, -3.4, 0.8), STEEL.light);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-18, -28, 15, 8, 2);
  // Garb: połowa kopuły, wyższy z tyłu.
  const hump = intersect(
    c.oval(-1.6, 3, 14.6, 28),
    c.poly([
      [-18, -28],
      [15, -28],
      [15, 5.4],
      [-18, 5.4],
    ]),
  );
  const inside = plate(c, hump, p, 0);
  // Siatka trójkątnych płyt: węzły w trzech rzędach.
  const rows: readonly (readonly Point[])[] = [
    [
      [-16.4, 5.4],
      [-9.6, 5.4],
      [-2.4, 5.4],
      [5, 5.4],
      [13.2, 5.4],
    ],
    [
      [-14.6, -4.6],
      [-6.6, -5.4],
      [1.4, -5.6],
      [9.6, -4.6],
    ],
    [
      [-11.6, -14],
      [-3, -15.4],
      [5.6, -14.4],
    ],
    [
      [-6.6, -21.6],
      [1.6, -22],
    ],
    [[-2, -25]],
  ];
  const triangles: Point[][] = [];
  for (let r = 0; r + 1 < rows.length; r++) {
    const low = rows[r] ?? [];
    const high = rows[r + 1] ?? [];
    for (let i = 0; i + 1 < low.length; i++) {
      const a = low[i];
      const b = low[i + 1];
      const top = high[Math.min(i, high.length - 1)];
      if (a !== undefined && b !== undefined && top !== undefined) triangles.push([a, b, top]);
    }
    for (let i = 0; i + 1 < high.length; i++) {
      const a = high[i];
      const b = high[i + 1];
      const bottom = low[i + 1];
      if (a !== undefined && b !== undefined && bottom !== undefined) {
        triangles.push([a, b, bottom]);
      }
    }
  }
  // Co któraś płyta jest ciemniejsza, wytarta do stali albo przerdzewiała.
  triangles.forEach((triangle, index) => {
    const face = intersect(inside, c.poly(triangle));
    const kind = (index * 7) % 5;
    if (kind === 0) c.fill(face, p.shade, 0.6);
    else if (kind === 2) c.fill(face, p.light, 0.3);
    else if (kind === 3) c.fill(face, STEEL.main, 0.55);
  });
  for (const triangle of triangles) {
    const [a, b, top] = triangle;
    if (a === undefined || b === undefined || top === undefined) continue;
    c.fill(intersect(inside, c.path([a, top, b, a], 0.3)), p.dark, 0.9);
  }
  c.patches(inside, RUST, 0.2, 2.6, 0.95);
  for (const row of rows) {
    for (const [x, y] of row) {
      if (y < 5) rivet(c, x, y);
    }
  }
  // Wyrwa w pancerzu: jednej płyty brakuje, pod nią ciemność.
  const missing = triangles[9];
  if (missing !== undefined) {
    const hole = intersect(inside, c.poly(missing));
    c.fill(hole, SOOT_BLACK);
    c.fill(intersect(hole, c.dot(-2, -9, 2.4)), p.glow, 0.14);
  }
  rustStreak(c, inside, -9.6, -3, 5.4);
  rustStreak(c, inside, 6, -12, 5);
  // Rama u podstawy garbu.
  plate(c, c.box(-1.6, 5.2, 14.4, 1.6, 0.6), DARK_STEEL, 0.4);
  return c.finish();
}

/** Kolec na pięści: Titan-bot bije łbem, ręce tylko podpierają. */
function knuckle(): PartCanvas {
  const c = partCanvas(-3, -2, 3, 7, 3);
  c.ink(union(c.horn(0, 0, 0, 5, 1.4, 0.2), c.dot(0, 0, 1.4)), STEEL.light, STEEL.dark);
  return c.finish();
}

export function titanBotParts(): Record<string, PartCanvas> {
  const p = TITAN_BOT;
  return {
    thigh: metalThigh(p, 1.35),
    shin: metalShin(p, 'heavy', 1.3),
    torso: torso(p),
    upper: metalUpper(p, 1.25),
    fore: metalFore(p, 'stub', 1.3),
    head: head(p),
    weapon: knuckle(),
  };
}
