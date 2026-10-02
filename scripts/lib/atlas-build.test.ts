import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildAtlas } from './atlas-build.ts';
import { packShelves } from './pack.ts';
import { PARTS, PIXELS_PER_UNIT, placeholderSprites, SKINS } from './placeholder-parts.ts';
import { circle, createImage, encodePng, fill, hex, roundBox } from './raster.ts';

/** Dekoduje PNG zapisany przez encodePng: zwraca wymiary i surowe piksele RGBA. */
function decodePng(png: Buffer) {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idatLength = png.readUInt32BE(33);
  expect(png.toString('latin1', 37, 41)).toBe('IDAT');
  const raw = inflateSync(png.subarray(41, 41 + idatLength));
  const pixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    expect(raw[row * (width * 4 + 1)]).toBe(0);
    pixels.set(
      raw.subarray(row * (width * 4 + 1) + 1, (row + 1) * (width * 4 + 1)),
      row * width * 4,
    );
  }
  return { width, height, pixels };
}

describe('raster', () => {
  it('wypełnia kształt z wygładzoną krawędzią', () => {
    const image = createImage(20, 20);
    fill(image, circle(10, 10, 6), hex('#ff0000'));
    const alphaAt = (x: number, y: number) => image.data[(y * 20 + x) * 4 + 3];
    expect(alphaAt(10, 10)).toBe(255);
    expect(alphaAt(0, 0)).toBe(0);
    // Piksel na krawędzi koła jest częściowo pokryty.
    const edge = alphaAt(15, 10) ?? 0;
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
    expect(image.data[(10 * 20 + 10) * 4]).toBe(255);
  });

  it('miesza półprzezroczysty kolor z tłem', () => {
    const image = createImage(4, 4);
    const all = roundBox(2, 2, 4, 4, 0);
    fill(image, all, hex('#000000'));
    fill(image, all, hex('#ffffff', 0.5));
    expect(image.data[0]).toBeGreaterThan(120);
    expect(image.data[0]).toBeLessThan(135);
    expect(image.data[3]).toBe(255);
  });

  it('encodePng zapisuje obraz, który dekoduje się do tych samych pikseli', () => {
    const image = createImage(7, 5);
    fill(image, circle(3, 2, 2), hex('#3366cc'));
    const decoded = decodePng(encodePng(image));
    expect(decoded.width).toBe(7);
    expect(decoded.height).toBe(5);
    expect(Array.from(decoded.pixels)).toEqual(Array.from(image.data));
  });
});

describe('packShelves', () => {
  it('układa elementy bez nakładania, z marginesem, w granicach atlasu', () => {
    const items = [
      { name: 'a', width: 30, height: 40 },
      { name: 'b', width: 50, height: 20 },
      { name: 'c', width: 60, height: 40 },
      { name: 'd', width: 10, height: 10 },
    ];
    const packing = packShelves(items, 100, 2);
    expect(packing.placements).toHaveLength(4);
    for (const p of packing.placements) {
      expect(p.x).toBeGreaterThanOrEqual(2);
      expect(p.y).toBeGreaterThanOrEqual(2);
      expect(p.x + p.width + 2).toBeLessThanOrEqual(packing.width);
      expect(p.y + p.height + 2).toBeLessThanOrEqual(packing.height);
      for (const q of packing.placements) {
        if (p === q) continue;
        const apart =
          p.x + p.width + 2 <= q.x ||
          q.x + q.width + 2 <= p.x ||
          p.y + p.height + 2 <= q.y ||
          q.y + q.height + 2 <= p.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('jest deterministyczne niezależnie od kolejności wejścia', () => {
    const items = [
      { name: 'b', width: 20, height: 20 },
      { name: 'a', width: 20, height: 20 },
      { name: 'c', width: 20, height: 30 },
    ];
    expect(packShelves(items, 64, 1)).toEqual(packShelves([...items].reverse(), 64, 1));
  });

  it('odrzuca element szerszy niż atlas', () => {
    expect(() => packShelves([{ name: 'wide', width: 200, height: 10 }], 100, 2)).toThrow(/wider/);
  });
});

describe('atlas placeholder', () => {
  const sprites = placeholderSprites();
  const built = buildAtlas(sprites, PIXELS_PER_UNIT);

  it('zawiera komplet części każdej skórki i strzałę', () => {
    const names = Object.keys(built.meta.sprites);
    for (const skin of SKINS) {
      for (const slot of ['thigh', 'shin', 'torso', 'upper', 'fore', 'head', 'weapon']) {
        expect(names).toContain(`${skin.id}/${slot}`);
      }
    }
    expect(names).toContain('fx/arrow');
    expect(names).toHaveLength(SKINS.length * 7 + 1);
  });

  it('każdy sprite ma rozmiar części w pikselach atlasu i nie jest pusty', () => {
    for (const sprite of sprites) {
      expect(sprite.image.width).toBe(sprite.part.width * PIXELS_PER_UNIT);
      expect(sprite.image.height).toBe(sprite.part.height * PIXELS_PER_UNIT);
      let opaque = 0;
      for (let i = 3; i < sprite.image.data.length; i += 4) {
        if ((sprite.image.data[i] ?? 0) > 200) opaque++;
      }
      expect(opaque, sprite.name).toBeGreaterThan(sprite.image.width);
    }
  });

  it('metadane podają prostokąt w atlasie i pivot z załącznika A', () => {
    const torso = built.meta.sprites['swordsman_a/torso'];
    expect(torso?.slice(2)).toEqual([60, 84, PARTS.torso.pivotX, PARTS.torso.pivotY]);
    const bow = built.meta.sprites['archer_a/weapon'];
    expect(bow?.slice(2)).toEqual([108, 33, 18, 9]);
    expect(built.meta.pixelsPerUnit).toBe(3);
  });

  it('piksele atlasu w miejscu sprite’a są pikselami sprite’a', () => {
    const decoded = decodePng(built.png);
    const sprite = sprites.find((s) => s.name === 'brute/head');
    const rect = built.meta.sprites['brute/head'];
    if (sprite === undefined || rect === undefined) throw new Error('missing sprite');
    const [x = 0, y = 0, w = 0] = rect;
    const row = 30;
    const from = ((y + row) * decoded.width + x) * 4;
    expect(Array.from(decoded.pixels.subarray(from, from + w * 4))).toEqual(
      Array.from(sprite.image.data.subarray(row * w * 4, (row + 1) * w * 4)),
    );
  });

  it('pliki w src/assets/generated są aktualne względem generatora', () => {
    const pngUrl = new URL('../../src/assets/generated/units.png', import.meta.url);
    const jsonUrl = new URL('../../src/assets/generated/units.json', import.meta.url);
    expect(existsSync(pngUrl), 'uruchom: pnpm atlas:placeholder').toBe(true);
    expect(readFileSync(pngUrl).equals(built.png), 'uruchom: pnpm atlas:placeholder').toBe(true);
    expect(JSON.parse(readFileSync(jsonUrl, 'utf8'))).toEqual(built.meta);
  });
});
