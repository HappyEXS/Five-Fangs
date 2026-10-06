import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  decodeSave,
  decodeWith,
  encodeSave,
  loadSave,
  SAVE_KEY,
  type SaveFormat,
  type SaveStorage,
  storeSave,
} from './save.ts';
import { MIGRATIONS } from './save-migrations.ts';
import { SAVE_VERSION, type Save } from './save-schema.ts';

// Przykładowe pliki zapisów z kolejnych wersji gry sprawdza tests/saves/fixtures.test.ts.
const sample: Save = {
  saveVersion: 4,
  gameVersion: '0.1.0',
  gold: 135,
  heroes: [
    { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 3, runes: ['rune_hp_200', null] },
    { id: 2, line: 'archer', form: 'archer_b', upgrades: 1, runes: [null, null] },
    { id: 3, line: 'swordsman', form: 'pavise_guard', upgrades: 0, runes: [null, null] },
  ],
  nextHeroId: 4,
  runes: ['rune_hp_200', 'rune_attack_25'],
  levels: { w1_l1: { cleared: true, bestTicks: 412 } },
  squad: [1, 2, null, 3, null],
  settings: { lang: 'pl', battleSpeed: 2 },
};
const sampleText = JSON.stringify(sample);

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: SaveStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
}

const throwingStorage: SaveStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('decodeSave', () => {
  it('zapis zakodowany i odczytany jest identyczny', () => {
    expect(decodeSave(encodeSave(sample))).toEqual({
      kind: 'ok',
      save: sample,
      migratedFrom: null,
    });
  });

  it.each([
    ['tekst, który nie jest JSON-em', '{ "saveVersion": 1,'],
    ['tablica zamiast obiektu', '[1, 2, 3]'],
    ['brak numeru wersji', '{ "gold": 5 }'],
    ['wersja, która nie jest liczbą całkowitą', '{ "saveVersion": "1" }'],
    ['wersja zerowa', '{ "saveVersion": 0 }'],
    ['pusty zapis w bieżącej wersji', `{ "saveVersion": ${SAVE_VERSION} }`],
    // Migracja nie zakłada niczego o danych; braki wyłapuje schemat po migracji.
    ['pusty zapis w wersji 1', '{ "saveVersion": 1 }'],
    ['zapis w wersji 1 ze śmieciami w liniach', '{ "saveVersion": 1, "lines": [1, "x"] }'],
  ])('uznaje za uszkodzony: %s', (_label, text) => {
    expect(decodeSave(text).kind).toBe('corrupt');
  });

  it('uznaje za uszkodzony zapis z ujemnym złotem, nieznanym polem albo złym składem', () => {
    const save = JSON.parse(sampleText);
    expect(decodeSave(JSON.stringify({ ...save, gold: -1 })).kind).toBe('corrupt');
    expect(decodeSave(JSON.stringify({ ...save, cheats: true })).kind).toBe('corrupt');
    expect(decodeSave(JSON.stringify({ ...save, squad: [1] })).kind).toBe('corrupt');
    expect(decodeSave(JSON.stringify({ ...save, nextHeroId: 0 })).kind).toBe('corrupt');
    expect(
      decodeSave(JSON.stringify({ ...save, settings: { lang: 'de', battleSpeed: 1 } })).kind,
    ).toBe('corrupt');
  });

  it('rozpoznaje zapis z nowszej wersji gry', () => {
    const newer = JSON.stringify({ saveVersion: SAVE_VERSION + 1, anything: 'else' });
    expect(decodeSave(newer)).toEqual({ kind: 'newer', saveVersion: SAVE_VERSION + 1 });
  });
});

describe('łańcuch migracji', () => {
  // Wymyślony format w wersji 3: v1 trzymał monety w polu `coins`, v2 w `gold`, v3 dodał `gems`.
  interface FakeSave {
    saveVersion: 3;
    gold: number;
    gems: number;
  }
  const format: SaveFormat<FakeSave> = {
    version: 3,
    migrations: {
      1: (old) => ({ saveVersion: 2, gold: old.coins }),
      2: (old) => ({ ...old, saveVersion: 3, gems: 0 }),
    },
    validate(data) {
      const save = data as Partial<FakeSave>;
      return typeof save.gold === 'number' && typeof save.gems === 'number'
        ? { ok: true, save: save as FakeSave }
        : { ok: false, reason: 'bad shape' };
    },
  };

  it('przeprowadza zapis przez wszystkie migracje po kolei', () => {
    expect(decodeWith('{ "saveVersion": 1, "coins": 70 }', format)).toEqual({
      kind: 'ok',
      save: { saveVersion: 3, gold: 70, gems: 0 },
      migratedFrom: 1,
    });
    expect(decodeWith('{ "saveVersion": 2, "gold": 5 }', format)).toEqual({
      kind: 'ok',
      save: { saveVersion: 3, gold: 5, gems: 0 },
      migratedFrom: 2,
    });
  });

  it('zapis po migracji też przechodzi walidację', () => {
    expect(decodeWith('{ "saveVersion": 1, "coins": "dużo" }', format).kind).toBe('corrupt');
  });

  it('brak migracji, wyjątek w migracji i migracja bez podniesienia wersji dają zapis uszkodzony', () => {
    const missing = { ...format, migrations: { 2: format.migrations[2] as never } };
    expect(decodeWith('{ "saveVersion": 1, "coins": 1 }', missing).kind).toBe('corrupt');
    const throwing: SaveFormat<FakeSave> = {
      ...format,
      migrations: {
        ...format.migrations,
        1: () => {
          throw new Error('boom');
        },
      },
    };
    expect(decodeWith('{ "saveVersion": 1, "coins": 1 }', throwing).kind).toBe('corrupt');
    const stuck: SaveFormat<FakeSave> = {
      ...format,
      migrations: { ...format.migrations, 1: (old) => ({ ...old, gold: 1 }) },
    };
    expect(decodeWith('{ "saveVersion": 1, "coins": 1 }', stuck).kind).toBe('corrupt');
  });

  it('gra ma migrację z każdej wcześniejszej wersji zapisu', () => {
    for (let version = 1; version < SAVE_VERSION; version++) {
      expect(MIGRATIONS[version], `migracja z wersji ${version}`).toBeTypeOf('function');
    }
  });
});

describe('loadSave i storeSave', () => {
  it('brak zapisu oznacza nową grę', () => {
    expect(loadSave(memoryStorage().storage)).toEqual({ kind: 'none' });
  });

  it('wczytuje to, co zapisało storeSave', () => {
    const { storage } = memoryStorage();
    expect(storeSave(storage, sample)).toBe(true);
    expect(loadSave(storage)).toEqual({ kind: 'ok', save: sample });
  });

  it('uszkodzony zapis nie wywraca gry: trafia do kopii zapasowej, a gra zaczyna od nowa', () => {
    const broken = '{ "saveVersion": 1, "gold": "mnóstwo" }';
    const { storage, items } = memoryStorage({ [SAVE_KEY]: broken });
    const result = loadSave(storage);
    expect(result.kind).toBe('recovered');
    expect(items.get(BACKUP_KEY)).toBe(broken);
    // Oryginał zostaje do pierwszego zapisu nowej gry.
    expect(items.get(SAVE_KEY)).toBe(broken);
  });

  it('nowszy zapis nie jest ruszany ani kopiowany', () => {
    const newer = JSON.stringify({ saveVersion: SAVE_VERSION + 1, gold: 9000 });
    const { storage, items } = memoryStorage({ [SAVE_KEY]: newer });
    expect(loadSave(storage)).toEqual({ kind: 'newer', saveVersion: SAVE_VERSION + 1 });
    expect(items.get(SAVE_KEY)).toBe(newer);
    expect(items.has(BACKUP_KEY)).toBe(false);
  });

  it('gra działa bez pamięci przeglądarki', () => {
    expect(loadSave(null)).toEqual({ kind: 'unavailable' });
    expect(loadSave(throwingStorage)).toEqual({ kind: 'unavailable' });
    expect(storeSave(null, sample)).toBe(false);
    expect(storeSave(throwingStorage, sample)).toBe(false);
  });

  it('brak miejsca na kopię zapasową nie zatrzymuje wczytywania', () => {
    const storage: SaveStorage = {
      getItem: () => 'śmieci',
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadSave(storage).kind).toBe('recovered');
  });
});
