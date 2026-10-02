// Canvas pod interfejsem: tło, podgląd pola walki na ekranie składu i sama walka.
// Reaguje na scenę z `Game`; UI steruje walką przez `StageControls`.
import { effect, type Signal, signal } from '@preact/signals';
import { levelSetup, levelVisuals } from '../content/resolve-spec.ts';
import { TICKS_PER_SECOND } from '../core/units.ts';
import { loadUnitsAtlas } from '../render/atlas.ts';
import { drawBackground } from '../render/background.ts';
import { createCanvasRenderer } from '../render/canvas-renderer.ts';
import type { Renderer } from '../render/renderer.ts';
import { battleResult, createBattle, OUTCOME_IN_PROGRESS } from '../sim/index.ts';
import { type BattleRunner, createBattleRunner } from './battle-runner.ts';
import { createFrameLoop } from './frame-loop.ts';
import type { Game, Scene } from './game.ts';
import { squadMembers } from './progress.ts';
import { attachStage, get2dContext } from './stage.ts';
import { guardedLoad } from './update.ts';

/** Czas po rozstrzygnięciu walki, zanim pojawi się wynik: animacje śmierci i ostatnie liczby. */
const END_DELAY_MS = 1400;

export interface StageControls {
  /** Grafiki walki: `loading` do pierwszego wczytania atlasu, `failed` po błędzie ładowania. */
  readonly assets: Signal<'idle' | 'loading' | 'ready' | 'failed'>;
  readonly paused: Signal<boolean>;
  /** Tick trwającej walki; sygnał zmienia się raz na sekundę gry, nie co klatkę. */
  readonly battleTick: Signal<number>;
  togglePause(): void;
}

export function startStage(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  game: Game,
): StageControls {
  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  const { content } = game;

  const assets = signal<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const paused = signal(false);
  const battleTick = signal(0);

  let renderer: Renderer | null = null;
  let runner: BattleRunner | null = null;
  /** Renderer pokazuje nieruchomą walkę: ustawienie obu stron przed startem. */
  let previewing = false;
  let endedMs = -1;
  /** Scena i skład, dla których zbudowano bieżącą zawartość canvasu. */
  let shownScene: Scene | null = null;
  let shownSquad = '';

  function ensureRenderer(): void {
    if (assets.value !== 'idle' && assets.value !== 'failed') return;
    assets.value = 'loading';
    guardedLoad('atlas:units', loadUnitsAtlas).then(
      (atlas) => {
        renderer = createCanvasRenderer(ctx, { atlas, rigs: content.rigs });
        assets.value = 'ready';
      },
      () => {
        // Komunikat pokazuje baner z `guardedLoad`; gracz wraca na mapę i może spróbować ponownie.
        assets.value = 'failed';
        if (game.scene.value.name === 'battle' || game.scene.value.name === 'squad') {
          game.go({ name: 'map' });
        }
      },
    );
  }

  function clear(): void {
    runner?.dispose();
    runner = null;
    if (previewing) renderer?.endBattle();
    previewing = false;
    endedMs = -1;
  }

  // Zawartość canvasu zależy od sceny, składu (podgląd) i tego, czy atlas jest już wczytany.
  effect(() => {
    const scene = game.scene.value;
    const save = game.save.value;
    const ready = assets.value === 'ready';
    const level = scene.name === 'squad' || scene.name === 'battle' ? scene.level : null;
    // Podgląd odświeżamy po zmianie składu, ulepszeń i run; trwająca walka ich nie śledzi.
    const squadKey = scene.name === 'squad' ? JSON.stringify([save.squad, save.lines]) : '';
    if (scene === shownScene && squadKey === shownSquad && (runner !== null || previewing)) return;

    clear();
    shownScene = scene;
    shownSquad = squadKey;
    const compiled = level === null ? undefined : content.levels.get(level);
    if (compiled === undefined) return;
    if (!ready || renderer === null) {
      ensureRenderer();
      return;
    }

    const members = squadMembers(content, save);
    const setup = levelSetup(content, compiled, members);
    const visuals = levelVisuals(content, compiled, members);
    if (scene.name === 'squad') {
      renderer.beginBattle(createBattle(setup), visuals);
      previewing = true;
      return;
    }
    game.lastBattle.value = setup;
    runner = createBattleRunner(setup, visuals, renderer);
    runner.loop.speed = save.settings.battleSpeed;
    paused.value = false;
    battleTick.value = 0;
  });

  // Prędkość walki z ustawień działa od razu, bez tworzenia walki od nowa.
  effect(() => {
    const speed = game.save.value.settings.battleSpeed;
    if (runner !== null) runner.loop.speed = speed;
  });

  createFrameLoop((frameMs) => {
    if (runner !== null) {
      runner.loop.paused = paused.value;
      runner.frame(viewport, frameMs);
      const { state } = runner.battle;
      // Licznik czasu w HUD zmienia się co sekundę gry; sygnał ustawiamy tylko wtedy.
      const second = state.tick - (state.tick % TICKS_PER_SECOND);
      if (battleTick.value !== second) battleTick.value = second;
      if (state.outcome !== OUTCOME_IN_PROGRESS) {
        endedMs = endedMs < 0 ? 0 : endedMs + frameMs;
        const scene = game.scene.value;
        if (endedMs >= END_DELAY_MS && scene.name === 'battle') {
          game.finishBattle(scene.level, battleResult(runner.battle));
        }
      }
    } else if (previewing && renderer !== null) {
      renderer.draw(viewport, 1, frameMs);
    } else {
      drawBackground(ctx, viewport);
    }
  }).start();

  return {
    assets,
    paused,
    battleTick,
    togglePause() {
      paused.value = !paused.value;
    },
  };
}
