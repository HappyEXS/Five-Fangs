// Zapisane przykładowe pliki z każdej wersji zapisu (ADR 0005). Każdy musi wczytać się
// w bieżącej wersji gry: bezpośrednio albo przez łańcuch migracji. Nowa wersja zapisu dodaje
// tu plik tests/fixtures/saves/v<N>.json i oczekiwany wynik migracji.
import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import { reconcileSave } from '../../src/game/progress.ts';
import { decodeSave } from '../../src/game/save.ts';
import { SAVE_VERSION } from '../../src/game/save-schema.ts';
import v1 from '../fixtures/saves/v1.json' with { type: 'json' };
import v2 from '../fixtures/saves/v2.json' with { type: 'json' };

const FIXTURES: Readonly<Record<number, unknown>> = { 1: v1, 2: v2 };

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

  it('zapis w bieżącej wersji wczytuje się bez zmian', () => {
    expect(decodeSave(JSON.stringify(v2))).toEqual({ kind: 'ok', save: v2, migratedFrom: null });
  });

  it('migracja v1 → v2 zamienia stan linii na bohaterów i przenosi skład', () => {
    const decoded = decodeSave(JSON.stringify(v1));
    expect(decoded).toEqual({
      kind: 'ok',
      migratedFrom: 1,
      save: {
        saveVersion: 2,
        gameVersion: '0.1.0',
        gold: 135,
        // Każda linia z v1 to jeden bohater; id nadane w kolejności linii w zapisie.
        heroes: [
          { id: 1, line: 'swordsman', form: 0, upgrades: 3, runes: ['rune_hp_200', null] },
          { id: 2, line: 'archer', form: 1, upgrades: 1, runes: [null, null] },
        ],
        nextHeroId: 3,
        runes: ['rune_hp_200', 'rune_attack_25'],
        levels: {
          w1_l1: { cleared: true, bestTicks: 412 },
          w1_l2: { cleared: true, bestTicks: 655 },
          w1_l3: { cleared: true, bestTicks: 731 },
          w1_l4: { cleared: true, bestTicks: 1180 },
        },
        squad: [1, 2, null, null, null],
        settings: { lang: 'pl', battleSpeed: 2 },
      },
    });
  });

  it('wczytane zapisy pasują do treści gry: bohaterowie, runy i poziomy zostają', () => {
    const content = requireContent();
    for (const fixture of Object.values(FIXTURES)) {
      const decoded = decodeSave(JSON.stringify(fixture));
      if (decoded.kind !== 'ok') throw new Error('fixture does not decode');
      expect(reconcileSave(content, decoded.save)).toEqual(decoded.save);
    }
  });
});
