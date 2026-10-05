import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AtlasSourceError,
  buildAtlas,
  listAtlasNames,
  loadAtlasSource,
  outputPaths,
  SOURCE_ROOT,
  sameVisiblePixels,
  serializeMeta,
  staleReasons,
} from './atlas-pipeline.ts';
import { MANIFEST_FILE, spriteNameOf } from './atlas-source.ts';
import { decodeImage, encodeWebp } from './image-codec.ts';
import { placeholderManifest, placeholderSprites } from './placeholder-parts.ts';
import { circle, createImage, encodePng, fill, hex } from './raster.ts';

const REPO = process.cwd();

function dot(size: number, color: string) {
  const image = createImage(size, size);
  fill(image, circle(size / 2, size / 2, size / 2 - 1), hex(color));
  return image;
}

const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Tymczasowe repozytorium z jednym atlasem `test`. */
function tempAtlas(manifest: unknown, files: Record<string, Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), 'ff-atlas-'));
  temporary.push(root);
  const dir = join(root, SOURCE_ROOT, 'test');
  mkdirSync(dir, { recursive: true });
  if (manifest !== null) writeFileSync(join(dir, MANIFEST_FILE), JSON.stringify(manifest));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return root;
}

describe('kodek obrazów', () => {
  it('bezstratny WebP dekoduje się do tych samych widocznych pikseli', async () => {
    const image = dot(24, '#3366cc');
    const decoded = await decodeImage(await encodeWebp(image, { lossless: true, quality: 90 }));
    expect(sameVisiblePixels(image, decoded)).toBe(true);
  });

  it('dekoduje PNG zapisany przez własny koder', async () => {
    const image = dot(9, '#cc6633');
    const decoded = await decodeImage(encodePng(image));
    expect(decoded.width).toBe(9);
    expect(Array.from(decoded.data)).toEqual(Array.from(image.data));
  });
});

describe('sameVisiblePixels', () => {
  it('ignoruje kolor w pełni przezroczystych pikseli, ale nie alfę ani wymiary', () => {
    const a = createImage(2, 1);
    const b = createImage(2, 1);
    a.data.set([10, 20, 30, 255, 0, 0, 0, 0]);
    b.data.set([10, 20, 30, 255, 99, 99, 99, 0]);
    expect(sameVisiblePixels(a, b)).toBe(true);
    b.data[7] = 1;
    expect(sameVisiblePixels(a, b)).toBe(false);
    b.data.set([10, 20, 31, 255, 0, 0, 0, 0]);
    expect(sameVisiblePixels(a, b)).toBe(false);
    expect(sameVisiblePixels(a, createImage(1, 2))).toBe(false);
  });
});

describe('loadAtlasSource', () => {
  it('czyta grafiki z podkatalogów i przypisuje pivoty', async () => {
    const root = tempAtlas(
      { pixelsPerUnit: 2, pivots: { '*/dot': [3, 3], 'fx/spark': [1, 2] } },
      {
        'hero/dot.png': encodePng(dot(12, '#ff0000')),
        'fx/spark.png': encodePng(dot(6, '#ffff00')),
      },
    );
    expect(listAtlasNames(root)).toEqual(['test']);
    const source = await loadAtlasSource(root, 'test');
    expect(source.pixelsPerUnit).toBe(2);
    expect(source.sprites.map((s) => [s.name, s.image.width, s.pivotX, s.pivotY])).toEqual([
      ['fx/spark', 6, 1, 2],
      ['hero/dot', 12, 3, 3],
    ]);

    const built = await buildAtlas(source);
    expect(built.meta.sprites['hero/dot']?.slice(2)).toEqual([12, 12, 3, 3]);
    expect(sameVisiblePixels(built.image, await decodeImage(built.webp))).toBe(true);
  });

  it('zgłasza brak manifestu, błąd schematu, złą nazwę i brakujący pivot', async () => {
    const png = encodePng(dot(4, '#ffffff'));
    await expect(loadAtlasSource(tempAtlas(null, { 'a.png': png }), 'test')).rejects.toThrow(
      /brak pliku atlas\.json/,
    );
    await expect(
      loadAtlasSource(tempAtlas({ pixelsPerUnit: 0, pivots: {} }, { 'a.png': png }), 'test'),
    ).rejects.toThrow(AtlasSourceError);
    await expect(
      loadAtlasSource(tempAtlas({ pixelsPerUnit: 2, pivots: {} }, { 'Big Dot.png': png }), 'test'),
    ).rejects.toThrow(/małe litery/);
    await expect(
      loadAtlasSource(tempAtlas({ pixelsPerUnit: 2, pivots: {} }, { 'a.png': png }), 'test'),
    ).rejects.toThrow(/nie ma pivota/);
    await expect(
      loadAtlasSource(tempAtlas({ pixelsPerUnit: 2, pivots: {} }, {}), 'test'),
    ).rejects.toThrow(/brak plików PNG/);
  });
});

describe('staleReasons', () => {
  it('wykrywa brak plików, zmienione metadane i zmieniony obraz', async () => {
    const root = tempAtlas(
      { pixelsPerUnit: 2, pivots: { dot: [3, 3] } },
      { 'dot.png': encodePng(dot(12, '#ff0000')) },
    );
    const source = await loadAtlasSource(root, 'test');
    expect(await staleReasons(root, source)).toEqual(['brak wygenerowanych plików']);

    const built = await buildAtlas(source);
    const paths = outputPaths(root, 'test');
    mkdirSync(join(paths.image, '..'), { recursive: true });
    writeFileSync(paths.image, built.webp);
    writeFileSync(paths.meta, serializeMeta(built.meta));
    expect(await staleReasons(root, source)).toEqual([]);

    // Zmiana pivota w manifeście zmienia tylko metadane, zmiana grafiki tylko obraz.
    const moved = { ...source, sprites: source.sprites.map((s) => ({ ...s, pivotX: 4 })) };
    expect(await staleReasons(root, moved)).toEqual(['metadane różnią się od źródeł']);
    const repainted = {
      ...source,
      sprites: source.sprites.map((s) => ({ ...s, image: dot(12, '#00ff00') })),
    };
    expect(await staleReasons(root, repainted)).toEqual(['obraz różni się od źródeł']);
  });
});

// Oba testy rysują albo dekodują wszystkie grafiki; przy pomiarze pokrycia trwa to kilka razy
// dłużej niż zwykle, stąd własny limit czasu.
const HEAVY_TEST_MS = 30_000;

describe('pliki w repozytorium', () => {
  it('źródła placeholder w assets/src/units są aktualne względem generatora', {
    timeout: HEAVY_TEST_MS,
  }, () => {
    const dir = join(REPO, SOURCE_ROOT, 'units');
    const sprites = placeholderSprites();
    const hint = 'uruchom: pnpm atlas:placeholder && pnpm atlas';
    for (const sprite of sprites) {
      const file = readFileSync(join(dir, `${sprite.name}.png`));
      expect(file.equals(encodePng(sprite.image)), `${sprite.name}: ${hint}`).toBe(true);
    }
    expect(JSON.parse(readFileSync(join(dir, MANIFEST_FILE), 'utf8')), hint).toEqual(
      placeholderManifest(sprites),
    );
    const onDisk = readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((entry) => entry.isFile())
      .map((entry) => spriteNameOf(relative(dir, join(entry.parentPath, entry.name))))
      .filter((name) => name !== null)
      .sort();
    expect(onDisk, hint).toEqual(sprites.map((sprite) => sprite.name).sort());
  });

  it('każdy atlas w src/assets/generated odpowiada swoim źródłom', {
    timeout: HEAVY_TEST_MS,
  }, async () => {
    const names = listAtlasNames(REPO);
    expect(names).toContain('units');
    for (const name of names) {
      const source = await loadAtlasSource(REPO, name);
      expect(await staleReasons(REPO, source), `${name}: uruchom pnpm atlas`).toEqual([]);
    }
  });
});
