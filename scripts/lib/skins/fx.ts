// Pociski czterech szczepów i znak uniku. Pociski lecą w prawo, pivot w środku, jak strzała.
import { PIXELS_PER_UNIT } from '../part-spec.ts';
import { inset, union } from '../raster.ts';
import { BONE, BONE_SHADE, type PartCanvas, type Point, partCanvas } from './kit.ts';

const INK = '#26150f';

/** Kieł wypluwany przez Batfanga. */
function fang(): PartCanvas {
  const c = partCanvas(-9, -4, 9, 4);
  c.fill(c.horn(-8, 0, -1, 0, 0.3, 1.2), '#ffffff', 0.35);
  c.ink(c.arc([-3, -0.6], [3, -2.2], [8, 0.6], 2.2, 0.25), BONE, INK);
  return c;
}

/** Kolec Spikera: kościany, z ciemnym czubkiem. */
function spike(): PartCanvas {
  const c = partCanvas(-12, -3, 12, 3);
  c.ink(c.horn(-9.5, 0, 10, 0, 1.7, 0.2), BONE, INK);
  c.fill(c.horn(4, 0, 10, 0, 0.6, 0.1), '#5b3a1c');
  return c;
}

/** Kula ognia Ignitixa z ogonem płomienia. */
function fireball(): PartCanvas {
  const c = partCanvas(-14, -7, 10, 7);
  const flame = union(
    c.dot(2.5, 0, 5.4),
    c.horn(1, -1.5, -11.5, -3.6, 4, 0.3),
    c.horn(1, 1.2, -10, 3.4, 4, 0.3),
    c.horn(1, 0, -12.5, 0, 4.4, 0.4),
  );
  c.ink(flame, '#f26a1b', '#7a1f0a');
  c.fill(union(c.dot(3, 0, 3.6), c.horn(2, 0, -7, 0, 2.8, 0.3)), '#ffd166');
  c.fill(c.dot(3.6, -0.2, 1.7), '#fff6d8');
  return c;
}

/**
 * Znak uniku nad postacią: dwa łuki jak ślad uskoku, w kolorach liczby życia (papier i atrament
 * interfejsu, ADR 0015).
 */
function dodgeMark(): PartCanvas {
  const c = partCanvas(-9, -6, 9, 5);
  const mark = union(
    c.arc([-6.5, 2.5], [0, -7.5], [6.5, 2.5], 1, 0.8),
    c.arc([-3.2, 3], [0, -1.6], [3.2, 3], 0.75, 0.6),
  );
  c.fill(inset(mark, -0.9 * PIXELS_PER_UNIT), '#241f3d');
  c.fill(mark, '#efe6cf');
  return c;
}

// Immortals: zmatowiałe złoto i blade światło.

/** Spojrzenie Orba i Cardinala: oko ze światła z pionową źrenicą. */
function gaze(): PartCanvas {
  const c = partCanvas(-13, -4, 8, 4);
  c.fill(c.horn(-11.5, 0, 0, 0, 0.3, 2.2), '#e8cf7a', 0.3);
  const eye = c.poly([
    [-3.4, 0],
    [1.4, -2.9],
    [6.6, 0],
    [1.4, 2.9],
  ]);
  c.ink(eye, '#d9bb5c', '#2a1c08');
  c.fill(c.oval(2, 0, 0.8, 1.9), '#2a1c08');
  return c;
}

/** Odłamek gwiazdy Polarisa: cztery ramiona, najdłuższe w kierunku lotu. */
function star(): PartCanvas {
  const c = partCanvas(-12, -6, 10, 6);
  c.fill(c.horn(-10.5, 0, -1, 0, 0.3, 1.8), '#f4e9b8', 0.3);
  c.fill(c.dot(1, 0, 4.6), '#f4e9b8', 0.18);
  const shard = c.poly([
    [-4.4, 0],
    [-0.2, -1.2],
    [1, -4.8],
    [2.2, -1.2],
    [8.6, 0],
    [2.2, 1.2],
    [1, 4.8],
    [-0.2, 1.2],
  ]);
  c.ink(shard, '#f4e9b8', '#3a2a0c');
  c.fill(c.dot(1, 0, 0.9), '#ffffff');
  return c;
}

/** Promień Ultimusa: włócznia światła, gruba z przodu. */
function ray(): PartCanvas {
  const c = partCanvas(-19, -4, 15, 4);
  c.fill(c.horn(-17, 0, 11, 0, 0.5, 3), '#e8cf7a', 0.22);
  c.ink(c.horn(-15, 0, 12.4, 0, 0.5, 2), '#e8cf7a', '#3a2a0c');
  c.fill(c.horn(-11, 0, 12, 0, 0.2, 0.95), '#fffbe6');
  return c;
}

// Plants: ciernie, nasiona i to, co z nich cieknie.

/** Cierń Busha i Ivy. */
function thorn(): PartCanvas {
  const c = partCanvas(-9, -3, 9, 3);
  c.fill(c.horn(-8, 0, -1, 0, 0.2, 1.1), '#dfe86a', 0.22);
  c.ink(c.horn(-6, 0, 7.6, 0, 2.1, 0.25), BONE, '#0d1208');
  c.fill(c.horn(-5, 0.6, 3, 0.4, 0.7, 0.15), BONE_SHADE, 0.8);
  return c;
}

/** Kolczaste nasiono Trunka. */
function seed(): PartCanvas {
  const c = partCanvas(-10, -6, 7, 6);
  c.fill(c.horn(-9, 0, -1, 0, 0.2, 2), '#6b7a35', 0.3);
  const spikes = [0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return c.horn(1, 0, 1 + Math.cos(angle) * 5, Math.sin(angle) * 5, 1.2, 0.15);
  });
  c.ink(union(c.dot(1, 0, 3.1), ...spikes), '#6d5a41', '#0e0a06');
  c.fill(c.dot(1.6, -0.6, 1.2), '#9a8463', 0.8);
  return c;
}

/** Odłamek lodu Ice Ivy. */
function frost(): PartCanvas {
  const c = partCanvas(-12, -4, 10, 4);
  c.fill(c.horn(-10.5, 0, -1, 0, 0.2, 1.8), '#d4f3f6', 0.3);
  const shard = c.poly([
    [-5, 0],
    [1, -2.6],
    [8.4, 0],
    [1, 2.6],
  ]);
  c.ink(shard, '#a4c8cf', '#15242a');
  c.fill(
    c.poly([
      [-2, -0.4],
      [1.2, -1.6],
      [6, -0.2],
    ]),
    '#e0f2f3',
    0.9,
  );
  return c;
}

/** Chmura zarodników Toxic Ivy: przechodzi przez wszystkich na drodze. */
function spore(): PartCanvas {
  const c = partCanvas(-12, -6, 8, 6);
  for (const [x, y, r] of [
    [-9.6, 1.6, 0.7],
    [-7, -2.4, 0.9],
    [-5.4, 2.6, 1.1],
  ] as const) {
    c.fill(c.dot(x, y, r), '#d9f04a', 0.55);
  }
  c.fill(c.dot(1, 0, 5.4), '#d9f04a', 0.14);
  const cloud = union(
    c.dot(1.4, 0.2, 3.3),
    c.dot(-1.8, -1.6, 2.4),
    c.dot(-1.4, 2, 2.2),
    c.dot(4, -1.4, 2),
  );
  c.ink(cloud, '#8f9a2e', '#0d1006');
  c.fill(c.dot(2, -0.6, 1.5), '#d9f04a', 0.85);
  c.fill(c.dot(-1.6, -1.6, 0.8), '#5c3a54');
  c.fill(c.dot(-0.8, 2, 0.7), '#5c3a54');
  return c;
}

// Robots: zepsuty obraz i to, co wypada z pieca.

/** Zakłócenie Holo-bota: kilka przesuniętych pasków światła. */
function glitch(): PartCanvas {
  const c = partCanvas(-11, -5, 9, 5);
  const bars: readonly (readonly [x: number, y: number, half: number, alpha: number])[] = [
    [-5.6, -2.6, 3.4, 0.45],
    [-2.4, 2.4, 4.4, 0.55],
    [-7.4, 0.2, 2.2, 0.35],
    [2, -1.2, 4.4, 0.95],
    [3.4, 1, 3.4, 0.95],
  ];
  c.fill(c.box(2.4, 0, 5.6, 3.2, 0), '#74e3e8', 0.14);
  for (const [x, y, half, alpha] of bars) c.fill(c.box(x, y, half, 0.7, 0), '#74e3e8', alpha);
  c.fill(c.box(3.6, -0.1, 2.2, 0.55, 0), '#e9fdff');
  return c;
}

/** Żużel Thermobota: stygnąca bryła z żarem w pęknięciach i ogonem dymu. */
function slag(): PartCanvas {
  const c = partCanvas(-14, -6, 8, 6);
  c.fill(c.horn(-12.5, -0.6, -1, 0, 0.6, 3), '#07090b', 0.3);
  c.fill(c.horn(-9, 1, 0, 0, 0.4, 2.4), '#e8742a', 0.4);
  c.fill(c.dot(2, 0, 5.4), '#e8742a', 0.16);
  const lump = c.poly([
    [-2.4, -1.4],
    [0.4, -4],
    [4.4, -3.4],
    [6.6, -0.4],
    [5, 3.2],
    [1, 4],
    [-2, 2.2],
  ]);
  c.ink(lump, '#3b4654', '#07090b');
  const cracks: readonly (readonly Point[])[] = [
    [
      [-0.8, -1],
      [1.6, 0.4],
      [1, 2.6],
    ],
    [
      [1.6, 0.4],
      [4.4, -1],
      [5, -2.4],
    ],
  ];
  for (const crack of cracks) c.fill(c.path(crack, 0.42), '#f6c35a');
  return c;
}

export function skinFx(): Record<string, PartCanvas> {
  return {
    fang: fang(),
    spike: spike(),
    fireball: fireball(),
    gaze: gaze(),
    star: star(),
    ray: ray(),
    thorn: thorn(),
    seed: seed(),
    frost: frost(),
    spore: spore(),
    glitch: glitch(),
    slag: slag(),
    dodge: dodgeMark(),
  };
}
