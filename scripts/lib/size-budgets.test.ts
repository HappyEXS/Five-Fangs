import { describe, expect, it } from 'vitest';
import {
  type DistFileSize,
  evaluateBudgets,
  FIRST_LOAD_LIMIT,
  formatBytes,
  JS_GZIP_LIMIT,
  transferSize,
  WORLD_ATLAS_LIMIT,
} from './size-budgets.ts';

const file = (path: string, raw: number, gzip = raw): DistFileSize => ({ path, raw, gzip });

function result(files: DistFileSize[], id: string) {
  const found = evaluateBudgets(files).find((r) => r.id === id);
  if (found === undefined) throw new Error(`no budget ${id}`);
  return found;
}

describe('transferSize', () => {
  it('liczy tekst po kompresji, a pliki binarne w całości', () => {
    expect(transferSize(file('assets/a.js', 1000, 300))).toBe(300);
    expect(transferSize(file('index.html', 500, 200))).toBe(200);
    expect(transferSize(file('assets/heroes.webp', 1000, 990))).toBe(1000);
    expect(transferSize(file('assets/font.woff2', 800, 800))).toBe(800);
  });
});

describe('evaluateBudgets', () => {
  it('mały build mieści się we wszystkich budżetach', () => {
    const results = evaluateBudgets([
      file('index.html', 500, 300),
      file('assets/index.js', 25_000, 10_000),
      file('assets/index.css', 1_600, 700),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results.map((r) => r.bytes)).toEqual([10_000, 11_000, 0]);
  });

  it('sumuje gzip wszystkich plików JS i odrzuca przekroczenie', () => {
    const js = result(
      [file('assets/a.js', 400_000, 100_000), file('assets/b.js', 300_000, 60_000)],
      'js-gzip',
    );
    expect(js.bytes).toBe(160_000);
    expect(js.limit).toBe(JS_GZIP_LIMIT);
    expect(js.ok).toBe(false);
  });

  it('nie wlicza source map', () => {
    const files = [file('assets/a.js', 1000, 400), file('assets/a.js.map', 5_000_000, 900_000)];
    expect(result(files, 'js-gzip').bytes).toBe(400);
    expect(result(files, 'first-load').bytes).toBe(400);
  });

  it('pierwsze uruchomienie obejmuje świat 1, ale nie kolejne światy', () => {
    const files = [
      file('assets/index.js', 1000, 400),
      file('assets/heroes-abc.webp', 300_000),
      file('assets/world_1-abc.webp', 500_000),
      file('assets/world_2-def.webp', 700_000),
    ];
    expect(result(files, 'first-load').bytes).toBe(400 + 300_000 + 500_000);
  });

  it('odrzuca pierwsze uruchomienie powyżej 2 MB', () => {
    const first = result([file('assets/heroes-abc.webp', FIRST_LOAD_LIMIT + 1)], 'first-load');
    expect(first.ok).toBe(false);
  });

  it('sprawdza największy plik świata', () => {
    const files = [
      file('assets/world_1-abc.webp', 500_000),
      file('assets/world_3-xyz.webp', WORLD_ATLAS_LIMIT + 1),
    ];
    const world = result(files, 'world-atlas');
    expect(world.ok).toBe(false);
    expect(world.file).toBe('assets/world_3-xyz.webp');
  });
});

describe('formatBytes', () => {
  it('formatuje w KB i MB', () => {
    expect(formatBytes(10_240)).toBe('10.0 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
  });
});
