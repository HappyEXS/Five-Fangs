// Kończyny Immortals na szkielecie humanoid: pasy podartej tkaniny zamiast nóg i rękawy
// z kościstą dłonią u postaci w szatach, wici u postaci wiszących nad ziemią, pióra u tych,
// które suną. Rozmieszczenie stawów opisuje limbs.ts.
import { intersect, union } from '../raster.ts';
import { BONE, type Palette, type PartCanvas, partCanvas } from './kit.ts';

export function ragThigh(p: Palette): PartCanvas {
  const c = partCanvas(-8, -6, 8, 16, 51);
  const inside = c.form(
    c.poly([
      [-3.6, -1.5],
      [3.8, -1.5],
      [4.8, 11.6],
      [2.2, 10.2],
      [0.2, 12.6],
      [-2, 10.4],
      [-4.8, 12.2],
    ]),
    p,
    { rag: 0.5 },
  );
  c.fill(intersect(inside, c.line(0.6, 0, 1, 9, 0.3)), p.shade);
  return c.finish();
}

export function ragShin(p: Palette): PartCanvas {
  const c = partCanvas(-8, -5, 9, 17, 52);
  const inside = c.form(
    c.poly([
      [-3.4, -1.5],
      [3.6, -1.5],
      [5, 13],
      [3.2, 14.7],
      [1.4, 12.6],
      [-0.6, 14.8],
      [-2.6, 12.8],
      [-4.6, 14.5],
    ]),
    p,
    { rag: 0.5 },
  );
  c.fill(intersect(inside, c.line(-0.6, 0, -0.2, 11, 0.3)), p.shade);
  return c.finish();
}

export function sleeveUpper(p: Palette): PartCanvas {
  const c = partCanvas(-8, -6, 8, 16, 53);
  c.form(
    c.poly([
      [-3.2, -2.4],
      [3.2, -2.4],
      [4.8, 10.6],
      [-4.8, 10.6],
    ]),
    p,
    { rag: 0.5 },
  );
  return c.finish();
}

/** Rękaw z wystrzępionym mankietem; spod niego wystaje koścista dłoń w kolorze `hand`. */
export function sleeveFore(p: Palette, hand: string = BONE): PartCanvas {
  const c = partCanvas(-9, -5, 9, 21, 54);
  for (const [x, y] of [
    [-2.6, 14.2],
    [-0.7, 15.8],
    [1.2, 15.4],
    [3, 13.8],
  ] as const) {
    c.ink(c.horn(0, 8, x, y, 0.9, 0.3), hand, p.dark);
  }
  c.form(
    c.poly([
      [-3.4, -1.5],
      [3.4, -1.5],
      [5.6, 9],
      [2.6, 8],
      [0, 10.6],
      [-2.8, 8.2],
      [-5.6, 9.8],
    ]),
    p,
    { rag: 0.5 },
  );
  return c.finish();
}

export function tendrilThigh(p: Palette): PartCanvas {
  const c = partCanvas(-6, -5, 7, 15, 61);
  c.form(c.arc([0, 0], [3.2, 5], [0, 10.7], 1.4, 1.1), p, { rag: 0.3, shadow: 0.6 });
  return c.finish();
}

export function tendrilShin(p: Palette): PartCanvas {
  const c = partCanvas(-7, -5, 10, 18, 62);
  c.form(
    union(
      c.arc([0, 0], [-3.2, 6], [0.5, 12.4], 1.1, 0.8),
      c.arc([0.5, 12.4], [3.6, 15.8], [6.2, 13.4], 0.8, 0.3),
    ),
    p,
    { rag: 0.3, shadow: 0.6 },
  );
  return c.finish();
}

/** Długie pióro w miejscu uda albo goleni: postać sunie, a pióra falują jak brzeg płaszcza. */
export function featherLeg(p: Palette, lower: boolean): PartCanvas {
  const c = partCanvas(-8, -6, 8, lower ? 18 : 16, lower ? 66 : 65);
  const tip = lower ? 14.6 : 11.6;
  const inside = c.form(
    union(
      c.horn(0, 0, 0.4, tip, 3.6, 0.6),
      c.horn(-1.6, 4, -4.4, 8.5, 1.6, 0.3),
      c.horn(1.8, 5, 4.6, 9.5, 1.6, 0.3),
    ),
    p,
    { rag: 0.5 },
  );
  c.fill(intersect(inside, c.line(0, 0.5, 0.4, tip - 1.5, 0.3)), p.dark, 0.75);
  return c.finish();
}
