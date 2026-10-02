// Stan gry w sygnałach: zapis, bieżąca scena i akcje gracza. Akcje wołają czyste reguły
// z progress.ts i po każdej zmianie zapisują grę. UI czyta sygnały i wywołuje akcje;
// żadna reguła gry nie leży w komponentach.
import { type Signal, signal } from '@preact/signals';
import type { Language } from '../content/i18n/index.ts';
import type { GameContent } from '../content/load.ts';
import type { BattleSetup } from '../sim/types.ts';
import { language } from './i18n.ts';
import {
  applyEvolve,
  applyUpgrade,
  applyVictory,
  buyHero,
  equipRune,
  isLevelUnlocked,
  isSquadEmpty,
  newSave,
  placeInSquad,
  type Rewards,
  reconcileSave,
  removeFromSquad,
} from './progress.ts';
import { decodeSave, loadSave, type SaveStorage, storeSave } from './save.ts';
import type { BattleSpeed, Save } from './save-schema.ts';

export interface BattleOutcome {
  readonly outcome: 'win' | 'loss';
  readonly reason: 'eliminated' | 'mutual' | 'timeout';
  readonly ticks: number;
}

/**
 * Scena to wartość sygnału, nie ścieżka URL (docs/ARCHITECTURE.md §6.1). Panel główny (`hub`)
 * prowadzi do mapy, składu i sklepu. Skład zmienia się tylko na ekranie składu: mapa pokazuje
 * poziomy i zaczyna walkę bieżącym składem.
 */
export type Scene =
  | { readonly name: 'hub' }
  /** `selected` to poziom, którego szczegóły pokazuje mapa. */
  | { readonly name: 'map'; readonly selected: string | null }
  | { readonly name: 'squad' }
  | { readonly name: 'shop' }
  | { readonly name: 'battle'; readonly level: string }
  | {
      readonly name: 'result';
      readonly level: string;
      readonly battle: BattleOutcome;
      /** Nagrody za wygraną; null po przegranej. */
      readonly rewards: Rewards | null;
    };

/**
 * `ok` – gra zapisuje się w pamięci przeglądarki; `memory` – pamięć niedostępna, postęp zniknie
 * po zamknięciu karty; `blocked` – zapis pochodzi z nowszej wersji gry i nie wolno go nadpisać.
 */
export type StorageStatus = 'ok' | 'memory' | 'blocked';

export type ImportOutcome = 'ok' | 'corrupt' | 'newer';

export interface Game {
  readonly content: GameContent;
  readonly save: Signal<Save>;
  readonly scene: Signal<Scene>;
  readonly storage: Signal<StorageStatus>;
  /** Uszkodzony zapis trafił do kopii zapasowej i gra zaczęła od nowa; UI mówi o tym raz. */
  readonly recovered: Signal<boolean>;
  /** Wejście symulacji ostatniej walki, do raportu „Zgłoś problem”. */
  readonly lastBattle: Signal<BattleSetup | null>;

  go(scene: Scene): void;
  /** Otwiera mapę, opcjonalnie z wybranym poziomem. */
  openMap(selected?: string | null): void;
  /** Zaczyna walkę bieżącym składem. False, gdy skład jest pusty albo poziom zablokowany. */
  startBattle(level: string): boolean;
  /** Kończy walkę: przy wygranej nalicza nagrody, zapisuje grę i pokazuje wynik. */
  finishBattle(level: string, battle: BattleOutcome): void;

  /** Kupuje w sklepie bohatera linii. False, gdy brakuje złota. */
  buyHero(line: string): boolean;
  upgrade(hero: number): boolean;
  evolve(hero: number): boolean;
  equipRune(hero: number, slot: number, rune: string | null): boolean;
  placeInSquad(hero: number, slot: number): boolean;
  removeFromSquad(slot: number): void;
  setLanguage(lang: Language): void;
  setBattleSpeed(speed: BattleSpeed): void;

  exportSave(): string;
  importSave(text: string): ImportOutcome;
  /** Zaczyna grę od nowa, zachowując język. */
  resetProgress(): void;
}

export interface GameOptions {
  readonly content: GameContent;
  readonly storage: SaveStorage | null;
  readonly gameVersion: string;
  /** Język nowej gry; wczytany zapis ma własny. */
  readonly preferredLanguage: Language;
}

export function createGame(options: GameOptions): Game {
  const { content, storage: saveStorage, gameVersion } = options;
  const loaded = loadSave(saveStorage);
  const initial =
    loaded.kind === 'ok'
      ? reconcileSave(content, loaded.save)
      : newSave(content, gameVersion, options.preferredLanguage);

  const save = signal<Save>(initial);
  const scene = signal<Scene>({ name: 'hub' });
  const storage = signal<StorageStatus>(
    loaded.kind === 'newer' ? 'blocked' : loaded.kind === 'unavailable' ? 'memory' : 'ok',
  );
  const recovered = signal(loaded.kind === 'recovered');
  const lastBattle = signal<BattleSetup | null>(null);
  language.value = initial.settings.lang;

  /** Ustawia nowy zapis i utrwala go, o ile wolno. */
  const commit = (next: Save): void => {
    save.value = { ...next, gameVersion };
    if (storage.value === 'blocked') return;
    storage.value = storeSave(saveStorage, save.value) ? 'ok' : 'memory';
  };
  /** Wykonuje regułę zwracającą nowy zapis albo null (akcja niedozwolona). */
  const attempt = (next: Save | null): boolean => {
    if (next === null) return false;
    commit(next);
    return true;
  };

  return {
    content,
    save,
    scene,
    storage,
    recovered,
    lastBattle,

    go(next) {
      scene.value = next;
    },
    openMap(selected = null) {
      const valid = selected !== null && isLevelUnlocked(content, save.value, selected);
      scene.value = { name: 'map', selected: valid ? selected : null };
    },
    startBattle(level) {
      if (!isLevelUnlocked(content, save.value, level) || isSquadEmpty(save.value)) return false;
      scene.value = { name: 'battle', level };
      return true;
    },
    finishBattle(level, battle) {
      let rewards: Rewards | null = null;
      if (battle.outcome === 'win') {
        const won = applyVictory(content, save.value, level, battle.ticks);
        if (won !== null) {
          rewards = won.rewards;
          commit(won.save);
        }
      }
      scene.value = { name: 'result', level, battle, rewards };
    },

    buyHero: (line) => attempt(buyHero(content, save.value, line)),
    upgrade: (hero) => attempt(applyUpgrade(content, save.value, hero)),
    evolve: (hero) => attempt(applyEvolve(content, save.value, hero)),
    equipRune: (hero, slot, rune) => attempt(equipRune(content, save.value, hero, slot, rune)),
    placeInSquad: (hero, slot) => attempt(placeInSquad(save.value, hero, slot)),
    removeFromSquad(slot) {
      commit(removeFromSquad(save.value, slot));
    },
    setLanguage(lang) {
      language.value = lang;
      commit({ ...save.value, settings: { ...save.value.settings, lang } });
    },
    setBattleSpeed(battleSpeed) {
      commit({ ...save.value, settings: { ...save.value.settings, battleSpeed } });
    },

    exportSave() {
      return JSON.stringify(save.value, null, 2);
    },
    importSave(text) {
      const decoded = decodeSave(text);
      if (decoded.kind !== 'ok') return decoded.kind;
      // Świadomy import zdejmuje blokadę: gracz sam wybrał zapis, którym chce grać.
      if (storage.value === 'blocked') storage.value = 'ok';
      commit(reconcileSave(content, decoded.save));
      language.value = save.value.settings.lang;
      scene.value = { name: 'hub' };
      return 'ok';
    },
    resetProgress() {
      commit(newSave(content, gameVersion, save.value.settings.lang));
      scene.value = { name: 'hub' };
    },
  };
}
