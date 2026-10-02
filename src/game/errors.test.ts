import { beforeEach, describe, expect, it } from 'vitest';
import { clearErrors, MAX_ERRORS, recentErrors, recordError } from './errors.ts';

const at = new Date('2026-10-02T10:00:00Z');

describe('errors', () => {
  beforeEach(clearErrors);

  it('zapisuje błąd z nazwą, komunikatem, stosem i kontekstem', () => {
    recordError('load', new TypeError('Failed to fetch'), 'atlas:world_2', at);
    const [entry] = recentErrors();
    expect(entry).toMatchObject({
      at: '2026-10-02T10:00:00.000Z',
      kind: 'load',
      message: 'TypeError: Failed to fetch',
      context: 'atlas:world_2',
    });
    expect(entry?.stack).toContain('TypeError');
  });

  it('opisuje wartości, które nie są obiektem Error', () => {
    recordError('unhandledrejection', 'zwykły napis', null, at);
    recordError('unhandledrejection', { code: 42 }, null, at);
    recordError('unhandledrejection', undefined, null, at);
    expect(recentErrors().map((e) => e.message)).toEqual([
      'zwykły napis',
      '{"code":42}',
      'undefined',
    ]);
  });

  it('nie wywraca się na wartości, której nie da się zserializować', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    recordError('error', cyclic, null, at);
    expect(recentErrors()).toHaveLength(1);
  });

  it('trzyma tylko ostatnie błędy', () => {
    for (let i = 0; i < MAX_ERRORS + 5; i++) recordError('error', `błąd ${i}`, null, at);
    const errors = recentErrors();
    expect(errors).toHaveLength(MAX_ERRORS);
    expect(errors[0]?.message).toBe('błąd 5');
    expect(errors.at(-1)?.message).toBe(`błąd ${MAX_ERRORS + 4}`);
  });

  it('zwraca kopię, której zmiana nie psuje bufora', () => {
    recordError('error', 'oryginał', null, at);
    const copy = recentErrors();
    copy.length = 0;
    expect(recentErrors()).toHaveLength(1);
  });
});
