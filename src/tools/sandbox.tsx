// Piaskownica walki: stanowisko testowe renderera i symulacji.
//
// Parametry adresu:
//   player, enemy   składy, np. player=swordsman_a.4,archer_a.0 (jednostka.ranga, "-" = pusty slot)
//   setup=<JSON>    gotowe wejście symulacji (BattleSetup), np. z `pnpm battle golden:<nazwa> --link`
//   tick=N          przewija walkę do ticka N i zatrzymuje ją (stały kadr do zrzutów ekranu)
//   debug=pgo       włącza nakładki: p pivoty, g zasięgi, o pomiary
import { signal } from '@preact/signals';
import { render } from 'preact';
import { requireContent } from '../content/load.ts';
import { type BattleRunner, createBattleRunner } from '../game/battle-runner.ts';
import { createFrameLoop } from '../game/frame-loop.ts';
import { attachStage, get2dContext } from '../game/stage.ts';
import { guardedLoad } from '../game/update.ts';
import { loadUnitsAtlas } from '../render/atlas.ts';
import { createCanvasRenderer } from '../render/canvas-renderer.ts';
import { debugOptions } from '../render/debug.ts';
import { OUTCOME_IN_PROGRESS, OUTCOME_WIN, validateSetup } from '../sim/index.ts';
import { backdropFromQuery } from './backdrop-param.ts';
import { type DebugFlags, type PlaybackState, SandboxPanel } from './SandboxPanel.tsx';
import {
  allUnitIds,
  battleFromSetupJson,
  buildBattle,
  configFromQuery,
  formatTeam,
  type SandboxConfig,
} from './sandbox-config.ts';

const DEBUG_KEYS: Readonly<Record<string, keyof DebugFlags>> = {
  p: 'pivots',
  g: 'ranges',
  o: 'perf',
};

export async function startSandbox(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  ui: HTMLElement,
): Promise<void> {
  const content = requireContent();
  const query = new URLSearchParams(location.search);
  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  const atlas = await guardedLoad('atlas:units', loadUnitsAtlas);
  const renderer = createCanvasRenderer(ctx, { atlas, rigs: content.rigs });
  // Walkę da się obejrzeć na tle każdego świata: ?backdrop=<id>.
  const backdrop = backdropFromQuery(query);
  if (backdrop !== null) renderer.setBackdrop(backdrop);

  const config = signal<SandboxConfig>(configFromQuery(content, query));
  const debugQuery = query.get('debug') ?? '';
  const debug = signal<DebugFlags>({
    pivots: debugQuery.includes('p'),
    ranges: debugQuery.includes('g'),
    perf: debugQuery.includes('o'),
  });
  const playback = signal<PlaybackState>({ tick: 0, outcome: 'trwa', paused: false, speed: 1 });
  Object.assign(debugOptions, debug.value);

  // Gotowe wejście symulacji z parametru `setup` ma pierwszeństwo przed składami z panelu.
  const setupJson = query.get('setup');
  const fixed = setupJson === null ? null : battleFromSetupJson(content, setupJson);
  if (setupJson !== null && fixed === null) {
    window.alert(
      'Parametr "setup" nie zawiera poprawnego wejścia symulacji; używam składów z panelu.',
    );
  }

  function start(): BattleRunner {
    const { setup, visuals } = fixed ?? buildBattle(content, config.value);
    const problems = validateSetup(setup);
    if (problems.length > 0) {
      // Panel pozwala ułożyć skład, którego symulacja nie przyjmie; pokazujemy powód.
      window.alert(`Nie można rozpocząć walki:\n${problems.join('\n')}`);
      throw new Error(problems.join('\n'));
    }
    return createBattleRunner(setup, visuals, renderer);
  }
  let runner = start();

  /** Zapisuje składy i nakładki w adresie, żeby link odtwarzał tę samą walkę. */
  function updateUrl(): void {
    const params = new URLSearchParams();
    if (fixed !== null && setupJson !== null) {
      params.set('setup', setupJson);
    } else {
      params.set('player', formatTeam(config.value.player));
      params.set('enemy', formatTeam(config.value.enemy));
    }
    const flags = Object.entries(DEBUG_KEYS)
      .filter(([, flag]) => debug.value[flag])
      .map(([key]) => key)
      .join('');
    if (flags !== '') params.set('debug', flags);
    if (backdrop !== null) params.set('backdrop', backdrop);
    history.replaceState(null, '', `?${params.toString()}`);
  }

  function restart(): void {
    const { speed, paused } = runner.loop;
    let next: BattleRunner;
    try {
      next = start();
    } catch {
      return;
    }
    runner.dispose();
    runner = next;
    runner.loop.speed = speed;
    runner.loop.paused = paused;
    updateUrl();
  }
  const togglePause = (): void => {
    runner.loop.paused = !runner.loop.paused;
  };
  const step = (): void => {
    if (runner.loop.paused) runner.stepOnce();
  };
  const setSpeed = (speed: number): void => {
    runner.loop.speed = speed;
  };
  const toggleDebug = (flag: keyof DebugFlags): void => {
    debug.value = { ...debug.value, [flag]: !debug.value[flag] };
    Object.assign(debugOptions, debug.value);
    updateUrl();
  };

  const startTick = Number(query.get('tick') ?? '0');
  if (Number.isInteger(startTick) && startTick > 0) {
    runner.loop.paused = true;
    // Klatka po każdym ticku, żeby animacje i efekty starzały się tak jak przy odtwarzaniu.
    for (let i = 0; i < startTick; i++) {
      runner.stepOnce();
      runner.frame(viewport, 0);
    }
  }

  window.addEventListener('keydown', (event) => {
    // Klawisze nie mogą przeszkadzać w wypełnianiu pól panelu.
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)
      return;
    const key = event.key.toLowerCase();
    const flag = DEBUG_KEYS[key];
    if (key === ' ') {
      togglePause();
      event.preventDefault();
    } else if (key === '1' || key === '2' || key === '4') {
      setSpeed(Number(key));
    } else if (key === '.') {
      step();
    } else if (key === 'r') {
      restart();
    } else if (flag !== undefined) {
      toggleDebug(flag);
    }
  });

  render(
    <SandboxPanel
      units={allUnitIds(content)}
      fixedSetup={fixed !== null}
      config={config}
      playback={playback}
      debug={debug}
      onRestart={restart}
      onPause={togglePause}
      onStep={step}
      onSpeed={setSpeed}
      onDebug={toggleDebug}
    />,
    ui,
  );

  createFrameLoop((frameMs) => {
    runner.frame(viewport, frameMs);
    const { state } = runner.battle;
    const { speed, paused } = runner.loop;
    const shown = playback.value;
    // Sygnał zmieniamy tylko wtedy, gdy coś się zmieniło, żeby panel nie renderował się co klatkę.
    if (shown.tick !== state.tick || shown.speed !== speed || shown.paused !== paused) {
      const outcome =
        state.outcome === OUTCOME_IN_PROGRESS
          ? 'trwa'
          : state.outcome === OUTCOME_WIN
            ? 'wygrana'
            : 'przegrana';
      playback.value = { tick: state.tick, outcome, paused, speed };
    }
  }).start();
}
