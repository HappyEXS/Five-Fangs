// Pula o stałej pojemności. Wszystkie obiekty powstają raz, przy tworzeniu puli;
// aktywne zajmują początek tablicy (`items[0..count)`), więc iteracja nie wymaga alokacji.

export interface Pool<T> {
  /** Wszystkie obiekty puli; aktywne to pierwsze `count`. Nie zmieniaj długości tablicy. */
  readonly items: T[];
  count: number;
}

export function createPool<T extends object>(
  capacity: number,
  factory: (index: number) => T,
): Pool<T> {
  const items: T[] = [];
  for (let i = 0; i < capacity; i++) items.push(factory(i));
  return { items, count: 0 };
}

/** Zwraca kolejny wolny obiekt albo null, gdy pula jest pełna. Obiekt ma stan z poprzedniego użycia. */
export function poolAcquire<T extends object>(pool: Pool<T>): T | null {
  const item = pool.items[pool.count];
  if (item === undefined) return null;
  pool.count++;
  return item;
}

/**
 * Zwalnia aktywny obiekt o danym indeksie, zamieniając go miejscami z ostatnim aktywnym.
 * Przy zwalnianiu w trakcie iteracji iteruj od końca.
 */
export function poolReleaseAt<T extends object>(pool: Pool<T>, index: number): void {
  const last = pool.count - 1;
  const released = pool.items[index];
  const lastItem = pool.items[last];
  if (index < 0 || index > last || released === undefined || lastItem === undefined) return;
  pool.items[index] = lastItem;
  pool.items[last] = released;
  pool.count = last;
}

export function poolClear<T extends object>(pool: Pool<T>): void {
  pool.count = 0;
}
