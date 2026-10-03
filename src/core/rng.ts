// Generator sfc32 z ziarnem. WYŁĄCZNIE dla efektów kosmetycznych w rendererze
// (cząsteczki, rozrzut liczb obrażeń). Symulacja nie używa losowości (ADR 0002).

export interface Rng {
  a: number;
  b: number;
  c: number;
  d: number;
}

export function createRng(seed: number): Rng {
  const rng: Rng = { a: 0x9e3779b9, b: 0x243f6a88, c: 0xb7e15162, d: seed | 0 };
  // Rozgrzewka: pierwsze wyniki sfc32 słabo zależą od ziarna.
  for (let i = 0; i < 15; i++) nextU32(rng);
  return rng;
}

/** Kolejna liczba całkowita 0..2^32-1. */
export function nextU32(rng: Rng): number {
  const t = (((rng.a + rng.b) | 0) + rng.d) | 0;
  rng.d = (rng.d + 1) | 0;
  rng.a = rng.b ^ (rng.b >>> 9);
  rng.b = (rng.c + (rng.c << 3)) | 0;
  rng.c = ((rng.c << 21) | (rng.c >>> 11)) + t;
  rng.c |= 0;
  return t >>> 0;
}

/** Kolejna liczba z przedziału [0, 1). */
export function nextFloat(rng: Rng): number {
  return nextU32(rng) / 4294967296;
}

/** Kolejna liczba z przedziału [min, max). */
export function nextRange(rng: Rng, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min);
}
