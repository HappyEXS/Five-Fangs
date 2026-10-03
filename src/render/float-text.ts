// Liczby obrażeń i leczenia unoszące się nad jednostkami. Pula stałej wielkości;
// rysowanie z cyfr w atlasie, bez tworzenia napisów.
import { createPool, type Pool, poolAcquire, poolClear, poolReleaseAt } from '../core/pool.ts';

export const FLOAT_KIND_DAMAGE = 0;
export const FLOAT_KIND_HEAL = 1;

/** Czas życia liczby. */
export const FLOAT_LIFE_MS = 800;
/** Jak wysoko liczba unosi się przez swoje życie, w jednostkach logicznych sceny. */
export const FLOAT_RISE = 34;
const CAPACITY = 64;

export interface FloatText {
  x: number;
  y: number;
  value: number;
  kind: number;
  ageMs: number;
}

export type FloatTexts = Pool<FloatText>;

export function createFloatTexts(): FloatTexts {
  return createPool(CAPACITY, () => ({ x: 0, y: 0, value: 0, kind: 0, ageMs: 0 }));
}

/** Dodaje liczbę. Gdy pula jest pełna, nowa liczba przepada: starsze są ważniejsze niż komplet. */
export function spawnFloatText(
  texts: FloatTexts,
  x: number,
  y: number,
  value: number,
  kind: number,
): void {
  const text = poolAcquire(texts);
  if (text === null) return;
  text.x = x;
  text.y = y;
  text.value = value;
  text.kind = kind;
  text.ageMs = 0;
}

/** Postarza liczby i zwalnia te, których czas minął. */
export function updateFloatTexts(texts: FloatTexts, dtMs: number): void {
  for (let i = texts.count - 1; i >= 0; i--) {
    const text = texts.items[i];
    if (text === undefined) continue;
    text.ageMs += dtMs;
    if (text.ageMs >= FLOAT_LIFE_MS) poolReleaseAt(texts, i);
  }
}

export function clearFloatTexts(texts: FloatTexts): void {
  poolClear(texts);
}

/** Liczba cyfr dziesiętnych nieujemnej liczby całkowitej. */
export function digitCount(value: number): number {
  let count = 1;
  for (let rest = value; rest >= 10; rest = Math.floor(rest / 10)) count++;
  return count;
}

/** Cyfra na pozycji `index` licząc od lewej (0 = najbardziej znacząca). */
export function digitAt(value: number, count: number, index: number): number {
  let divisor = 1;
  for (let i = count - 1 - index; i > 0; i--) divisor *= 10;
  return Math.floor(value / divisor) % 10;
}
