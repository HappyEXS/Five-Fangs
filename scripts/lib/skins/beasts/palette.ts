// Kolory i wspólne motywy szczepu Beasts. Brąz ze szkicu autora jest tu ściemniony do brudnej,
// prawie czarnej sierści i garbowanej skóry, a drugim materiałem całego szczepu jest stara kość:
// rogi, kły, kolce, pazury i czaszki. Bestia nie ma „buzi”: jej pysk to ciemność, w której widać
// tylko małe światła oczu i zęby, tak jak pod kapturami Immortals i w dziuplach Plants.
import { PIXELS_PER_UNIT } from '../../part-spec.ts';
import { inset, intersect, type Shape, union } from '../../raster.ts';
import { BONE, BONE_SHADE, OUTLINE, type Palette, type PartCanvas, type Point } from '../kit.ts';

export const INK = '#0b0705';
/** Skołtuniona sierść. */
export const PELT = { main: '#3a2a1e', shade: '#1c130d', light: '#5e4631', dark: INK };
/** Garbowana, łysa skóra. */
export const HIDE = { main: '#594232', shade: '#2d2017', light: '#7c6149', dark: INK };
/** Stara kość: pożółkła, z brudem w zagłębieniach. */
export const OLD_BONE = { main: BONE, shade: BONE_SHADE, light: '#e6dcbd', dark: INK };
/** Kość po dalszej stronie postaci: ta sama, ale w cieniu. */
export const FAR_BONE = { main: BONE_SHADE, shade: '#4f4733', light: BONE, dark: INK };
/** Ciemność pyska i oczodołów. */
export const VOID = '#050302';

export function beast(
  base: { main: string; shade: string; light: string; dark: string },
  accent: string,
  glow: string,
): Palette {
  return { ...base, accent, glow };
}

/**
 * Kosmyki: długie, cienkie pasma zwisające z bryły. Każde to [x, y, dx, dy] z opcjonalną
 * grubością u nasady; łączy się je z bryłą przed wywołaniem `form`, żeby miały wspólny kontur.
 */
export function strands(
  c: PartCanvas,
  roots: readonly (readonly [x: number, y: number, dx: number, dy: number, r?: number])[],
): Shape {
  return union(...roots.map(([x, y, dx, dy, r = 1.5]) => c.horn(x, y, x + dx, y + dy, r, 0.2)));
}

/** Grubość obrysu zęba: cieńsza niż kontur brył, bo zęby są małe. */
const TOOTH_EDGE = 0.34;

/**
 * Rząd zębów wzdłuż odcinka: trójkąty na przemian dłuższe i krótsze, wbite w dziąsło. `length`
 * dodatnie kieruje zęby w dół, ujemne w górę.
 */
export function teeth(
  c: PartCanvas,
  from: Point,
  to: Point,
  count: number,
  length: number,
  color: string = BONE,
  width = 1,
): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const reach = length * (i % 2 === 0 ? 1 : 0.68);
    const edge = Math.sign(reach) * TOOTH_EDGE;
    c.fill(
      c.poly([
        [x - width, y],
        [x + width, y],
        [x + width * 0.15, y + reach],
      ]),
      INK,
    );
    c.fill(
      c.poly([
        [x - width + TOOTH_EDGE, y],
        [x + width - TOOTH_EDGE, y],
        [x + width * 0.15, y + reach - edge * 2.2],
      ]),
      color,
    );
  }
}

/** Świecąca szpara oka w ciemności: skośny romb z poświatą. `slant` dodatnie opada ku przodowi. */
export function slitEye(
  c: PartCanvas,
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  slant: number,
  glow: string,
): void {
  c.fill(c.oval(x, y, halfWidth * 1.25, halfHeight * 1.9), glow, 0.13);
  c.fill(
    c.ragged(
      c.poly([
        [x - halfWidth, y - slant - halfHeight * 0.3],
        [x + halfWidth * 0.2, y - halfHeight],
        [x + halfWidth, y + slant + halfHeight * 0.3],
        [x - halfWidth * 0.2, y + halfHeight],
      ]),
      0.15,
      2,
    ),
    glow,
  );
}

/** Okrągłe światło oka w oczodole: mały punkt z poświatą. */
export function emberEye(c: PartCanvas, x: number, y: number, r: number, glow: string): void {
  c.fill(c.dot(x, y, r * 2.6), glow, 0.2);
  c.fill(c.dot(x, y, r), glow);
}

/** Pęknięcie w kości albo rogu. */
export function crack(c: PartCanvas, clip: Shape, points: readonly Point[]): void {
  c.fill(intersect(clip, c.path(points, 0.24)), INK, 0.85);
}

/**
 * Brud u nasady rogu, kła albo pazura: ciemnieje ku punktowi `at`, a obrys kształtu zostaje
 * nietknięty.
 */
export function grime(
  c: PartCanvas,
  shape: Shape,
  at: Point,
  radius: number,
  color: string = BONE_SHADE,
): void {
  const inner = inset(shape, OUTLINE * PIXELS_PER_UNIT);
  c.fill(intersect(inner, c.dot(at[0], at[1], radius)), color, 0.55);
  c.fill(intersect(inner, c.dot(at[0], at[1], radius * 0.6)), color, 0.75);
}

/** Kolec albo róg z kości: obrys, wnętrze i brudna nasada. */
export function boneSpike(
  c: PartCanvas,
  from: Point,
  to: Point,
  radius: number,
  far = false,
): Shape {
  const shape = c.horn(from[0], from[1], to[0], to[1], radius, 0.2);
  c.ink(shape, far ? BONE_SHADE : BONE, INK);
  grime(c, shape, from, radius * 2.4, far ? '#4f4733' : BONE_SHADE);
  return shape;
}
