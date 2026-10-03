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
import v3 from '../fixtures/saves/v3.json' with { type: 'json' };

const FIXTURES: Readonly<Record<number, unknown>> = { 1: v1, 2: v2, 3: v3 };

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
    expect(decodeSave(JSON.stringify(v3))).toEqual({ kind: 'ok', save: v3, migratedFrom: null });
  });

  it('migracje v1 → v3 zamieniają stan linii na bohaterów, a indeks formy na jej id', () => {
    const decoded = decodeSave(JSON.stringify(v1));
    expect(decoded).toEqual({
      kind: 'ok',
      migratedFrom: 1,
      save: {
        saveVersion: 3,
        gameVersion: '0.1.0',
        gold: 135,
        // Każda linia z v1 to jeden bohater; id nadane w kolejności linii w zapisie.
        heroes: [
          {
            id: 1,
            line: 'swordsman',
            form: 'swordsman_a',
            upgrades: 3,
            runes: ['rune_hp_200', null],
          },
          { id: 2, line: 'archer', form: 'archer_b', upgrades: 1, runes: [null, null] },
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

  it('migracja v2 → v3 zamienia indeks formy (0 bazowa, 1 po ewolucji) na id jednostki', () => {
    const decoded = decodeSave(JSON.stringify(v2));
    if (decoded.kind !== 'ok') throw new Error('v2 does not decode');
    expect(decoded.migratedFrom).toBe(2);
    expect(decoded.save.heroes.map((hero) => [hero.id, hero.form, hero.upgrades])).toEqual([
      [1, 'swordsman_b', 2],
      [2, 'archer_a', 4],
      [3, 'swordsman_a', 0],
      [4, 'guard_a', 1],
    ]);
    // Reszta zapisu przechodzi bez zmian.
    expect(decoded.save.squad).toEqual(v2.squad);
    expect(decoded.save.runes).toEqual(v2.runes);
  });

  it('migracja v2 → v3 nie zgaduje formy spoza 0 i 1: taki zapis jest uszkodzony', () => {
    const broken = { ...v2, heroes: [{ ...v2.heroes[0], form: 7 }] };
    expect(decodeSave(JSON.stringify(broken)).kind).toBe('corrupt');
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
