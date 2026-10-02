// Połączenie symulacji, pętli stałego kroku i renderera dla jednej walki.
import {
  advanceFixedStep,
  createFixedStep,
  type FixedStep,
  fixedStepAlpha,
} from '../core/fixed-step.ts';
import { TICKS_PER_SECOND } from '../core/units.ts';
import type { Renderer } from '../render/renderer.ts';
import type { Viewport } from '../render/viewport.ts';
import {
  type Battle,
  type BattleSetup,
  createBattle,
  OUTCOME_IN_PROGRESS,
  stepBattle,
} from '../sim/index.ts';

export interface BattleRunner {
  readonly battle: Battle;
  /** Prędkość (`speed`) i pauza (`paused`) odtwarzania; symulacja ich nie zna. */
  readonly loop: FixedStep;
  /** Wykonuje należne ticki i rysuje klatkę. */
  frame(viewport: Viewport, frameMs: number): void;
  /** Wykonuje dokładnie jeden tick niezależnie od pauzy (krokowanie w narzędziach). */
  stepOnce(): void;
  dispose(): void;
}

export function createBattleRunner(setup: BattleSetup, renderer: Renderer): BattleRunner {
  const battle = createBattle(setup);
  const loop = createFixedStep(TICKS_PER_SECOND);
  renderer.beginBattle(battle);

  function tick(): void {
    stepBattle(battle);
    renderer.consume(battle.events);
  }

  return {
    battle,
    loop,
    frame(viewport: Viewport, frameMs: number): void {
      const steps = advanceFixedStep(loop, frameMs);
      for (let i = 0; i < steps && battle.state.outcome === OUTCOME_IN_PROGRESS; i++) tick();
      // Po zakończeniu walki i w pauzie po krokowaniu rysujemy stan dokładnie z ostatniego ticka.
      const settled = battle.state.outcome !== OUTCOME_IN_PROGRESS || loop.paused;
      renderer.draw(
        viewport,
        settled ? 1 : fixedStepAlpha(loop),
        loop.paused ? 0 : frameMs * loop.speed,
      );
    },
    stepOnce(): void {
      if (battle.state.outcome === OUTCOME_IN_PROGRESS) tick();
    },
    dispose(): void {
      renderer.endBattle();
    },
  };
}
