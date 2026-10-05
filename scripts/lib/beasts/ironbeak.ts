// Ironbeak: druga ewolucja Batfanga, szybki i odrzucający. Ptak na długiej szyi z ogromnym,
// zakrzywionym dziobem z nitowanego żelaza; za grzbietem sterczą długie pióra (szkic autora).
import { intersect, union } from '../raster.ts';
import { type BeastPalette, type PartCanvas, PUPIL, partCanvas } from './kit.ts';
import { claws, fore, shin, thigh, upper } from './limbs.ts';

export const IRONBEAK: BeastPalette = {
  main: '#7c5330',
  dark: '#27160a',
  light: '#c39a62',
  accent: '#e0a233',
  eye: '#ffd23e',
};

const IRON = '#a9b2bc';
const IRON_DARK = '#3d4650';
const IRON_LIGHT = '#e6ebf0';
const PLUME = '#4c2f17';

function head(p: BeastPalette): PartCanvas {
  const c = partCanvas(-13, -48, 28, 5);
  // Czub z piór na potylicy.
  c.ink(
    union(
      c.horn(1, -32, -8.5, -41.5, 2.2, 0.4),
      c.horn(0, -29.5, -10.5, -34.5, 2.2, 0.4),
      c.horn(2.5, -34, -1.5, -46, 2.2, 0.4),
    ),
    PLUME,
    p.dark,
  );
  // Długa szyja z jasną kryzą u nasady i głowa.
  const neck = c.horn(0, 0, 3.4, -24, 4.4, 3.3);
  const skull = c.oval(5.2, -28.8, 7.4, 7);
  c.ink(union(neck, skull), p.main, p.dark);
  c.fill(intersect(c.inner(neck), c.oval(0, -1.5, 6, 3.6)), p.light);
  c.fill(c.line(-1.4, -4, 1.4, -21, 0.8), '#ffffff', 0.13);
  // Dolna szczęka i górna część dzioba: hak z żelaza.
  c.ink(c.horn(9.5, -24.6, 18.4, -21.4, 2.4, 0.8), IRON_DARK, p.dark);
  const hook = c.arc([9.5, -29.6], [26, -32.5], [23, -12.5], 5.4, 0.5);
  c.ink(hook, IRON, IRON_DARK);
  c.fill(intersect(c.inner(hook), c.arc([10, -32], [23, -34], [24.5, -22], 1.1, 0.3)), IRON_LIGHT);
  // Obręcz u nasady dzioba i nity.
  c.fill(c.line(9.8, -34.2, 9.8, -24.4, 1.15), IRON_DARK);
  for (const [x, y] of [
    [13.4, -30.6],
    [16.6, -29.4],
    [19.4, -27],
    [14.4, -27.4],
  ] as const) {
    c.fill(c.dot(x, y, 0.75), IRON_DARK);
    c.fill(c.dot(x - 0.2, y - 0.2, 0.42), IRON_LIGHT);
  }
  // Okrągłe, czujne oko.
  c.fill(c.dot(4.6, -30.4, 2.9), p.dark);
  c.fill(c.dot(4.6, -30.4, 2.25), p.eye);
  c.fill(c.dot(5.2, -30.3, 1.05), PUPIL);
  c.fill(c.line(1.4, -34, 7.6, -33, 0.7), p.dark);
  return c;
}

function torso(p: BeastPalette): PartCanvas {
  const c = partCanvas(-28, -43, 13, 6);
  // Sterczące pióra ogona.
  for (const [x, y] of [
    [-13.5, -40],
    [-21, -32],
    [-25.5, -20.5],
  ] as const) {
    const feather = c.horn(-5, -6, x, y, 3.1, 1);
    c.ink(feather, PLUME, p.dark);
    c.fill(c.line(-5, -6, x, y, 0.3), p.dark, 0.6);
  }
  const body = c.oval(0.5, -12, 9, 13.6);
  c.ink(body, p.main, p.dark);
  const inside = c.inner(body);
  c.fill(intersect(inside, c.oval(5, -12, 5, 10.5)), p.light);
  // Łuski piór na piersi.
  for (const y of [-17, -12, -7]) {
    c.fill(intersect(inside, c.arc([2.4, y], [5, y + 2.6], [7.8, y], 0.3, 0.3)), p.dark, 0.45);
  }
  return c;
}

export function ironbeakParts(): Record<string, PartCanvas> {
  const p = IRONBEAK;
  const wing: BeastPalette = { ...p, main: PLUME };
  return {
    thigh: thigh(p, 1.15),
    shin: shin(p, 'talon'),
    torso: torso(p),
    upper: upper(wing, 1.05),
    fore: fore(wing, 'wing'),
    head: head(p),
    weapon: claws(wing, 4),
  };
}
