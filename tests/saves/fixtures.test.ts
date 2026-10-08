// Zapisane przykładowe pliki z każdej wersji zapisu (ADR 0005). Każdy musi wczytać się
// w bieżącej wersji gry: bezpośrednio albo przez łańcuch migracji. Nowa wersja zapisu dodaje
// tu plik tests/fixtures/saves/v<N>.json i oczekiwany wynik migracji.
import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import { reconcileSave } from '../../src/game/progress.ts';
import { runeTokens } from '../../src/game/runes.ts';
import { decodeSave } from '../../src/game/save.ts';
import { SAVE_VERSION } from '../../src/game/save-schema.ts';
import v1 from '../fixtures/saves/v1.json' with { type: 'json' };
import v2 from '../fixtures/saves/v2.json' with { type: 'json' };
import v3 from '../fixtures/saves/v3.json' with { type: 'json' };
import v4 from '../fixtures/saves/v4.json' with { type: 'json' };
import v5 from '../fixtures/saves/v5.json' with { type: 'json' };

const FIXTURES: Readonly<Record<number, unknown>> = { 1: v1, 2: v2, 3: v3, 4: v4, 5: v5 };

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
    expect(decodeSave(JSON.stringify(v5))).toEqual({ kind: 'ok', save: v5, migratedFrom: null });
  });

  it('migracje od v1 zamieniają stan linii na bohaterów, a indeks formy na jej id', () => {
    const decoded = decodeSave(JSON.stringify(v1));
    expect(decoded).toEqual({
      kind: 'ok',
      migratedFrom: 1,
      save: {
        saveVersion: 5,
        gameVersion: '0.1.0',
        gold: 135,
        // Każda linia z v1 to jeden bohater; id nadane w kolejności linii w zapisie. Dawne runy
        // z nagród za poziomy znikają w v4 → v5.
        heroes: [
          { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 3, runes: [null, null] },
          { id: 2, line: 'archer', form: 'archer_b', upgrades: 1, runes: [null, null] },
        ],
        nextHeroId: 3,
        runes: [],
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
    // Dalej, w v3 → v4, Tarczownik z dawnej linii Tarczowników trafia do Mieczników.
    expect(decoded.save.heroes.map((hero) => hero.line)).toEqual([
      'swordsman',
      'archer',
      'swordsman',
      'swordsman',
    ]);
    // Reszta zapisu przechodzi bez zmian.
    expect(decoded.save.squad).toEqual(v2.squad);
    expect(decoded.save.levels).toEqual(v2.levels);
  });

  it('migracja v2 → v3 nie zgaduje formy spoza 0 i 1: taki zapis jest uszkodzony', () => {
    const broken = { ...v2, heroes: [{ ...v2.heroes[0], form: 7 }] };
    expect(decodeSave(JSON.stringify(broken)).kind).toBe('corrupt');
  });

  it('migracja v3 → v4 przenosi bohaterów dawnych linii i form-kopii do dwóch szczepów ludzi', () => {
    const decoded = decodeSave(JSON.stringify(v3));
    if (decoded.kind !== 'ok') throw new Error('v3 does not decode');
    expect(decoded.migratedFrom).toBe(3);
    // „Strażnik (kopia)” z linii Mieczników i Strażnik z linii Tarczowników to dziś ta sama forma
    // szczepu Mieczników; „Strzelec wyborowy II” ma dalej swoje id. Ulepszenia zostają; dawne
    // runy zabiera dopiero następna migracja.
    expect(decoded.save.heroes).toEqual([
      { id: 1, line: 'swordsman', form: 'guard_b', upgrades: 4, runes: [null, null] },
      { id: 2, line: 'archer', form: 'archer_b2', upgrades: 1, runes: [null, null] },
      { id: 3, line: 'swordsman', form: 'swordsman_a', upgrades: 0, runes: [null, null] },
      { id: 4, line: 'swordsman', form: 'guard_b', upgrades: 2, runes: [null, null] },
    ]);
    // Reszta zapisu przechodzi bez zmian.
    expect(decoded.save.squad).toEqual(v3.squad);
    expect(decoded.save.gold).toBe(v3.gold);
    expect(decoded.save.levels).toEqual(v3.levels);
  });

  it('migracja v3 → v4 zna każdą linię i formę, która znikła z treści gry', () => {
    const gone: [line: string, form: string, toLine: string, toForm: string][] = [
      ['swordsman', 'swordsman_c', 'swordsman', 'guard_b'],
      ['swordsman', 'swordsman_c2', 'swordsman', 'guard_b'],
      ['guard', 'guard_a', 'swordsman', 'guard_a'],
      ['guard', 'guard_b', 'swordsman', 'guard_b'],
      ['guard', 'guard_b2', 'swordsman', 'guard_b'],
      ['guard', 'guard_c', 'swordsman', 'swordsman_b'],
      ['guard', 'guard_c2', 'swordsman', 'swordsman_b2'],
      ['archer', 'archer_c', 'archer', 'cleric_b'],
      ['archer', 'archer_c2', 'archer', 'cleric_b'],
      ['cleric', 'cleric_a', 'archer', 'cleric_a'],
      ['cleric', 'cleric_b', 'archer', 'cleric_b'],
      ['cleric', 'cleric_b2', 'archer', 'cleric_b'],
      ['cleric', 'cleric_c', 'archer', 'archer_b'],
      ['cleric', 'cleric_c2', 'archer', 'archer_b2'],
    ];
    const content = requireContent();
    const old = {
      ...v3,
      heroes: gone.map(([line, form], index) => ({
        id: index + 1,
        line,
        form,
        upgrades: 3,
        runes: [null, null],
      })),
      nextHeroId: gone.length + 1,
      squad: [1, 2, 3, 4, 5],
    };
    const decoded = decodeSave(JSON.stringify(old));
    if (decoded.kind !== 'ok') throw new Error('old save does not decode');
    expect(decoded.save.heroes.map((hero) => [hero.line, hero.form])).toEqual(
      gone.map(([, , toLine, toForm]) => [toLine, toForm]),
    );
    // Żaden bohater nie przepada ani nie wraca do formy bazowej przy dopasowaniu do treści.
    const reconciled = reconcileSave(content, decoded.save);
    expect(reconciled.heroes).toEqual(decoded.save.heroes);
    expect(reconciled.heroes.every((hero) => hero.upgrades === 3)).toBe(true);
    expect(reconciled.squad).toEqual([1, 2, 3, 4, 5]);
  });

  it('migracja v4 → v5 zabiera dawne runy z nagród, a żetony wynikają z przeszłych poziomów', () => {
    const decoded = decodeSave(JSON.stringify(v4));
    if (decoded.kind !== 'ok') throw new Error('v4 does not decode');
    expect(decoded.migratedFrom).toBe(4);
    // Zapis v4 miał trzy runy z nagród, dwie z nich w gniazdach bohaterów.
    expect(v4.runes).toHaveLength(3);
    expect(decoded.save.runes).toEqual([]);
    expect(decoded.save.heroes.map((hero) => hero.runes)).toEqual(
      v4.heroes.map(() => [null, null]),
    );
    // Reszta zapisu przechodzi bez zmian: bohaterowie, złoto, poziomy, skład i ustawienia.
    expect(decoded.save.heroes.map(({ runes, ...hero }) => hero)).toEqual(
      v4.heroes.map(({ runes, ...hero }) => hero),
    );
    expect(decoded.save).toMatchObject({
      gold: v4.gold,
      levels: v4.levels,
      squad: v4.squad,
      settings: v4.settings,
      nextHeroId: v4.nextHeroId,
    });
    // Gracz przeszedł trzy pierwsze poziomy; drugi daje dziś żeton run, więc ma go do wydania.
    expect(runeTokens(requireContent(), decoded.save)).toBe(1);
  });

  it('zapis v5 ma runy drzewka w zapasie i w gniazdach oraz żeton do wydania', () => {
    const content = requireContent();
    const decoded = decodeSave(JSON.stringify(v5));
    if (decoded.kind !== 'ok') throw new Error('v5 does not decode');
    for (const rune of decoded.save.runes) expect(content.runes.has(rune), rune).toBe(true);
    // Cztery żetony za poziomy 2 i 5 dwóch światów, trzy wydane.
    expect(runeTokens(content, decoded.save)).toBe(1);
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
