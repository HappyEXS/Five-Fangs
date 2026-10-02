// Jeden tick symulacji. Fazy w stałej kolejności (docs/ARCHITECTURE.md §3.4).
import type { Battle } from './battle.ts';
import { decide, isAlive } from './decide.ts';
import { clearEvents } from './events.ts';
import { hashEvents } from './hash.ts';
import { move } from './move.ts';
import { MAX_UNITS, OUTCOME_IN_PROGRESS } from './types.ts';

/** Faza 0: zapamiętanie pozycji z początku ticka i wyczyszczenie zdarzeń. */
function begin(battle: Battle): void {
  const { state } = battle;
  clearEvents(battle.events);
  state.prevX.set(state.x);
  for (let p = 0; p < state.projCount; p++) state.projPrevX[p] = state.projX[p] ?? 0;
}

/** Zamknięcie ticka: liczniki czasu i hash zdarzeń. */
function end(battle: Battle): void {
  const { state } = battle;
  for (let i = 0; i < MAX_UNITS; i++) {
    if (isAlive(state.status[i] ?? 0)) state.sinceAttack[i] = (state.sinceAttack[i] ?? 0) + 1;
  }
  state.tick++;
  battle.eventHash = hashEvents(battle.eventHash, battle.events);
}

/** Wykonuje jeden tick. Po zakończeniu walki nic nie robi. */
export function stepBattle(battle: Battle): void {
  if (battle.state.outcome !== OUTCOME_IN_PROGRESS) return;
  begin(battle);
  decide(battle);
  move(battle);
  end(battle);
}
