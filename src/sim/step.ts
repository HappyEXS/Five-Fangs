// Jeden tick symulacji. Fazy w stałej kolejności (docs/ARCHITECTURE.md §3.4).
import { progressAttacks } from './attack.ts';
import type { Battle } from './battle.ts';
import { decide } from './decide.ts';
import { clearEvents } from './events.ts';
import { hashEvents } from './hash.ts';
import { move } from './move.ts';
import { finish, resolve } from './resolve.ts';
import { OUTCOME_IN_PROGRESS } from './types.ts';

/** Faza 0: zapamiętanie pozycji z początku ticka i wyczyszczenie zdarzeń. */
function begin(battle: Battle): void {
  const { state } = battle;
  clearEvents(battle.events);
  state.prevX.set(state.x);
  for (let p = 0; p < state.projCount; p++) state.projPrevX[p] = state.projX[p] ?? 0;
}

/** Wykonuje jeden tick. Po zakończeniu walki nic nie robi. */
export function stepBattle(battle: Battle): void {
  if (battle.state.outcome !== OUTCOME_IN_PROGRESS) return;
  begin(battle);
  decide(battle);
  move(battle);
  progressAttacks(battle);
  resolve(battle);
  finish(battle);
  battle.eventHash = hashEvents(battle.eventHash, battle.events);
}
