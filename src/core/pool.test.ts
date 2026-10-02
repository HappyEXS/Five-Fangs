import { describe, expect, it } from 'vitest';
import { createPool, poolAcquire, poolClear, poolReleaseAt } from './pool.ts';

interface Item {
  id: number;
  value: number;
}

const makePool = (capacity: number) => createPool<Item>(capacity, (id) => ({ id, value: 0 }));

describe('pool', () => {
  it('tworzy wszystkie obiekty z góry', () => {
    const pool = makePool(3);
    expect(pool.items.map((item) => item.id)).toEqual([0, 1, 2]);
    expect(pool.count).toBe(0);
  });

  it('wydaje obiekty po kolei i zwraca null po wyczerpaniu', () => {
    const pool = makePool(2);
    expect(poolAcquire(pool)?.id).toBe(0);
    expect(poolAcquire(pool)?.id).toBe(1);
    expect(poolAcquire(pool)).toBeNull();
    expect(pool.count).toBe(2);
  });

  it('zwolnienie zamienia obiekt z ostatnim aktywnym i nie gubi żadnego', () => {
    const pool = makePool(3);
    poolAcquire(pool);
    poolAcquire(pool);
    poolAcquire(pool);
    poolReleaseAt(pool, 0);
    expect(pool.count).toBe(2);
    expect(pool.items.slice(0, 2).map((item) => item.id)).toEqual([2, 1]);
    expect(pool.items.map((item) => item.id).sort()).toEqual([0, 1, 2]);
    expect(poolAcquire(pool)?.id).toBe(0);
  });

  it('zwalnianie w iteracji od końca odwiedza każdy aktywny obiekt raz', () => {
    const pool = makePool(4);
    for (let i = 0; i < 4; i++) {
      const item = poolAcquire(pool);
      if (item) item.value = i;
    }
    const seen: number[] = [];
    for (let i = pool.count - 1; i >= 0; i--) {
      const item = pool.items[i];
      if (item === undefined) continue;
      seen.push(item.value);
      if (item.value % 2 === 0) poolReleaseAt(pool, i);
    }
    expect(seen.sort()).toEqual([0, 1, 2, 3]);
    expect(pool.count).toBe(2);
  });

  it('ignoruje zwolnienie spoza zakresu aktywnych', () => {
    const pool = makePool(2);
    poolAcquire(pool);
    poolReleaseAt(pool, 1);
    poolReleaseAt(pool, -1);
    expect(pool.count).toBe(1);
  });

  it('poolClear zwalnia wszystko bez tworzenia nowych obiektów', () => {
    const pool = makePool(2);
    const first = poolAcquire(pool);
    poolAcquire(pool);
    poolClear(pool);
    expect(pool.count).toBe(0);
    expect(poolAcquire(pool)).toBe(first);
  });
});
