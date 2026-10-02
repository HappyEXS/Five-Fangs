import { describe, expect, it } from 'vitest';
import type { HeaderRule } from './render-config.ts';
import { checkSmoke, findAssetPath, readCommit, type SmokeInput } from './smoke.ts';

const rules: HeaderRule[] = [
  { path: '/assets/*', name: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  { path: '/', name: 'Cache-Control', value: 'no-cache' },
  { path: '/version.json', name: 'Cache-Control', value: 'no-cache' },
  { path: '/*', name: 'X-Content-Type-Options', value: 'nosniff' },
];

const secure = { 'x-content-type-options': 'nosniff' };

function input(overrides: Partial<SmokeInput> = {}): SmokeInput {
  return {
    expectedCommit: 'abc1234',
    rules,
    index: { status: 200, headers: { ...secure, 'cache-control': 'no-cache' } },
    version: { status: 200, headers: { ...secure, 'cache-control': 'no-cache' } },
    versionBody: '{"version":"0.1.0","commit":"abc1234","builtAt":"x"}',
    assetPath: '/assets/index-abc.js',
    asset: {
      status: 200,
      headers: {
        ...secure,
        'cache-control': 'public, max-age=31536000, immutable',
        'content-encoding': 'br',
      },
    },
    missing: { status: 404, headers: {} },
    ...overrides,
  };
}

describe('findAssetPath', () => {
  it('znajduje skrypt z assets niezależnie od zapisu ścieżki', () => {
    expect(findAssetPath('<script type="module" src="./assets/index-a1.js"></script>')).toBe(
      '/assets/index-a1.js',
    );
    expect(findAssetPath("<script src='/assets/index-a1.js'></script>")).toBe(
      '/assets/index-a1.js',
    );
    expect(findAssetPath('<script src="./main.js"></script>')).toBeNull();
  });
});

describe('readCommit', () => {
  it('czyta commit albo zwraca null', () => {
    expect(readCommit('{"commit":"abc1234"}')).toBe('abc1234');
    expect(readCommit('<!doctype html>')).toBeNull();
    expect(readCommit('{"commit":1}')).toBeNull();
  });
});

describe('checkSmoke', () => {
  it('poprawny deploy nie ma problemów', () => {
    expect(checkSmoke(input())).toEqual([]);
  });

  it('wykrywa stary commit', () => {
    expect(checkSmoke(input({ versionBody: '{"commit":"old0000"}' }))).toEqual([
      '/version.json: commit "old0000" zamiast "abc1234"',
    ]);
  });

  it('wykrywa brakujący i błędny nagłówek', () => {
    const problems = checkSmoke(
      input({
        index: { status: 200, headers: { 'cache-control': 'public, max-age=3600' } },
      }),
    );
    expect(problems).toEqual([
      '/: nagłówek cache-control ma wartość "public, max-age=3600" zamiast "no-cache"',
      '/: brak nagłówka x-content-type-options',
    ]);
  });

  it('wykrywa asset bez cache immutable i bez kompresji', () => {
    const problems = checkSmoke(
      input({ asset: { status: 200, headers: { ...secure, 'cache-control': 'no-cache' } } }),
    );
    expect(problems).toEqual([
      '/assets/index-abc.js: nagłówek cache-control ma wartość "no-cache" zamiast "public, max-age=31536000, immutable"',
      '/assets/index-abc.js: odpowiedź nie jest skompresowana',
    ]);
  });

  it('wykrywa regułę rewrite maskującą brakujące pliki', () => {
    expect(checkSmoke(input({ missing: { status: 200, headers: {} } }))).toEqual([
      'brakujący plik zwraca status 200 zamiast 404',
    ]);
  });

  it('wykrywa index bez skryptu i błędny status', () => {
    const problems = checkSmoke(
      input({ assetPath: null, asset: null, version: { status: 503, headers: {} } }),
    );
    expect(problems).toContain('/version.json: status 503 zamiast 200');
    expect(problems).toContain('/: index.html nie odwołuje się do żadnego skryptu z assets/');
  });
});
