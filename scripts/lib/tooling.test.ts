import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('narzędzia deweloperskie', () => {
  it('Dockerfile.dev instaluje biblioteki dla tej samej wersji Playwright co package.json', () => {
    const pkg = JSON.parse(read('package.json')) as { devDependencies: Record<string, string> };
    const version = pkg.devDependencies['@playwright/test'];
    // Wersja przypięta dokładnie: biblioteki systemowe i przeglądarka muszą do siebie pasować.
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(read('Dockerfile.dev')).toContain(`playwright@${version} install-deps chromium`);
  });
});
