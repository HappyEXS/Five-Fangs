import { describe, expect, it } from 'vitest';
import { int32Arrays } from './int-arrays.ts';

describe('int32Arrays', () => {
  it('małe tablice są osobne i wyzerowane', () => {
    const next = int32Arrays(10, 3);
    const a = next();
    const b = next();
    expect(a).toHaveLength(10);
    expect(Array.from(a)).toEqual(new Array(10).fill(0));
    expect(a.buffer).not.toBe(b.buffer);
    a[0] = 7;
    expect(b[0]).toBe(0);
  });

  it('duże tablice dzielą jeden bufor, ale nie nachodzą na siebie', () => {
    const next = int32Arrays(64, 3);
    const a = next();
    const b = next();
    const c = next();
    expect(a.buffer).toBe(b.buffer);
    expect(b.buffer).toBe(c.buffer);
    expect([a.length, b.length, c.length]).toEqual([64, 64, 64]);
    a.fill(1);
    c.fill(3);
    expect(Array.from(b)).toEqual(new Array(64).fill(0));
    b[0] = 2;
    b[63] = 2;
    expect([a[63], c[0]]).toEqual([1, 3]);
    // Widok zachowuje się jak zwykła tablica: indeks poza długością nic nie zapisuje.
    b[64] = 9;
    expect(c[0]).toBe(3);
  });

  it('prośba o więcej tablic, niż zapowiedziano, rzuca błąd zamiast wyjść poza bufor', () => {
    const next = int32Arrays(64, 1);
    next();
    expect(() => next()).toThrow(RangeError);
  });
});
