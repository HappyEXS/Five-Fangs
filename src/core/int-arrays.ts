// Tworzenie wielu tablic Int32Array naraz. Symulacja trzyma stan w kilkudziesięciu tablicach
// typowanych i tworzy je przy każdej walce, więc koszt ich alokacji liczy się w budżecie
// „walk na sekundę”.

/** Do tylu bajtów V8 trzyma dane tablicy typowanej na stercie, razem z samą tablicą. */
const ON_HEAP_BYTES = 64;
const BYTES = Int32Array.BYTES_PER_ELEMENT;

/**
 * Zwraca funkcję, która wydaje kolejne wyzerowane tablice o długości `length`; razem najwyżej
 * `count` tablic.
 *
 * Małe tablice (do 64 bajtów) powstają osobno: V8 trzyma je na stercie i tworzy w kilkadziesiąt
 * nanosekund. Każda większa dostałaby własny bufor poza stertą, co kosztuje ok. 1 µs na tablicę
 * (pomiar w ARCHITECTURE.md §3.8), więc większe wycinamy z jednego wspólnego bufora: jedna
 * alokacja poza stertą zamiast `count`.
 */
export function int32Arrays(length: number, count: number): () => Int32Array {
  if (length * BYTES <= ON_HEAP_BYTES) return () => new Int32Array(length);
  const buffer = new ArrayBuffer(length * BYTES * count);
  let offset = 0;
  return () => {
    // Prośba ponad `count` rzuca RangeError: widok nie mieści się w buforze.
    const view = new Int32Array(buffer, offset, length);
    offset += length * BYTES;
    return view;
  };
}
