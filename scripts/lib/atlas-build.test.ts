import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { chooseAtlasWidth, composeAtlas } from './atlas-build.ts';
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
  const built = composeAtlas(
    sprites.map((s) => ({ ...s, pivotX: s.part.pivotX, pivotY: s.part.pivotY })),
    PIXELS_PER_UNIT,
  );

  it('zawiera komplet części każdej skórki i strzałę', () => {
    const names = Object.keys(built.meta.sprites);
    for (const skin of SKINS) {
      for (const slot of ['thigh', 'shin', 'torso', 'upper', 'fore', 'head', 'weapon']) {
        expect(names).toContain(`${skin.id}/${slot}`);
      }
    }
    expect(names).toContain('fx/arrow');
    expect(names).toContain('fx/dmg_0');
    expect(names).toContain('fx/heal_plus');
    // Części skórek, strzała i dwa zestawy po jedenaście znaków.
    expect(names).toHaveLength(SKINS.length * 7 + 1 + 22);
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
    const decoded = built.image;
    const sprite = sprites.find((s) => s.name === 'brute/head');
    const rect = built.meta.sprites['brute/head'];
    if (sprite === undefined || rect === undefined) throw new Error('missing sprite');
    const [x = 0, y = 0, w = 0] = rect;
    const row = 30;
    const from = ((y + row) * decoded.width + x) * 4;
    expect(Array.from(decoded.data.subarray(from, from + w * 4))).toEqual(
      Array.from(sprite.image.data.subarray(row * w * 4, (row + 1) * w * 4)),
    );
  });

  it('forma po ewolucji ma te same części, ale inną sylwetkę, nie tylko kolory', () => {
    const image = (name: string) => {
      const sprite = sprites.find((s) => s.name === name);
      if (sprite === undefined) throw new Error(`missing sprite ${name}`);
      return sprite.image;
    };
    for (const [base, evolved] of [
      ['swordsman_a', 'swordsman_b'],
      ['archer_a', 'archer_b'],
    ]) {
      for (const slot of ['head', 'weapon']) {
        const a = image(`${base}/${slot}`);
        const b = image(`${evolved}/${slot}`);
        // Wspólny rig: ten sam rozmiar części (pivot też, bo to ta sama specyfikacja części).
        expect([b.width, b.height]).toEqual([a.width, a.height]);
        let differentCoverage = 0;
        for (let i = 3; i < a.data.length; i += 4) {
          if ((a.data[i] ?? 0) > 128 !== (b.data[i] ?? 0) > 128) differentCoverage++;
        }
        // Sama zmiana palety dałaby zero: liczymy piksele, w których różni się pokrycie.
        expect(differentCoverage, `${evolved}/${slot}`).toBeGreaterThan(20);
      }
    }
  });

  it('atlas placeholderów ma szerokość będącą potęgą dwójki i mieści wszystkie sprite’y', () => {
    const { width, height } = built.meta;
    expect(Math.log2(width) % 1).toBe(0);
    expect(built.image.width).toBe(width);
    expect(built.image.height).toBe(height);
    for (const [x = 0, y = 0, w = 0, h = 0] of Object.values(built.meta.sprites)) {
      expect(x + w).toBeLessThanOrEqual(width);
      expect(y + h).toBeLessThanOrEqual(height);
    }
  });
});

describe('chooseAtlasWidth', () => {
  it('wybiera najmniejszą potęgę dwójki dającą mniej więcej kwadratowy atlas', () => {
    const item = (width: number, height: number) => ({ name: 'x', width, height });
    expect(chooseAtlasWidth([item(10, 10)])).toBe(256);
    expect(chooseAtlasWidth(new Array(40).fill(item(60, 60)))).toBe(512);
    expect(chooseAtlasWidth(new Array(400).fill(item(60, 60)))).toBe(2048);
  });

  it('mieści najszerszy sprite razem z marginesem', () => {
    expect(chooseAtlasWidth([{ name: 'wide', width: 255, height: 4 }])).toBe(512);
    expect(chooseAtlasWidth([{ name: 'wide', width: 252, height: 4 }])).toBe(256);
  });
});
