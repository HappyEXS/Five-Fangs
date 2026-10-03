import { describe, expect, it } from 'vitest';
import { DEBUG_MARKER, DEV_TOOLS_MARKER } from '../../src/core/dev-markers.ts';
import { checkDist, type DistTextFile } from './dist-checks.ts';

const version = JSON.stringify({ version: '0.1.0', commit: 'abcdef1', builtAt: '2026-10-02' });
const html = '<link rel="stylesheet" href="./assets/a.css"><script src="./assets/a.js"></script>';

function dist(overrides: Record<string, string | null> = {}): DistTextFile[] {
  const files: Record<string, string | null> = {
    'index.html': html,
    'version.json': version,
    'assets/a.js': 'console.log(1)',
    'assets/a.css': 'body{}',
    'assets/heroes-abc.webp': null,
    ...overrides,
  };
  return Object.entries(files).map(([path, text]) => ({ path, text }));
}

describe('checkDist', () => {
  it('poprawny build nie ma problemów', () => {
    expect(checkDist(dist())).toEqual([]);
  });

  it('wymaga index.html, version.json i pliku JS', () => {
    expect(checkDist([])).toEqual([
      'brak index.html',
      'brak version.json',
      'brak plików JS w assets/',
    ]);
  });

  it('wykrywa pliki i znaczniki narzędzi dev oraz kodu debug', () => {
    const problems = checkDist(
      dist({
        'tools.html': '<html></html>',
        'assets/b.js': `x("${DEV_TOOLS_MARKER}")`,
        'assets/c.js': `y("${DEBUG_MARKER}")`,
      }),
    );
    expect(problems).toEqual([
      'tools.html: plik narzędzi dev w buildzie produkcyjnym',
      `assets/b.js: znacznik kodu deweloperskiego "${DEV_TOOLS_MARKER}"`,
      `assets/c.js: znacznik kodu deweloperskiego "${DEBUG_MARKER}"`,
    ]);
  });

  it('nie szuka znaczników w source mapach', () => {
    expect(
      checkDist(dist({ 'assets/a.js.map': `{"sourcesContent":["${DEBUG_MARKER}"]}` })),
    ).toEqual([]);
  });

  it('odrzuca adresy bezwzględne i zewnętrzne w HTML', () => {
    const problems = checkDist(
      dist({
        'index.html':
          '<script src="/assets/a.js"></script><link href="https://fonts.example/x.css"><img src="data:image/png;base64,AA">',
      }),
    );
    expect(problems).toEqual([
      'index.html: adres nie jest względny: "/assets/a.js"',
      'index.html: adres nie jest względny: "https://fonts.example/x.css"',
    ]);
  });

  it('sprawdza zawartość version.json', () => {
    expect(checkDist(dist({ 'version.json': 'nie json' }))).toEqual([
      'version.json nie jest poprawnym JSON-em',
    ]);
    expect(checkDist(dist({ 'version.json': '{"version":"0.1.0","commit":""}' }))).toEqual([
      'version.json: brak pola "commit"',
      'version.json: brak pola "builtAt"',
    ]);
  });
});
