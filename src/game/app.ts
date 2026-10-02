// Start aplikacji: stan gry z zapisu, canvas pod interfejsem i sprawdzanie nowej wersji.
import { effect } from '@preact/signals';
import { pickLanguage } from '../content/i18n/index.ts';
import { requireContent } from '../content/load.ts';
import { type StageControls, startStage } from './battle-stage.ts';
import { installGlobalErrorHandlers } from './errors.ts';
import { createGame, type Game } from './game.ts';
import { language } from './i18n.ts';
import { browserStorage } from './save.ts';
import { createUpdateChecker } from './update.ts';
import { gameVersion } from './version.ts';

export interface RunningApp {
  readonly game: Game;
  readonly stage: StageControls;
}

export function startApp(stage: HTMLElement, canvas: HTMLCanvasElement): RunningApp {
  installGlobalErrorHandlers(window);
  const game = createGame({
    content: requireContent(),
    storage: browserStorage(),
    gameVersion: gameVersion.version,
    preferredLanguage: pickLanguage(navigator.languages),
  });
  const controls = startStage(stage, canvas, game);

  // Atrybut lang dokumentu idzie za językiem gry: czytniki ekranu i dzielenie wyrazów.
  effect(() => {
    document.documentElement.lang = language.value;
  });

  // Nową wersję sprawdzamy przy zmianie sceny, ale nie w trakcie walki: komunikat nie może
  // jej przerywać, a po deployu stare pliki i tak są potrzebne dopiero przy kolejnym ładowaniu.
  const checkForNewVersion = createUpdateChecker();
  effect(() => {
    if (game.scene.value.name !== 'battle') void checkForNewVersion();
  });

  return { game, stage: controls };
}
