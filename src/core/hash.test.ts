import { describe, expect, it } from 'vitest';
import { FNV_OFFSET_BASIS, hashByte, hashInt32, hashInts, hashToHex } from './hash.ts';

function hashAscii(text: string): string {
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i++) h = hashByte(h, text.charCodeAt(i));
  return hashToHex(h);
}

describe('hash', () => {
  it('zgadza się z wektorami testowymi FNV-1a 32-bit', () => {
    expect(hashAscii('')).toBe('811c9dc5');
    expect(hashAscii('a')).toBe('e40c292c');
    expect(hashAscii('foobar')).toBe('bf9cf968');
  });

  it('hashInt32 dołącza 4 bajty od najmłodszego', () => {
    const viaBytes = [0x61, 0x62, 0x63, 0x64].reduce(hashByte, FNV_OFFSET_BASIS);
    expect(hashInt32(FNV_OFFSET_BASIS, 0x64636261)).toBe(viaBytes);
  });

  it('rozróżnia liczby ujemne i kolejność', () => {
    const a = hashInts(FNV_OFFSET_BASIS, new Int32Array([1, -1, 2]));
    const b = hashInts(FNV_OFFSET_BASIS, new Int32Array([1, 2, -1]));
    const c = hashInts(FNV_OFFSET_BASIS, new Int32Array([1, 1, 2]));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('hashInts uwzględnia tylko pierwsze `length` elementów', () => {
    const full = new Int32Array([7, 8, 9, 10]);
    expect(hashInts(FNV_OFFSET_BASIS, full, 2)).toBe(
      hashInts(FNV_OFFSET_BASIS, new Int32Array([7, 8])),
    );
  });

  it('hashToHex daje 8 cyfr bez znaku', () => {
    expect(hashToHex(-1)).toBe('ffffffff');
    expect(hashToHex(1)).toBe('00000001');
  });
});
