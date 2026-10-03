// FNV-1a 32-bit. Tylko operacje całkowite (Math.imul), więc wynik jest identyczny
// w każdym silniku JS. Służy do hashy stanu i logu zdarzeń w testach golden.

export const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function hashByte(hash: number, byte: number): number {
  return Math.imul(hash ^ (byte & 0xff), FNV_PRIME);
}

/** Dołącza do hasha 4 bajty liczby 32-bitowej, od najmłodszego. */
export function hashInt32(hash: number, value: number): number {
  let h = hash;
  h = Math.imul(h ^ (value & 0xff), FNV_PRIME);
  h = Math.imul(h ^ ((value >>> 8) & 0xff), FNV_PRIME);
  h = Math.imul(h ^ ((value >>> 16) & 0xff), FNV_PRIME);
  h = Math.imul(h ^ (value >>> 24), FNV_PRIME);
  return h;
}

/** Dołącza do hasha pierwsze `length` elementów tablicy liczb całkowitych. */
export function hashInts(
  hash: number,
  values: ArrayLike<number>,
  length: number = values.length,
): number {
  let h = hash;
  for (let i = 0; i < length; i++) {
    h = hashInt32(h, values[i] ?? 0);
  }
  return h;
}

/** Hash jako 8 cyfr szesnastkowych, bez znaku. */
export function hashToHex(hash: number): string {
  return (hash >>> 0).toString(16).padStart(8, '0');
}
