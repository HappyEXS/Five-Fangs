import { describe, expect, it } from 'vitest';
import { tileSpots } from './trail-layout.ts';

const WORLDS = [0, 1, 2, 3, 4, 5];
const LEVELS = 6;

describe('tileSpots', () => {
  it('szlak każdego świata idzie od lewej do prawej w równych odstępach', () => {
    for (const world of WORLDS) {
      const xs = tileSpots(LEVELS, world).map((spot) => spot.x);
      expect(xs[0]).toBeCloseTo(8);
      expect(xs[LEVELS - 1]).toBeCloseTo(92);
      for (let i = 1; i < xs.length; i++) {
        expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeCloseTo(84 / (LEVELS - 1));
      }
    }
  });

  it('kafle mieszczą się w polu mapy: nie wchodzą na nagłówek ani na tabliczkę poziomu', () => {
    for (const world of WORLDS) {
      for (const spot of tileSpots(LEVELS, world)) {
        expect(spot.y, `świat ${world}`).toBeGreaterThanOrEqual(18);
        expect(spot.y, `świat ${world}`).toBeLessThanOrEqual(80);
        expect(Math.abs(spot.tilt)).toBeLessThanOrEqual(4);
      }
    }
  });

  it('każdy świat ma inny kształt szlaku', () => {
    // Kształt bez drobnego rozrzutu: wysokości zaokrąglone do dziesiątek.
    const outline = (world: number) =>
      tileSpots(LEVELS, world)
        .map((spot) => Math.round(spot.y / 10))
        .join(' ');
    expect(new Set(WORLDS.map(outline)).size).toBe(WORLDS.length);
  });

  it('ostatni kafel świata ma kształt bossa, pozostałe zwykłe kształty', () => {
    for (const world of WORLDS) {
      const shapes = tileSpots(LEVELS, world).map((spot) => spot.shape);
      const boss = shapes[LEVELS - 1];
      expect(shapes.slice(0, -1)).not.toContain(boss);
      expect(shapes.every((shape) => shape.length > 0)).toBe(true);
    }
  });

  it('jest powtarzalny, a świat z jednym poziomem stawia kafel pośrodku', () => {
    expect(tileSpots(LEVELS, 3)).toEqual(tileSpots(LEVELS, 3));
    expect(tileSpots(1, 0)[0]?.x).toBeCloseTo(50);
  });
});
