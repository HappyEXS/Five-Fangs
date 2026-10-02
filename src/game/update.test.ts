import { beforeEach, describe, expect, it } from 'vitest';
import { clearErrors, recentErrors } from './errors.ts';
import { checkForUpdate, guardedLoad, loadFailure, onBeforeReload, reloadGame } from './update.ts';
import type { GameVersion } from './version.ts';

const current: GameVersion = { version: '0.1.0', commit: 'aaaaaaa', builtAt: '' };
const serves = (body: unknown) => () => Promise.resolve(body);
const fails = () => Promise.reject(new TypeError('Failed to fetch'));

describe('checkForUpdate', () => {
  it('rozpoznaje tę samą i nowszą wersję po skrócie commita', async () => {
    expect(await checkForUpdate(current, serves({ commit: 'aaaaaaa' }))).toBe('current');
    expect(await checkForUpdate(current, serves({ commit: 'bbbbbbb' }))).toBe('outdated');
  });

  it('zwraca "unknown" przy braku sieci albo nieczytelnej odpowiedzi', async () => {
    expect(await checkForUpdate(current, fails)).toBe('unknown');
    expect(await checkForUpdate(current, serves('<!doctype html>'))).toBe('unknown');
    expect(await checkForUpdate(current, serves({ commit: 42 }))).toBe('unknown');
    expect(await checkForUpdate(current, serves(null))).toBe('unknown');
  });
});

describe('guardedLoad', () => {
  beforeEach(() => {
    loadFailure.value = 'none';
    clearErrors();
  });

  it('przekazuje wynik udanego ładowania i niczego nie zgłasza', async () => {
    const result = await guardedLoad(
      'chunk',
      () => Promise.resolve(42),
      () => Promise.resolve('outdated'),
    );
    expect(result).toBe(42);
    expect(loadFailure.value).toBe('none');
    expect(recentErrors()).toEqual([]);
  });

  it('nieudany import przy nowszej wersji na serwerze pokazuje komunikat o nowej wersji', async () => {
    const load = guardedLoad('chunk:battle', fails, () =>
      checkForUpdate(current, serves({ commit: 'bbbbbbb' })),
    );
    await expect(load).rejects.toThrow('Failed to fetch');
    expect(loadFailure.value).toBe('update');
    expect(recentErrors()[0]).toMatchObject({ kind: 'load', context: 'chunk:battle' });
  });

  it('nieudane ładowanie bez nowej wersji zgłasza problem z połączeniem', async () => {
    await expect(
      guardedLoad('atlas:world_2', fails, () => checkForUpdate(current, fails)),
    ).rejects.toThrow();
    expect(loadFailure.value).toBe('offline');

    loadFailure.value = 'none';
    await expect(
      guardedLoad('atlas:world_2', fails, () =>
        checkForUpdate(current, serves({ commit: 'aaaaaaa' })),
      ),
    ).rejects.toThrow();
    expect(loadFailure.value).toBe('offline');
  });
});

describe('reloadGame', () => {
  it('wykonuje zarejestrowane czynności przed przeładowaniem, także gdy jedna zawiedzie', () => {
    clearErrors();
    const order: string[] = [];
    onBeforeReload(() => {
      order.push('save');
    });
    onBeforeReload(() => {
      throw new Error('zapis nieudany');
    });
    onBeforeReload(() => {
      order.push('flush');
    });
    reloadGame(() => {
      order.push('reload');
    });
    expect(order).toEqual(['save', 'flush', 'reload']);
    expect(recentErrors()[0]).toMatchObject({ kind: 'error', context: 'beforeReload' });
  });
});
