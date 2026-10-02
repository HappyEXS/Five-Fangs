import { describe, expect, it } from 'vitest';
import unitsMeta from '../assets/generated/units.json' with { type: 'json' };
import { parseAtlasMeta } from './atlas.ts';

describe('parseAtlasMeta', () => {
  it('przelicza prostokąt z pikseli atlasu na jednostki rigu, a pivot na przesunięcie', () => {
    const sprites = parseAtlasMeta({
      pixelsPerUnit: 3,
      width: 64,
      height: 64,
      sprites: { 'a/torso': [4, 8, 60, 84, 10, 26] },
    });
    expect(sprites.get('a/torso')).toEqual({
      sx: 4,
      sy: 8,
      sw: 60,
      sh: 84,
      width: 20,
      height: 28,
      offsetX: -10,
      offsetY: -26,
      unitsPerPixel: 1 / 3,
    });
  });

  it('pivot zerowy daje przesunięcie 0, nie -0', () => {
    const sprites = parseAtlasMeta({
      pixelsPerUnit: 2,
      width: 8,
      height: 8,
      sprites: { 'a/dot': [0, 0, 4, 4, 0, 1.5] },
    });
    expect(Object.is(sprites.get('a/dot')?.offsetX, 0)).toBe(true);
    expect(sprites.get('a/dot')?.offsetY).toBe(-1.5);
  });

  it('czyta metadane wygenerowanego atlasu', () => {
    const sprites = parseAtlasMeta(unitsMeta);
    expect(sprites.size).toBeGreaterThan(30);
    const sword = sprites.get('swordsman_a/weapon');
    expect(sword?.width).toBe(8);
    expect(sword?.height).toBe(36);
    for (const sprite of sprites.values()) {
      expect(sprite.sx + sprite.sw).toBeLessThanOrEqual(unitsMeta.width);
      expect(sprite.sy + sprite.sh).toBeLessThanOrEqual(unitsMeta.height);
    }
  });
});
