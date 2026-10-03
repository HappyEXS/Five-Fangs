import { describe, expect, it } from 'vitest';
import {
  clearFloatTexts,
  createFloatTexts,
  digitAt,
  digitCount,
  FLOAT_KIND_DAMAGE,
  FLOAT_KIND_HEAL,
  FLOAT_LIFE_MS,
  spawnFloatText,
  updateFloatTexts,
} from './float-text.ts';

describe('liczby nad jednostkami', () => {
  it('nowa liczba startuje z wiekiem zero w podanym miejscu', () => {
    const texts = createFloatTexts();
    spawnFloatText(texts, 100, 200, 40, FLOAT_KIND_DAMAGE);
    expect(texts.count).toBe(1);
    expect(texts.items[0]).toEqual({ x: 100, y: 200, value: 40, kind: 0, ageMs: 0 });
  });

  it('liczby starzeją się i znikają po czasie życia, młodsze zostają', () => {
    const texts = createFloatTexts();
    spawnFloatText(texts, 1, 0, 10, FLOAT_KIND_DAMAGE);
    updateFloatTexts(texts, FLOAT_LIFE_MS - 100);
    spawnFloatText(texts, 2, 0, 20, FLOAT_KIND_HEAL);
    updateFloatTexts(texts, 150);
    expect(texts.count).toBe(1);
    expect(texts.items[0]?.value).toBe(20);
    expect(texts.items[0]?.ageMs).toBe(150);
  });

  it('obiekty puli są używane ponownie', () => {
    const texts = createFloatTexts();
    spawnFloatText(texts, 0, 0, 1, FLOAT_KIND_DAMAGE);
    const first = texts.items[0];
    updateFloatTexts(texts, FLOAT_LIFE_MS);
    expect(texts.count).toBe(0);
    spawnFloatText(texts, 5, 6, 7, FLOAT_KIND_HEAL);
    expect(texts.items[0]).toBe(first);
    expect(first).toEqual({ x: 5, y: 6, value: 7, kind: 1, ageMs: 0 });
  });

  it('pełna pula pomija nowe liczby zamiast alokować', () => {
    const texts = createFloatTexts();
    const capacity = texts.items.length;
    for (let i = 0; i < capacity + 10; i++) spawnFloatText(texts, i, 0, i, FLOAT_KIND_DAMAGE);
    expect(texts.count).toBe(capacity);
    expect(texts.items).toHaveLength(capacity);
    clearFloatTexts(texts);
    expect(texts.count).toBe(0);
  });
});

describe('cyfry', () => {
  it('liczy cyfry liczby', () => {
    expect([0, 7, 10, 99, 100, 12345].map(digitCount)).toEqual([1, 1, 2, 2, 3, 5]);
  });

  it('zwraca cyfry od lewej', () => {
    const digits = (value: number) => {
      const count = digitCount(value);
      return Array.from({ length: count }, (_, i) => digitAt(value, count, i));
    };
    expect(digits(0)).toEqual([0]);
    expect(digits(40)).toEqual([4, 0]);
    expect(digits(1205)).toEqual([1, 2, 0, 5]);
  });
});
