// Piaskownica walki: stanowisko testowe renderera i symulacji.
//
// Sterowanie: spacja pauza, 1/2/4 prędkość, kropka jeden tick (w pauzie), R od nowa.
import { requireContent } from '../content/load.ts';
import { levelSetup, type SquadMember } from '../content/resolve-spec.ts';
import { type BattleRunner, createBattleRunner } from '../game/battle-runner.ts';
import { createFrameLoop } from '../game/frame-loop.ts';
import { attachStage, get2dContext } from '../game/stage.ts';
import { createCanvasRenderer } from '../render/canvas-renderer.ts';
import { type BattleSetup, OUTCOME_IN_PROGRESS, OUTCOME_WIN } from '../sim/index.ts';

const content = requireContent();

function member(unitId: string, rank = 0): SquadMember {
  const unit = content.heroes.get(unitId);
  if (unit === undefined) throw new Error(`Unknown hero "${unitId}"`);
  return { unit, rank, runes: [] };
}

function defaultSetup(): BattleSetup {
  const level = content.levels.get('w1_l4');
  if (level === undefined) throw new Error('Level "w1_l4" is missing');
  return levelSetup(content, level, [
    member('swordsman_a', 4),
    member('swordsman_b'),
    member('archer_a', 4),
    member('archer_b'),
  ]);
}

export function startSandbox(stage: HTMLElement, canvas: HTMLCanvasElement, ui: HTMLElement): void {
  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  const renderer = createCanvasRenderer(ctx);
  let runner: BattleRunner = createBattleRunner(defaultSetup(), renderer);

  // ?tick=N przewija walkę do ticka N i zatrzymuje ją: stały kadr do zrzutów ekranu
  // i do oglądania konkretnego momentu.
  const startTick = Number(new URLSearchParams(location.search).get('tick') ?? '0');
  if (Number.isInteger(startTick) && startTick > 0) {
    runner.loop.paused = true;
    for (let i = 0; i < startTick; i++) runner.stepOnce();
  }

  const status = document.createElement('pre');
  status.className = 'sandbox-status';
  ui.append(status);

  let shownTick = -1;
  let shownSpeed = 0;
  let shownPaused = false;
  function updateStatus(): void {
    const { state } = runner.battle;
    const { speed, paused } = runner.loop;
    // Tekst odświeżamy tylko przy zmianie, żeby nie budować napisu co klatkę.
    if (state.tick === shownTick && speed === shownSpeed && paused === shownPaused) return;
    shownTick = state.tick;
    shownSpeed = speed;
    shownPaused = paused;
    const outcome =
      state.outcome === OUTCOME_IN_PROGRESS
        ? 'trwa'
        : state.outcome === OUTCOME_WIN
          ? 'wygrana'
          : 'przegrana';
    status.textContent = [
      `tick ${state.tick}   x${speed}${paused ? '   PAUZA' : ''}   ${outcome}`,
      'spacja: pauza   1/2/4: prędkość   .: jeden tick   R: od nowa',
    ].join('\n');
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      runner.loop.paused = !runner.loop.paused;
      event.preventDefault();
    } else if (event.key === '1' || event.key === '2' || event.key === '4') {
      runner.loop.speed = Number(event.key);
    } else if (event.key === '.') {
      if (runner.loop.paused) runner.stepOnce();
    } else if (event.key === 'r' || event.key === 'R') {
      const { speed, paused } = runner.loop;
      runner.dispose();
      runner = createBattleRunner(defaultSetup(), renderer);
      runner.loop.speed = speed;
      runner.loop.paused = paused;
    }
  });

  createFrameLoop((frameMs) => {
    runner.frame(viewport, frameMs);
    updateStatus();
  }).start();
}
