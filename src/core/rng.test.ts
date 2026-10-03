import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextRange, nextU32 } from './rng.ts';

describe('rng', () => {
  it('to samo ziarno daje ten sam ciąg', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    for (let i = 0; i < 100; i++) expect(nextU32(a)).toBe(nextU32(b));
  });

  it('różne ziarna dają różne ciągi', () => {
    const a = createRng(1);
    const b = createRng(2);
    let same = 0;
    for (let i = 0; i < 100; i++) if (nextU32(a) === nextU32(b)) same++;
    expect(same).toBeLessThan(3);
  });

  it('nextU32 zwraca liczby całkowite bez znaku', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = nextU32(rng);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('nextFloat mieści się w [0, 1) i pokrywa przedział w miarę równo', () => {
    const rng = createRng(99);
    const buckets = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      const v = nextFloat(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const index = Math.floor(v * 4);
      buckets[index] = (buckets[index] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });

  it('nextRange mieści się w [min, max)', () => {
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const v = nextRange(rng, -3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
  });
});
