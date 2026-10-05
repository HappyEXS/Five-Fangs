import { describe, expect, it } from 'vitest';
import { requireContent } from '../../../src/content/load.ts';
import { PIXELS_PER_UNIT } from '../part-spec.ts';
import { BEAST_SKINS, beastSprites } from './index.ts';
import { partCanvas } from './kit.ts';

const RIG_PARTS = ['thigh', 'shin', 'torso', 'upper', 'fore', 'head', 'weapon'];

function alphaAt(image: { width: number; data: Uint8ClampedArray }, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3] ?? 0;
}

describe('partCanvas', () => {
  it('wyznacza rozmiar i pivot z prostokąta w układzie stawu', () => {
    const canvas = partCanvas(-6, -10, 8, 4);
    expect(canvas.part).toEqual({ width: 14, height: 14, pivotX: 6, pivotY: 10 });
    expect(canvas.image.width).toBe(14 * PIXELS_PER_UNIT);
    expect(canvas.image.height).toBe(14 * PIXELS_PER_UNIT);
  });

  it('odrzuca granice niecałkowite i pusty prostokąt', () => {
    expect(() => partCanvas(-6.5, -10, 8, 4)).toThrow(/integers/);
    expect(() => partCanvas(0, 0, 0, 4)).toThrow(/integers/);
  });

  it('rysuje w układzie pivota: kształt w (0, 0) trafia w pivot obrazka', () => {
    const canvas = partCanvas(-6, -10, 8, 4);
    canvas.ink(canvas.dot(0, 0, 3), '#ff0000', '#000000');
    const pivotX = 6 * PIXELS_PER_UNIT;
    const pivotY = 10 * PIXELS_PER_UNIT;
    const at = (x: number, y: number) =>
      Array.from(canvas.image.data.subarray((y * canvas.image.width + x) * 4).subarray(0, 4));
    // Środek ma kolor wnętrza, brzeg kolor obrysu, a róg płótna jest pusty.
    expect(at(pivotX, pivotY)).toEqual([255, 0, 0, 255]);
    expect(at(pivotX + 3 * PIXELS_PER_UNIT - 2, pivotY)).toEqual([0, 0, 0, 255]);
    expect(alphaAt(canvas.image, 0, 0)).toBe(0);
  });
});

describe('skórki szczepu Beasts', () => {
  const sprites = beastSprites();
  const byName = new Map(sprites.map((sprite) => [sprite.name, sprite]));

  it('każda bestia ma komplet części rigu humanoid', () => {
    expect(BEAST_SKINS).toEqual([
      'monstrosity',
      'batfang',
      'reaper',
      'spiker',
      'ironbeak',
      'tuskovator',
      'ignitix',
    ]);
    for (const skin of BEAST_SKINS) {
      for (const part of RIG_PARTS)
        expect(byName.has(`${skin}/${part}`), `${skin}/${part}`).toBe(true);
    }
    expect(sprites).toHaveLength(BEAST_SKINS.length * RIG_PARTS.length + 3);
  });

  it('każda forma bohatera z linii Beasts ma swoją skórkę i sprite pocisku', () => {
    const content = requireContent();
    const line = content.lines.get('beasts');
    expect([...(line?.forms.keys() ?? [])]).toEqual(BEAST_SKINS);
    for (const id of BEAST_SKINS) {
      const unit = content.heroes.get(id);
      expect(unit?.visual.skin).toBe(id);
      const projectile = unit?.visual.projectileSprite ?? null;
      if (projectile !== null) expect(byName.has(`fx/${projectile}`), projectile).toBe(true);
    }
  });

  it('żadna część nie dotyka krawędzi płótna: nic nie jest ucięte', () => {
    for (const { name, image } of sprites) {
      let touches = false;
      for (let x = 0; x < image.width && !touches; x++) {
        touches = alphaAt(image, x, 0) > 0 || alphaAt(image, x, image.height - 1) > 0;
      }
      for (let y = 0; y < image.height && !touches; y++) {
        touches = alphaAt(image, 0, y) > 0 || alphaAt(image, image.width - 1, y) > 0;
      }
      expect(touches, name).toBe(false);
    }
  });
});
