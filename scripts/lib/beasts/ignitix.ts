// Ignitix: druga ewolucja Reapera, strzelec celujący w koniec szyku wroga. Gad na długiej,
// łuskowatej szyi, z wydłużoną zębatą paszczą, w której tli się ogień (szkic autora: łeb
// z długimi szczękami, oko wysoko z tyłu, zygzak łusek na szyi).
import { intersect, union } from '../raster.ts';
import { type BeastPalette, BONE, type PartCanvas, PUPIL, partCanvas } from './kit.ts';
import { claws, fore, shin, thigh, upper } from './limbs.ts';

export const IGNITIX: BeastPalette = {
  main: '#8f4222',
  dark: '#2a0f07',
  light: '#e3a23c',
  accent: '#f26a1b',
  eye: '#ffe45c',
};

const EMBER = '#ffd166';
const RIDGE = '#5a2412';

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-15, -46, 33, 5);
  // Rogi na potylicy.
  c.ink(c.horn(1, -34, -8, -41.5, 1.9, 0.3), BONE, p.dark);
  c.ink(c.horn(3.5, -35.5, -1, -44.5, 1.9, 0.3), BONE, p.dark);
  // Grzebień łusek wzdłuż karku.
  for (const [x, y] of [
    [-4.2, -6],
    [-4.6, -12.5],
    [-3.4, -19],
  ] as const) {
    c.ink(c.horn(x + 2.5, y, x - 3.6, y - 3, 2, 0.3), RIDGE, p.dark);
  }
  // Szyja wygięta w łuk; z przodu jaśniejsze płytki.
  const neck = c.arc([0, 0], [-4, -14], [4.5, -25], 4.6, 3.7);
  c.ink(neck, p.main, p.dark);
  const throat = intersect(c.inner(neck), c.arc([3.4, 1], [-0.2, -13], [7.6, -23], 1.9, 1.6));
  c.fill(throat, p.light);
  for (const [x, y] of [
    [0.6, -5],
    [0.2, -10.5],
    [1.4, -16],
  ] as const) {
    c.fill(intersect(throat, c.line(x - 2.5, y, x + 3.5, y - 0.8, 0.3)), p.dark, 0.5);
  }
  // Dolna szczęka, żar w paszczy, potem czaszka z długą górną szczęką.
  c.ink(c.box(15, -23.4, 10.4, 2.2, 1.8), p.main, p.dark);
  c.fill(c.oval(16.5, -26, 9.4, 1.5), p.accent);
  c.fill(c.oval(18.5, -26, 6.5, 0.8), EMBER);
  const skull = union(c.oval(5, -29.5, 7, 6.6), c.box(17.5, -30.2, 12, 3.5, 2.6));
  c.ink(union(skull, c.dot(28, -33.4, 1.9)), p.main, p.dark);
  c.fill(c.dot(28.4, -33.6, 0.7), p.dark);
  // Zęby obu szczęk.
  for (let x = 9.5; x < 27; x += 3.4) {
    c.ink(
      c.poly([
        [x, -27],
        [x + 1.2, -24.1],
        [x + 2.4, -27],
      ]),
      BONE,
      p.dark,
    );
  }
  for (let x = 11.2; x < 24; x += 3.4) {
    c.ink(
      c.poly([
        [x, -25.4],
        [x + 1.2, -28],
        [x + 2.4, -25.4],
      ]),
      BONE,
      p.dark,
    );
  }
  // Oko wysoko z tyłu łba, pod łukiem brwiowym.
  c.fill(c.dot(4.2, -31.6, 2.9), p.dark);
  c.fill(c.dot(4.2, -31.6, 2.25), p.eye);
  c.fill(c.oval(4.6, -31.6, 0.6, 1.9), PUPIL);
  c.fill(c.line(0.6, -35.4, 8.4, -33.8, 0.9), p.dark);
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-31, -29, 13, 16);
  // Gruby ogon opada za plecami i podwija się przy ziemi.
  c.ink(c.arc([-4, -5], [-27, -9], [-25, 12], 5.2, 1.1), p.main, p.dark);
  // Grzebień na grzbiecie.
  for (const [x, y] of [
    [-6.5, -20.5],
    [-8.4, -14],
    [-8.4, -7.5],
  ] as const) {
    c.ink(c.horn(x + 2.5, y, x - 4.2, y - 2.6, 2.1, 0.3), RIDGE, p.dark);
  }
  const body = c.oval(0, -12, 9.4, 14);
  c.ink(body, p.main, p.dark);
  const belly = intersect(c.inner(body), c.oval(5, -10, 5.2, 11.5));
  c.fill(belly, p.light);
  for (const y of [-19, -14.5, -10, -5.5, -1]) {
    c.fill(intersect(belly, c.line(0, y, 10, y - 0.6, 0.3)), p.dark, 0.5);
  }
  c.fill(c.line(-4, -19, -4.6, -8, 1), '#ffffff', 0.12);
  return c;
}

export function ignitixParts(): Record<string, PartCanvas> {
  const p = IGNITIX;
  return {
    thigh: thigh(p, 1.15),
    shin: shin(p, 'paw', 1.1),
    torso: torso(p),
    upper: upper(p, 1.05),
    fore: fore(p, 'paw', 1.05),
    head: head(p),
    weapon: claws(p, 6),
  };
}
