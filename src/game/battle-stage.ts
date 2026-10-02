// Canvas pod interfejsem. Linia podłogi jest wspólna dla wszystkich ekranów; zmieniają się
// aktorzy: na ekranie startowym i mapie skład gracza stoi naprzeciw przeciwników poziomu,
// na ekranie składu sam skład, w sklepie i informacjach o bohaterach bohaterowie na swoich
// stanowiskach, a w scenie walki toczy się walka.
// Reaguje na scenę z `Game`; UI steruje walką i podglądem przez `StageControls`.
import { effect, type Signal, signal } from '@preact/signals';
import type { UnitVisual } from '../content/compile.ts';
import type { CompiledLevel } from '../content/load-progression.ts';
import { levelSetup, levelVisuals } from '../content/resolve-spec.ts';
import { TICKS_PER_SECOND } from '../core/units.ts';
import { loadUnitsAtlas } from '../render/atlas.ts';
import { drawBackground } from '../render/background.ts';
import { createCanvasRenderer } from '../render/canvas-renderer.ts';
import type { Renderer } from '../render/renderer.ts';
import {
  type Battle,
  type BattleSetup,
  battleResult,
  createBattle,
  OUTCOME_IN_PROGRESS,
  TEAM_SIZE,
} from '../sim/index.ts';
import { type BattleRunner, createBattleRunner } from './battle-runner.ts';
import { createFrameLoop } from './frame-loop.ts';
import type { Game, Scene } from './game.ts';
import { currentLevel, squadMembers } from './progress.ts';
import { attachStage, get2dContext } from './stage.ts';
import { formStands, shopStands, standScene } from './stage-stands.ts';
import { guardedLoad } from './update.ts';

/** Poziom bez przeciwników: podgląd samego składu gracza. */
const NO_ENEMIES: CompiledLevel = {
  id: '',
  world: '',
  index: 0,
  enemies: [],
  gold: 0,
  rune: null,
};

/** Czas po rozstrzygnięciu walki, zanim pojawi się wynik: animacje śmierci i ostatnie liczby. */
const END_DELAY_MS = 1400;

export interface StageControls {
  /** Grafiki walki: `loading` do pierwszego wczytania atlasu, `failed` po błędzie ładowania. */
  readonly assets: Signal<'idle' | 'loading' | 'ready' | 'failed'>;
  readonly paused: Signal<boolean>;
  /** Tick trwającej walki; sygnał zmienia się raz na sekundę gry, nie co klatkę. */
  readonly battleTick: Signal<number>;
  togglePause(): void;
  /**
   * Przesuwa postać ze slotu gracza w podglądzie (ekran składu: bohater jedzie za wskaźnikiem).
   * `position` to ułamek szerokości sceny; null odstawia postać na jej slot. Poza podglądem
   * nic nie robi.
   */
  movePreviewUnit(slot: number, position: number | null): void;
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
  /** Nieruchoma walka w ticku 0, którą renderer pokazuje poza sceną walki. */
  let preview: Battle | null = null;
  /** Pozycje slotów gracza w podglądzie: tu wraca postać po przeciągnięciu. */
  let previewSlots: readonly number[] = [];
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
        // Komunikat pokazuje baner z `guardedLoad`; gracz może spróbować ponownie.
        assets.value = 'failed';
        // Bez grafik nie ma walki; pozostałe ekrany działają dalej, tylko bez postaci na scenie.
        if (game.scene.value.name === 'battle') game.openMap();
      },
    );
  }

  function clear(): void {
    runner?.dispose();
    runner = null;
    if (preview !== null) renderer?.endBattle();
    preview = null;
    endedMs = -1;
  }

  function showPreview(
    target: Renderer,
    setup: BattleSetup,
    visuals: readonly (UnitVisual | null)[],
  ): void {
    preview = createBattle(setup);
    previewSlots = setup.arena.playerSlots;
    target.beginBattle(preview, visuals);
  }

  // Zawartość canvasu zależy od sceny, składu (podgląd) i tego, czy atlas jest już wczytany.
  effect(() => {
    const scene = game.scene.value;
    const save = game.save.value;
    const ready = assets.value === 'ready';
    // Podgląd odświeżamy po zmianie składu, ulepszeń i run; trwająca walka ich nie śledzi.
    const showsSquad = scene.name === 'title' || scene.name === 'map' || scene.name === 'squad';
    const squadKey = showsSquad ? JSON.stringify([save.squad, save.heroes]) : '';
    if (scene === shownScene && squadKey === shownSquad && (runner !== null || preview !== null)) {
      return;
    }

    // Ekran wyniku zostawia za sobą pole zakończonej walki: ostatnie pozy i gasnące animacje.
    if (scene.name === 'result' && runner !== null) {
      shownScene = scene;
      shownSquad = squadKey;
      return;
    }

    clear();
    shownScene = scene;
    shownSquad = squadKey;
    if (scene.name === 'result') return;
    if (!ready || renderer === null) {
      ensureRenderer();
      return;
    }

    if (scene.name === 'shop' || scene.name === 'heroes') {
      const stands =
        scene.name === 'shop'
          ? shopStands(content)
          : scene.line === null
            ? []
            : formStands(content, scene.line);
      const stand = standScene(content, stands);
      showPreview(renderer, stand.setup, stand.visuals);
      return;
    }

    // Ekran startowy i mapa pokazują skład naprzeciw wrogów poziomu, ekran składu samych bohaterów.
    const levelId =
      scene.name === 'battle'
        ? scene.level
        : scene.name === 'map'
          ? scene.selected
          : scene.name === 'title'
            ? currentLevel(content, save)
            : null;
    const compiled = levelId === null ? NO_ENEMIES : content.levels.get(levelId);
    if (compiled === undefined) return;
    const members = squadMembers(content, save);
    const setup = levelSetup(content, compiled, members);
    const visuals = levelVisuals(content, compiled, members);
    if (scene.name !== 'battle') {
      showPreview(renderer, setup, visuals);
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
    } else if (preview !== null && renderer !== null) {
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
    movePreviewUnit(slot, position) {
      if (preview === null || !Number.isInteger(slot) || slot < 0 || slot >= TEAM_SIZE) return;
      const home = previewSlots[slot] ?? 0;
      const x =
        position === null ? home : Math.round(Math.min(1, Math.max(0, position)) * preview.width);
      // Podgląd nigdy nie jest krokowany, więc zapis pozycji wprost do stanu nie wpływa na żadną
      // walkę: to tylko miejsce, w którym renderer narysuje postać.
      preview.state.x[slot] = x;
      preview.state.prevX[slot] = x;
      // Przeciągana postać ma być widoczna także wtedy, gdy mija innych bohaterów.
      renderer?.setTopUnit(position === null ? -1 : slot);
    },
  };
}
