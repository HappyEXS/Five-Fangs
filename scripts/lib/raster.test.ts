import { describe, expect, it } from 'vitest';
import {
  below,
  blotches,
  capsule,
  circle,
  createImage,
  ellipse,
  fill,
  hex,
  inset,
  intersect,
  noise,
  polygon,
  roughen,
  roundBox,
  type Shape,
  subtract,
  taper,
  translate,
  union,
  weather,
} from './raster.ts';

describe('kształty: odległość ze znakiem', () => {
  it('elipsa: ujemna w środku, zero na końcach osi, dodatnia na zewnątrz', () => {
    const shape = ellipse(10, 20, 8, 4);
    expect(shape(10, 20)).toBeLessThan(0);
    expect(shape(18, 20)).toBeCloseTo(0);
    expect(shape(10, 16)).toBeCloseTo(0);
    expect(shape(22, 20)).toBeGreaterThan(0);
    expect(shape(10, 30)).toBeGreaterThan(0);
  });

  it('odcinek zwężany: promień maleje liniowo od początku do końca', () => {
    const shape = taper(0, 0, 10, 0, 4, 1);
    expect(shape(0, 4)).toBeCloseTo(0);
    expect(shape(10, 1)).toBeCloseTo(0);
    expect(shape(5, 2.5)).toBeCloseTo(0);
    expect(shape(5, 0)).toBeCloseTo(-2.5);
    // Za końcem odcinka liczy się odległość od jego końca.
    expect(shape(13, 0)).toBeCloseTo(2);
  });

  it('wielokąt: dokładna odległość od krawędzi, także dla kształtu wklęsłego', () => {
    const square = polygon([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    expect(square(5, 5)).toBeCloseTo(-5);
    expect(square(5, 12)).toBeCloseTo(2);
    expect(square(13, 14)).toBeCloseTo(5);
    // Litera L: wcięty róg leży na zewnątrz.
    const ell = polygon([
      [0, 0],
      [4, 0],
      [4, 6],
      [10, 6],
      [10, 10],
      [0, 10],
    ]);
    expect(ell(2, 2)).toBeLessThan(0);
    expect(ell(8, 8)).toBeLessThan(0);
    expect(ell(8, 2)).toBeGreaterThan(0);
  });

  it('odejmowanie i część wspólna', () => {
    const disc = circle(0, 0, 10);
    const hole = circle(0, 0, 4);
    const ring = subtract(disc, hole);
    expect(ring(0, 0)).toBeGreaterThan(0);
    expect(ring(7, 0)).toBeLessThan(0);
    expect(ring(12, 0)).toBeGreaterThan(0);
    const lens = intersect(circle(-3, 0, 5), circle(3, 0, 5));
    expect(lens(0, 0)).toBeLessThan(0);
    expect(lens(-6, 0)).toBeGreaterThan(0);
    expect(lens(6, 0)).toBeGreaterThan(0);
  });
});

describe('prostokąt ograniczający kształtu', () => {
  it('obejmuje kształt i przenosi się przez działania na kształtach', () => {
    expect(circle(10, 20, 4).bounds).toEqual({ minX: 6, minY: 16, maxX: 14, maxY: 24 });
    expect(taper(0, 0, 10, 0, 4, 1).bounds).toEqual({ minX: -4, minY: -4, maxX: 14, maxY: 4 });
    expect(union(circle(0, 0, 2), circle(10, 0, 3)).bounds).toEqual({
      minX: -2,
      minY: -3,
      maxX: 13,
      maxY: 3,
    });
    expect(intersect(circle(0, 0, 5), circle(4, 0, 5)).bounds).toEqual({
      minX: -1,
      minY: -5,
      maxX: 5,
      maxY: 5,
    });
    expect(subtract(circle(0, 0, 5), circle(4, 0, 5)).bounds).toEqual(circle(0, 0, 5).bounds);
    // Powiększony kształt rośnie razem z prostokątem; pomniejszony zostaje w starym.
    expect(inset(circle(0, 0, 5), -2).bounds).toEqual({ minX: -7, minY: -7, maxX: 7, maxY: 7 });
    expect(inset(circle(0, 0, 5), 2).bounds).toEqual(circle(0, 0, 5).bounds);
    expect(below(circle(0, 0, 5), 1).bounds).toEqual({ minX: -5, minY: 1, maxX: 5, maxY: 5 });
  });

  it('suma z kształtem bez prostokąta sama go nie ma', () => {
    const plain: Shape = (x, y) => x + y;
    expect(union(circle(0, 0, 2), plain).bounds).toBeUndefined();
    expect(intersect(circle(0, 0, 2), plain).bounds).toEqual(circle(0, 0, 2).bounds);
  });

  it('nie zmienia obrazu: wypełnienie z prostokątem i bez niego daje te same piksele', () => {
    const shapes: Shape[] = [
      inset(union(ellipse(20, 14, 9, 6), taper(20, 14, 34, 30, 4, 0.5)), -1.5),
      subtract(roundBox(12, 26, 9, 7, 3), circle(15, 28, 4)),
      below(capsule(4, 4, 36, 34, 2.5), 12),
      polygon([
        [3, 30],
        [18, 2],
        [37, 37],
      ]),
    ];
    for (const shape of shapes) {
      expect(shape.bounds).toBeDefined();
      const fast = createImage(40, 40);
      const slow = createImage(40, 40);
      fill(fast, shape, hex('#3366cc', 0.8));
      // Ta sama funkcja odległości bez prostokąta: fill liczy wtedy każdy piksel płótna.
      fill(slow, (x, y) => shape(x, y), hex('#3366cc', 0.8));
      expect(Array.from(fast.data)).toEqual(Array.from(slow.data));
    }
  });
});

describe('fill', () => {
  it('wypełnia wnętrze kształtu i zostawia resztę przezroczystą', () => {
    const image = createImage(8, 8);
    fill(
      image,
      polygon([
        [0, 0],
        [4, 0],
        [4, 8],
        [0, 8],
      ]),
      hex('#ff8000'),
    );
    const pixel = (x: number, y: number) =>
      Array.from(image.data.subarray((y * 8 + x) * 4, (y * 8 + x) * 4 + 4));
    expect(pixel(1, 4)).toEqual([255, 128, 0, 255]);
    expect(pixel(6, 4)).toEqual([0, 0, 0, 0]);
  });
});

describe('szum i postarzanie (styl „mroczna baśń”, ADR 0019)', () => {
  it('szum jest powtarzalny, zależy od ziarna i mieści się w -1..1', () => {
    let min = 1;
    let max = -1;
    for (let i = 0; i < 400; i++) {
      const value = noise(i * 0.37, i * 0.91, 5);
      expect(value).toBe(noise(i * 0.37, i * 0.91, 5));
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    // Szum naprawdę się zmienia i inne ziarno daje inny wzór.
    expect(max - min).toBeGreaterThan(1);
    expect(noise(3.3, 7.7, 5)).not.toBe(noise(3.3, 7.7, 6));
  });

  it('poszarpany kształt odbiega od oryginału najwyżej o amplitudę', () => {
    const shape = circle(20, 20, 10);
    const rough = roughen(shape, 2, 5, 9);
    let differs = false;
    for (let y = 0; y < 40; y += 3) {
      for (let x = 0; x < 40; x += 3) {
        const delta = Math.abs(rough(x, y) - shape(x, y));
        expect(delta).toBeLessThanOrEqual(2);
        if (delta > 0.2) differs = true;
      }
    }
    expect(differs).toBe(true);
    // Prostokąt ograniczający rośnie o amplitudę, więc wypełnianie nie ucina krawędzi.
    expect(rough.bounds).toEqual({ minX: 8, minY: 8, maxX: 32, maxY: 32 });
  });

  it('przesunięcie przenosi kształt razem z prostokątem ograniczającym', () => {
    const moved = translate(circle(10, 10, 4), 5, -3);
    expect(moved(15, 7)).toBeCloseTo(-4);
    expect(moved.bounds).toEqual({ minX: 11, minY: 3, maxX: 19, maxY: 11 });
  });

  it('plamy zajmują mniej więcej zadaną część powierzchni', () => {
    const share = (coverage: number): number => {
      const shape = blotches(coverage, 6, 3);
      let inside = 0;
      for (let y = 0; y < 120; y++) {
        for (let x = 0; x < 120; x++) if (shape(x, y) < 0) inside++;
      }
      return inside / (120 * 120);
    };
    expect(share(0)).toBe(0);
    expect(share(0.2)).toBeGreaterThan(0.03);
    expect(share(0.2)).toBeLessThan(share(0.5));
    expect(share(0.5)).toBeGreaterThan(0.35);
    expect(share(0.5)).toBeLessThan(0.65);
  });

  it('postarzanie zmienia kolory, nie rusza alfy i jest powtarzalne', () => {
    const paint = (): ReturnType<typeof createImage> => {
      const image = createImage(24, 24);
      fill(image, circle(12, 12, 9), hex('#808080'));
      weather(image, 4, { stain: 0.2, stainSize: 8, speck: 0.1, speckDepth: 0.3 });
      return image;
    };
    const plain = createImage(24, 24);
    fill(plain, circle(12, 12, 9), hex('#808080'));
    const aged = paint();
    let changed = 0;
    for (let i = 0; i < aged.data.length; i += 4) {
      expect(aged.data[i + 3]).toBe(plain.data[i + 3]);
      if (aged.data[i] !== plain.data[i]) changed++;
    }
    expect(changed).toBeGreaterThan(50);
    expect(Array.from(paint().data)).toEqual(Array.from(aged.data));
  });
});
