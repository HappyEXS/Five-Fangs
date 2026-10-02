import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  allIgnored,
  globToRegExp,
  type HeaderRule,
  headerPathMatches,
  headersForPath,
  parseHeadersFile,
  parseIgnoredPaths,
  parseRenderHeaders,
} from './render-config.ts';

const renderYaml = readFileSync(new URL('../../render.yaml', import.meta.url), 'utf8');
const headersFile = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8');

const sorted = (rules: HeaderRule[]) =>
  rules.map((r) => `${r.path} | ${r.name} | ${r.value}`).sort();

describe('render.yaml i public/_headers', () => {
  it('opisują dokładnie te same nagłówki', () => {
    const fromRender = sorted(parseRenderHeaders(renderYaml));
    expect(fromRender.length).toBeGreaterThan(0);
    expect(sorted(parseHeadersFile(headersFile))).toEqual(fromRender);
  });

  it('pliki z hashem są cache’owane na zawsze, a wejścia zawsze sprawdzane', () => {
    const rules = parseRenderHeaders(renderYaml);
    expect(headersForPath(rules, '/assets/index-abc123.js')['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
    for (const path of ['/', '/index.html', '/version.json']) {
      expect(headersForPath(rules, path)['cache-control']).toBe('no-cache');
    }
  });

  it('każda ścieżka dostaje nagłówki bezpieczeństwa, a CSP nie dopuszcza inline', () => {
    const headers = headersForPath(parseRenderHeaders(renderYaml), '/assets/index-abc123.js');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toBeDefined();
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/https?:/);
  });

  it('żadna reguła nie ustawia Cache-Control dla wszystkich ścieżek naraz', () => {
    const catchAll = parseRenderHeaders(renderYaml).filter(
      (r) => r.path === '/*' && r.name.toLowerCase() === 'cache-control',
    );
    expect(catchAll).toEqual([]);
  });
});

describe('parseRenderHeaders', () => {
  it('czyta listę reguł i kończy na następnym kluczu', () => {
    const yaml = [
      'services:',
      '  - type: web',
      '    headers:',
      '      - path: /a/*',
      '        name: X-One',
      '        value: "quoted: value"',
      '      # komentarz',
      '      - path: /*',
      '        name: X-Two',
      '        value: plain',
      '    routes:',
      '      - path: /ignored',
      '        name: X-Three',
      '        value: nope',
    ].join('\n');
    expect(parseRenderHeaders(yaml)).toEqual([
      { path: '/a/*', name: 'X-One', value: 'quoted: value' },
      { path: '/*', name: 'X-Two', value: 'plain' },
    ]);
  });
});

describe('parseIgnoredPaths i allIgnored', () => {
  const ignored = parseIgnoredPaths(renderYaml);

  it('czyta wzorce z render.yaml', () => {
    expect(ignored).toContain('docs/**');
    expect(ignored).toContain('**/*.md');
  });

  it('zmiana tylko w dokumentacji i testach pomija deploy', () => {
    expect(allIgnored(['docs/ROADMAP.md', 'README.md', 'src/sim/tick.test.ts'], ignored)).toBe(
      true,
    );
  });

  it('zmiana w kodzie albo konfiguracji wymaga deployu', () => {
    expect(allIgnored(['docs/ROADMAP.md', 'src/sim/tick.ts'], ignored)).toBe(false);
    expect(allIgnored(['render.yaml'], ignored)).toBe(false);
    expect(allIgnored([], ignored)).toBe(false);
  });
});

describe('globToRegExp', () => {
  it('rozróżnia * i **', () => {
    expect(globToRegExp('/assets/*').test('/assets/a.js')).toBe(true);
    expect(globToRegExp('/assets/*').test('/assets/sub/a.js')).toBe(false);
    expect(globToRegExp('docs/**').test('docs/adr/0001.md')).toBe(true);
    expect(globToRegExp('**/*.md').test('CLAUDE.md')).toBe(true);
    expect(globToRegExp('**/*.md').test('docs/adr/0001.md')).toBe(true);
    expect(globToRegExp('**/*.md').test('src/main.ts')).toBe(false);
  });
});

describe('headerPathMatches', () => {
  it('gwiazdka w regule nagłówka obejmuje także ukośniki', () => {
    expect(headerPathMatches('/*', '/')).toBe(true);
    expect(headerPathMatches('/*', '/assets/index-abc.js')).toBe(true);
    expect(headerPathMatches('/assets/*', '/assets/index-abc.js')).toBe(true);
    expect(headerPathMatches('/assets/*', '/version.json')).toBe(false);
    expect(headerPathMatches('/index.html', '/index.html')).toBe(true);
    expect(headerPathMatches('/index.html', '/indexXhtml')).toBe(false);
  });
});
