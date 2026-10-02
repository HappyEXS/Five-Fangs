import { describe, expect, it } from 'vitest';
import { gameVersion, versionLabel } from './version.ts';

describe('version', () => {
  it('ma wersję i commit wpieczone przy buildzie', () => {
    expect(gameVersion.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(gameVersion.commit).toMatch(/^([0-9a-f]{7,40}|unknown)$/);
    expect(Number.isNaN(Date.parse(gameVersion.builtAt))).toBe(false);
  });

  it('skraca commit w etykiecie', () => {
    const label = versionLabel({
      version: '1.2.3',
      commit: '5c1b596a0f3e4d2c8b7a6f5e4d3c2b1a09f8e7d6',
      builtAt: '2026-10-02T10:00:00.000Z',
    });
    expect(label).toBe('1.2.3 (5c1b596)');
    expect(versionLabel({ version: '1.2.3', commit: 'unknown', builtAt: '' })).toBe(
      '1.2.3 (unknown)',
    );
  });
});
