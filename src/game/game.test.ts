import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { createGame, type Game } from './game.ts';
import { language } from './i18n.ts';
import { BACKUP_KEY, decodeSave, SAVE_KEY, type SaveStorage } from './save.ts';
import { SAVE_VERSION } from './save-schema.ts';

const content = requireContent();

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

const WIN = { outcome: 'win', reason: 'eliminated', ticks: 400 } as const;
const LOSS = { outcome: 'loss', reason: 'timeout', ticks: 2700 } as const;

describe('start gry', () => {
  it('bez zapisu zaczyna nową grę w menu, w języku przeglądarki', () => {
    const game = start();
    expect(game.scene.value).toEqual({ name: 'menu' });
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
    expect(again.save.value.gold).toBe(260);
    expect(again.save.value.gameVersion).toBe('9.9.9');
    expect(language.value).toBe('pl');
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
    expect(game.save.value.gold).toBe(260);
    expect(game.storage.value).toBe('memory');
  });
});

describe('sceny', () => {
  it('przechodzi menu → mapa → skład → walka → wynik → mapa', () => {
    const game = start();
    game.go({ name: 'map' });
    expect(game.openLevel('w1_l1')).toBe(true);
    expect(game.scene.value).toEqual({ name: 'squad', level: 'w1_l1' });
    expect(game.startBattle('w1_l1')).toBe(true);
    expect(game.scene.value).toEqual({ name: 'battle', level: 'w1_l1' });
    game.finishBattle('w1_l1', WIN);
    expect(game.scene.value.name).toBe('result');
    game.go({ name: 'map' });
    expect(game.scene.value).toEqual({ name: 'map' });
  });

  it('zablokowany poziom nie daje się otworzyć ani uruchomić', () => {
    const game = start();
    game.go({ name: 'map' });
    expect(game.openLevel('w1_l2')).toBe(false);
    expect(game.startBattle('w1_l2')).toBe(false);
    expect(game.scene.value).toEqual({ name: 'map' });
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
      rewards: { firstClear: true, gold: 260, rune: null, lines: [] },
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
    expect(game.placeInSquad('archer', 4)).toBe(true);
    expect(stored().squad).toEqual(['swordsman', null, null, null, 'archer']);
    game.setBattleSpeed(4);
    expect(stored().settings.battleSpeed).toBe(4);
  });

  it('odmowa reguły nie zmienia zapisu', () => {
    const game = start();
    const before = game.save.value;
    expect(game.upgrade('swordsman')).toBe(false);
    expect(game.evolve('swordsman')).toBe(false);
    expect(game.equipRune('swordsman', 0, 'rune_hp_200')).toBe(false);
    expect(game.placeInSquad('nie_ma', 0)).toBe(false);
    expect(game.save.value).toBe(before);
  });

  it('ulepszenie zdejmuje złoto', () => {
    const game = start();
    game.finishBattle('w1_l1', WIN);
    game.finishBattle('w1_l2', WIN);
    expect(game.upgrade('swordsman')).toBe(true);
    expect(game.save.value.gold).toBe(860 - 50);
    expect(game.equipRune('swordsman', 0, 'rune_hp_200')).toBe(true);
  });
});

describe('eksport, import i reset', () => {
  it('import przywraca wyeksportowany stan', () => {
    const source = start();
    source.finishBattle('w1_l1', WIN);
    const text = source.exportSave();

    const target = start();
    target.go({ name: 'map' });
    expect(target.importSave(text)).toBe('ok');
    expect(target.save.value.gold).toBe(260);
    expect(target.scene.value).toEqual({ name: 'menu' });
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
