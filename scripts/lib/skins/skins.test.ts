import { describe, expect, it } from 'vitest';
import { requireContent } from '../../../src/content/load.ts';
import { PIXELS_PER_UNIT } from '../part-spec.ts';
import { TRIBE_SKINS, tribeSprites } from './index.ts';
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

describe('skórki szczepów', () => {
  const sprites = tribeSprites();
  const byName = new Map(sprites.map((sprite) => [sprite.name, sprite]));
  const skins = Object.values(TRIBE_SKINS).flat();

  it('cztery szczepy, każdy z siedmioma formami w kolejności drzewa ewolucji', () => {
    expect(TRIBE_SKINS).toEqual({
      beasts: ['monstrosity', 'batfang', 'reaper', 'spiker', 'ironbeak', 'tuskovator', 'ignitix'],
      immortals: [
        'orb',
        'cardinal',
        'guardian_of_hell',
        'polaris',
        'ultimus',
        'xartix',
        'enigmatix',
      ],
      // Ósma skórka to krzak przyzywany przez Mother-tree: nie jest formą bohatera.
      plants: [
        'bush',
        'trunk',
        'ivy',
        'oak_warrior',
        'mother_tree',
        'ice_ivy',
        'toxic_ivy',
        'sprout',
      ],
      robots: ['bot', 'egzo_bot', 'holo_bot', 'thermobot', 'ax_bot', 'whirl_bot', 'titan_bot'],
    });
  });

  it('każda skórka ma komplet części rigu humanoid', () => {
    for (const skin of skins) {
      for (const part of RIG_PARTS)
        expect(byName.has(`${skin}/${part}`), `${skin}/${part}`).toBe(true);
    }
    const fx = sprites.filter((sprite) => sprite.name.startsWith('fx/'));
    // Dwanaście pocisków i znak uniku.
    expect(fx).toHaveLength(13);
    expect(sprites).toHaveLength(skins.length * RIG_PARTS.length + fx.length);
  });

  it('każda forma bohatera z linii szczepu ma swoją skórkę i sprite pocisku', () => {
    const content = requireContent();
    for (const [tribe, ids] of Object.entries(TRIBE_SKINS)) {
      const line = content.lines.get(tribe);
      // Szczep bez linii w treści gry ma na razie same skórki.
      if (line === undefined) continue;
      const forms = [...line.forms.keys()];
      expect(
        ids.filter((id) => forms.includes(id)),
        tribe,
      ).toEqual(forms);
      for (const id of line.forms.keys()) {
        const unit = content.heroes.get(id);
        expect(unit?.visual.skin).toBe(id);
        const projectile = unit?.visual.projectileSprite ?? null;
        if (projectile !== null) expect(byName.has(`fx/${projectile}`), projectile).toBe(true);
      }
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
