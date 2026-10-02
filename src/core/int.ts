// Arytmetyka całkowita dla symulacji. Wszystkie funkcje przyjmują i zwracają liczby całkowite.

export function clampInt(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** floor(a × b / c). Bezpieczne, dopóki |a × b| < 2^53. */
export function mulDivFloor(a: number, b: number, c: number): number {
  return Math.floor((a * b) / c);
}

/** -1, 0 albo 1. */
export function signInt(value: number): number {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}
