// Bufor zdarzeń symulacji w układzie struktury tablic. Symulacja nie wywołuje renderera;
// renderer i UI czytają zdarzenia po każdym ticku. Bufor ma stałą pojemność i nie alokuje.
import { int32Arrays } from '../core/int-arrays.ts';

/** jednostka, cel */
export const EVENT_ATTACK_STARTED = 1;
/** jednostka, cel (cios wręcz doszedł celu) */
export const EVENT_ATTACK_HIT = 2;
/** id pocisku, właściciel, pozycja */
export const EVENT_PROJECTILE_SPAWNED = 3;
/** id pocisku, trafiony, pozycja */
export const EVENT_PROJECTILE_HIT = 4;
/** id pocisku, -, pozycja */
export const EVENT_PROJECTILE_EXPIRED = 5;
/** jednostka, wartość, źródło */
export const EVENT_DAMAGED = 6;
/** jednostka, faktycznie przywrócone HP */
export const EVENT_HEALED = 7;
/** jednostka, faktyczne przesunięcie w podjednostkach */
export const EVENT_KNOCKED_BACK = 8;
/** jednostka */
export const EVENT_DIED = 9;
/** wynik, powód */
export const EVENT_BATTLE_ENDED = 10;
/** jednostka, która uniknęła trafienia; źródło trafienia */
export const EVENT_DODGED = 11;
/** miejsce (`unitId`), w którym stanęła przyzwana jednostka; przyzywacz; pozycja */
export const EVENT_SUMMONED = 12;

/**
 * Górne ograniczenie liczby zdarzeń jednego ticka: pocisk trafia jednego wroga, a przebijający
 * nie więcej niż 10 (skład i przyzwani), po dwa zdarzenia na trafienie; do tego zdarzenia
 * jednostek. Pula 64 pocisków rzadko jest pełna samych przebijających; 1024 mieści typowy
 * najgorszy tick z dużym zapasem, a przepełnienie rzuca błąd zamiast gubić zdarzenia.
 */
export const EVENT_CAPACITY = 1024;

export interface EventBuffer {
  count: number;
  readonly type: Int32Array;
  readonly a: Int32Array;
  readonly b: Int32Array;
  readonly c: Int32Array;
}

export function createEventBuffer(capacity: number = EVENT_CAPACITY): EventBuffer {
  const columns = int32Arrays(capacity, 4);
  return { count: 0, type: columns(), a: columns(), b: columns(), c: columns() };
}

export function clearEvents(buffer: EventBuffer): void {
  buffer.count = 0;
}

export function pushEvent(
  buffer: EventBuffer,
  type: number,
  a: number,
  b: number,
  c: number,
): void {
  const i = buffer.count;
  if (i >= buffer.type.length) throw new Error('Event buffer overflow');
  buffer.type[i] = type;
  buffer.a[i] = a;
  buffer.b[i] = b;
  buffer.c[i] = c;
  buffer.count = i + 1;
}

/** Dopisuje wszystkie zdarzenia z `from` na koniec `out`. */
export function appendEvents(out: EventBuffer, from: EventBuffer): void {
  const n = from.count;
  const start = out.count;
  if (start + n > out.type.length) throw new Error('Event buffer overflow');
  // Pętla zamiast subarray(): widok tablicy byłby alokacją przy każdym ticku.
  for (let i = 0; i < n; i++) {
    out.type[start + i] = from.type[i] ?? 0;
    out.a[start + i] = from.a[i] ?? 0;
    out.b[start + i] = from.b[i] ?? 0;
    out.c[start + i] = from.c[i] ?? 0;
  }
  out.count = start + n;
}
