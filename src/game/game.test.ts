import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { createGame, type Game } from './game.ts';
import { language } from './i18n.ts';
import { BACKUP_KEY, decodeSave, SAVE_KEY, type SaveStorage } from './save.ts';
import { SAVE_VERSION } from './save-schema.ts';

const content = requireContent();
// W nowej grze miecznik ma id 1, łucznik id 2.
const SWORD = 1;
const ARCHER = 2;

function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: SaveStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
}

function start(storage: SaveStorage | null = memory().storage): Game {
  return createGame({ content, storage, gameVersion: '9.9.9', preferredLanguage: 'en' });
}

/** Nagrody czytamy z treści: te testy sprawdzają reguły gry, nie liczby balansu. */
const goldOf = (level: string): number => content.levels.get(level)?.gold ?? 0;
const FIRST = goldOf('w1_l1');
const SECOND = goldOf('w1_l2');

const WIN = { outcome: 'win', reason: 'eliminated', ticks: 400 } as const;
const LOSS = { outcome: 'loss', reason: 'timeout', ticks: 2700 } as const;

describe('start gry', () => {
  it('bez zapisu zaczyna nową grę na ekranie startowym, w języku przeglądarki', () => {
    const game = start();
    expect(game.scene.value).toEqual({ name: 'title' });
    // „Graj” otwiera mapę z pierwszym poziomem.
    game.openMap();
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l1' });
    expect(game.save.value.settings.lang).toBe('en');
    expect(language.value).toBe('en');
    expect(game.storage.value).toBe('ok');
    expect(game.recovered.value).toBe(false);
  });

  it('wczytuje zapis i jego język', () => {
    const first = memory();
    const game = start(first.storage);
    game.setLanguage('pl');
    game.finishBattle('w1_l1', WIN);

    const again = start(first.storage);
    expect(again.save.value.gold).toBe(FIRST);
    expect(again.save.value.gameVersion).toBe('9.9.9');
    expect(language.value).toBe('pl');
  });

  it('wczytuje zapis w wersji 1 przez migrację', () => {
    const v1 = JSON.stringify({
      saveVersion: 1,
      gameVersion: '0.1.0',
      gold: 55,
      lines: {
        swordsman: { form: 0, upgrades: 2, runes: [null, null] },
        archer: { form: 0, upgrades: 0, runes: [null, null] },
      },
      runes: [],
      levels: { w1_l1: { cleared: true, bestTicks: 300 } },
      squad: ['archer', 'swordsman', null, null, null],
      settings: { lang: 'pl', battleSpeed: 1 },
    });
    const game = start(memory({ [SAVE_KEY]: v1 }).storage);
    expect(game.recovered.value).toBe(false);
    expect(game.save.value.saveVersion).toBe(SAVE_VERSION);
    expect(game.save.value.gold).toBe(55);
    expect(game.save.value.heroes.map((hero) => [hero.line, hero.upgrades])).toEqual([
      ['swordsman', 2],
      ['archer', 0],
    ]);
    expect(game.save.value.squad).toEqual([2, 1, null, null, null]);
  });

  it('uszkodzony zapis: nowa gra, kopia zapasowa, informacja dla gracza', () => {
    const { storage, items } = memory({ [SAVE_KEY]: 'śmieci' });
    const game = start(storage);
    expect(game.recovered.value).toBe(true);
    expect(game.save.value.gold).toBe(0);
    expect(items.get(BACKUP_KEY)).toBe('śmieci');
  });

  it('zapis z nowszej wersji gry nie jest nadpisywany', () => {
    const newer = JSON.stringify({ saveVersion: SAVE_VERSION + 1, gold: 9000 });
    const { storage, items } = memory({ [SAVE_KEY]: newer });
    const game = start(storage);
    expect(game.storage.value).toBe('blocked');
    game.setLanguage('pl');
    game.finishBattle('w1_l1', WIN);
    game.resetProgress();
    expect(items.get(SAVE_KEY)).toBe(newer);
    expect(game.storage.value).toBe('blocked');
  });

  it('bez pamięci przeglądarki gra działa, ale zgłasza brak zapisu', () => {
    const game = start(null);
    expect(game.storage.value).toBe('memory');
    game.finishBattle('w1_l1', WIN);
    expect(game.save.value.gold).toBe(FIRST);
    expect(game.storage.value).toBe('memory');
  });
});

describe('sceny', () => {
  it('przechodzi mapa → walka → wynik → mapa z następnym poziomem', () => {
    const game = start();
    expect(game.startBattle('w1_l1')).toBe(true);
    expect(game.scene.value).toEqual({ name: 'battle', level: 'w1_l1' });
    game.finishBattle('w1_l1', WIN);
    expect(game.scene.value.name).toBe('result');
    // Bez wskazania poziomu mapa wybiera pierwszy jeszcze nieprzeszły.
    game.openMap();
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l2' });
    game.openMap('w1_l1');
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l1' });
  });

  it('z mapy prowadzą wejścia do składu i sklepu, a z nich powrót na mapę', () => {
    const game = start();
    game.go({ name: 'squad' });
    expect(game.scene.value).toEqual({ name: 'squad' });
    game.go({ name: 'shop' });
    expect(game.scene.value).toEqual({ name: 'shop' });
    game.openMap();
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l1' });
  });

  it('informacje o bohaterach otwierają się na wskazanej linii albo na pierwszej', () => {
    const game = start();
    game.openHeroes();
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'swordsman', form: 'swordsman_a' });
    game.openHeroes('archer', 'inquisitor');
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'archer', form: 'inquisitor' });
    // Forma spoza linii i nieznana linia: forma bazowa, pierwsza linia.
    game.openHeroes('archer', 'swordsman_b');
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'archer', form: 'archer_a' });
    game.openHeroes('nobody');
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'swordsman', form: 'swordsman_a' });
  });

  it('informacje o bohaterach otwierają też szczep wrogów na wskazanej albo pierwszej postaci', () => {
    const game = start();
    game.openHeroes('akronix');
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'akronix', form: 'bowix' });
    game.openHeroes('akronix', 'axin_2');
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'akronix', form: 'axin_2' });
    // Postać spoza szczepu (także bohater): pierwsza postać szczepu.
    game.openHeroes('akronix', 'swordsman_a');
    expect(game.scene.value).toEqual({ name: 'heroes', line: 'akronix', form: 'bowix' });
  });

  it('zablokowany poziom można obejrzeć na mapie, ale nie da się go uruchomić', () => {
    const game = start();
    game.openMap('w1_l2');
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l2' });
    expect(game.startBattle('w1_l2')).toBe(false);
    expect(game.scene.value.name).toBe('map');
    // Nieznany poziom: mapa wraca do pierwszego nieprzeszłego.
    game.openMap('nie_ma');
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l1' });
  });

  it('przełączanie świata wybiera w nim poziom do pokazania', () => {
    const game = start();
    game.openMap();
    // Świat, do którego gracz nie doszedł: jego pierwszy poziom, do obejrzenia.
    game.openWorld('world_3');
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w3_l1' });
    expect(game.startBattle('w3_l1')).toBe(false);
    game.openWorld('world_1');
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l1' });
    // Nieznany świat niczego nie zmienia.
    game.openWorld('world_9');
    expect(game.scene.value).toEqual({ name: 'map', selected: 'w1_l1' });
  });

  it('walka nie zaczyna się z pustym składem', () => {
    const game = start();
    game.removeFromSquad(0);
    game.removeFromSquad(1);
    expect(game.startBattle('w1_l1')).toBe(false);
  });
});

describe('wynik walki', () => {
  it('wygrana nalicza nagrody, zapisuje grę i pokazuje je na ekranie wyniku', () => {
    const { storage, items } = memory();
    const game = start(storage);
    game.finishBattle('w1_l1', WIN);
    expect(game.scene.value).toEqual({
      name: 'result',
      level: 'w1_l1',
      battle: WIN,
      rewards: { firstClear: true, gold: FIRST, runeToken: false },
    });
    const stored = decodeSave(items.get(SAVE_KEY) ?? '');
    expect(stored.kind === 'ok' && stored.save.levels.w1_l1).toEqual({
      cleared: true,
      bestTicks: 400,
    });
  });

  it('przegrana nic nie zmienia w zapisie', () => {
    const game = start();
    const before = game.save.value;
    game.finishBattle('w1_l1', LOSS);
    expect(game.save.value).toBe(before);
    expect(game.scene.value).toMatchObject({ name: 'result', rewards: null });
  });
});

describe('akcje gracza', () => {
  it('zapisują grę po każdej zmianie', () => {
    const { storage, items } = memory();
    const game = start(storage);
    const stored = () => {
      const decoded = decodeSave(items.get(SAVE_KEY) ?? '');
      if (decoded.kind !== 'ok') throw new Error('nothing stored');
      return decoded.save;
    };
    expect(game.placeInSquad(ARCHER, 4)).toBe(true);
    expect(stored().squad).toEqual([1, null, null, null, 2]);
    game.setBattleSpeed(4);
    expect(stored().settings.battleSpeed).toBe(4);
  });

  it('odmowa reguły nie zmienia zapisu', () => {
    const game = start();
    const before = game.save.value;
    expect(game.upgrade(SWORD)).toBe(false);
    expect(game.evolve(SWORD, 'swordsman_b')).toBe(false);
    expect(game.equipRune(SWORD, 0, 'hp_2')).toBe(false);
    // Bez żetonu run drzewko nie daje runy.
    expect(game.unlockRune('hp_1')).toBe(false);
    expect(game.placeInSquad(99, 0)).toBe(false);
    expect(game.buyHero('beasts')).toBe(false);
    expect(game.save.value).toBe(before);
  });

  it('ulepszenie zdejmuje złoto', () => {
    const game = start();
    game.finishBattle('w1_l1', WIN);
    game.finishBattle('w1_l2', WIN);
    expect(game.upgrade(SWORD)).toBe(true);
    expect(game.save.value.gold).toBe(FIRST + SECOND - 50);
  });

  it('żeton run z drugiego poziomu odblokowuje runę drzewka, którą da się włożyć bohaterowi', () => {
    const { storage, items } = memory();
    const game = start(storage);
    game.finishBattle('w1_l1', WIN);
    game.finishBattle('w1_l2', WIN);
    expect(game.scene.value).toMatchObject({ name: 'result', rewards: { runeToken: true } });
    // Runę trzeba najpierw odblokować; druga w kierunku czeka na następny żeton.
    expect(game.equipRune(SWORD, 0, 'hp_1')).toBe(false);
    expect(game.unlockRune('hp_2')).toBe(false);
    expect(game.unlockRune('hp_1')).toBe(true);
    expect(game.unlockRune('attack_1')).toBe(false);
    const stored = decodeSave(items.get(SAVE_KEY) ?? '');
    expect(stored.kind === 'ok' && stored.save.runes).toEqual(['hp_1']);
    expect(game.equipRune(SWORD, 0, 'hp_1')).toBe(true);
  });

  it('zakup w sklepie dodaje bohatera, zdejmuje złoto i zapisuje grę', () => {
    const { storage, items } = memory();
    const game = start(storage);
    game.finishBattle('w1_l1', WIN);
    game.finishBattle('w1_l2', WIN);
    expect(game.buyHero('beasts')).toBe(true);
    expect(game.save.value.gold).toBe(FIRST + SECOND - 200);
    expect(game.buyHero('swordsman')).toBe(true);
    expect(game.save.value.heroes.map((hero) => hero.line)).toEqual([
      'swordsman',
      'archer',
      'beasts',
      'swordsman',
    ]);
    expect(game.save.value.squad).toEqual([1, 2, 3, 4, null]);
    const stored = decodeSave(items.get(SAVE_KEY) ?? '');
    expect(stored.kind === 'ok' && stored.save.heroes).toHaveLength(4);
    expect(game.buyHero('plants')).toBe(false);
  });
});

describe('eksport, import i reset', () => {
  it('import przywraca wyeksportowany stan', () => {
    const source = start();
    source.finishBattle('w1_l1', WIN);
    const text = source.exportSave();

    const target = start();
    target.go({ name: 'shop' });
    expect(target.importSave(text)).toBe('ok');
    expect(target.save.value.gold).toBe(FIRST);
    // Po imporcie gra wraca na mapę z poziomem wynikającym z wczytanego postępu.
    expect(target.scene.value).toEqual({ name: 'map', selected: 'w1_l2' });
  });

  it('odrzuca uszkodzony plik i plik z nowszej wersji, nie zmieniając gry', () => {
    const game = start();
    const before = game.save.value;
    expect(game.importSave('to nie zapis')).toBe('corrupt');
    expect(game.importSave(JSON.stringify({ saveVersion: SAVE_VERSION + 1 }))).toBe('newer');
    expect(game.save.value).toBe(before);
  });

  it('reset zaczyna od nowa i zachowuje język', () => {
    const game = start();
    game.setLanguage('pl');
    game.finishBattle('w1_l1', WIN);
    game.resetProgress();
    expect(game.save.value.gold).toBe(0);
    expect(game.save.value.levels).toEqual({});
    expect(game.save.value.settings.lang).toBe('pl');
  });
});
