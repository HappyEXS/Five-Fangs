import { describe, expect, it } from 'vitest';
import { clampInt, mulDivCeil, mulDivFloor, signInt } from './int.ts';

describe('int', () => {
  it('clampInt przycina do przedziału', () => {
    expect(clampInt(5, 0, 10)).toBe(5);
    expect(clampInt(-3, 0, 10)).toBe(0);
    expect(clampInt(12, 0, 10)).toBe(10);
  });

  it('mulDivFloor zaokrągla w dół, także dla liczb ujemnych', () => {
    expect(mulDivFloor(600, 13, 10)).toBe(780);
    expect(mulDivFloor(35, 11, 10)).toBe(38);
    expect(mulDivFloor(-7, 1, 2)).toBe(-4);
  });

  it('mulDivCeil zaokrągla w górę i nie zmienia wyniku całkowitego', () => {
    expect(mulDivCeil(101, 33, 100)).toBe(34);
    expect(mulDivCeil(600, 50, 100)).toBe(300);
    expect(mulDivCeil(1, 1, 100)).toBe(1);
    expect(mulDivCeil(600, 0, 100)).toBe(0);
  });

  it('signInt zwraca znak', () => {
    expect(signInt(42)).toBe(1);
    expect(signInt(-42)).toBe(-1);
    expect(signInt(0)).toBe(0);
  });
});
