// Jednostki miary symulacji (ADR 0002). Konwersje z wartości czytelnych dla człowieka
// wykonuje wyłącznie kompilacja treści; sama symulacja widzi już tylko liczby całkowite.

export const TICKS_PER_SECOND = 30;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

/** Liczba podjednostek w jednej jednostce świata. */
export const SUBUNITS_PER_UNIT = 256;

/** Jednostki świata → podjednostki. */
export function unitsToSubunits(units: number): number {
  return Math.round(units * SUBUNITS_PER_UNIT);
}

/** Podjednostki → jednostki świata (ułamkowe; dla renderera i UI). */
export function subunitsToUnits(subunits: number): number {
  return subunits / SUBUNITS_PER_UNIT;
}

/** Czas w sekundach → całkowite ticki. */
export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

/** Prędkość w jednostkach świata na sekundę → podjednostki na tick. */
export function unitsPerSecondToStep(unitsPerSecond: number): number {
  return Math.round((unitsPerSecond * SUBUNITS_PER_UNIT) / TICKS_PER_SECOND);
}

/** Częstotliwość „na sekundę” → odstęp w tickach (co najmniej 1). */
export function ratePerSecondToInterval(perSecond: number): number {
  return Math.max(1, Math.round(TICKS_PER_SECOND / perSecond));
}
