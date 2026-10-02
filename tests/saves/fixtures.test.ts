// Zapisane przykładowe pliki z każdej wersji zapisu (ADR 0005). Każdy musi wczytać się
// w bieżącej wersji gry: bezpośrednio albo przez łańcuch migracji. Nowa wersja zapisu dodaje
// tu plik tests/fixtures/saves/v<N>.json i oczekiwany wynik migracji.
import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import { reconcileSave } from '../../src/game/progress.ts';
import { decodeSave } from '../../src/game/save.ts';
import { SAVE_VERSION } from '../../src/game/save-schema.ts';
import v1 from '../fixtures/saves/v1.json' with { type: 'json' };

const FIXTURES: Readonly<Record<number, unknown>> = { 1: v1 };

describe('przykładowe pliki zapisów', () => {
  it('istnieje plik dla każdej wersji zapisu', () => {
    for (let version = 1; version <= SAVE_VERSION; version++) {
      expect(FIXTURES[version], `tests/fixtures/saves/v${version}.json`).toBeDefined();
    }
  });

  it.each(Object.keys(FIXTURES).map(Number))('zapis w wersji %i wczytuje się', (version) => {
    const decoded = decodeSave(JSON.stringify(FIXTURES[version]));
    expect(decoded.kind).toBe('ok');
    if (decoded.kind !== 'ok') return;
    expect(decoded.save.saveVersion).toBe(SAVE_VERSION);
    expect(decoded.migratedFrom).toBe(version === SAVE_VERSION ? null : version);
  });

  it('zapis w wersji 1 wczytuje się bez zmian', () => {
    expect(decodeSave(JSON.stringify(v1))).toEqual({ kind: 'ok', save: v1, migratedFrom: null });
  });

  it('wczytany zapis pasuje do treści gry: bohaterowie, runy i poziomy zostają', () => {
    const decoded = decodeSave(JSON.stringify(v1));
    if (decoded.kind !== 'ok') throw new Error('fixture v1 does not decode');
    expect(reconcileSave(requireContent(), decoded.save)).toEqual(decoded.save);
  });
});
