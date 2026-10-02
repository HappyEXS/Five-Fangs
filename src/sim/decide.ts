// Faza 1: decyzje. Każda żywa jednostka poza zamachem wybiera cel i akcję na ten tick.
// Faza czyta pozycje z początku ticka (nikt się jeszcze nie ruszył), więc kolejność
// jednostek nie wpływa na wynik.
import type { Battle } from './battle.ts';
import { EVENT_ATTACK_STARTED, pushEvent } from './events.ts';
import type { BattleState } from './state.ts';
import { MAX_UNITS, STATUS_ATTACKING, STATUS_IDLE, STATUS_MOVING, TEAM_SIZE } from './types.ts';

/** Jednostka żyje, gdy stoi, idzie albo atakuje. */
export function isAlive(status: number): boolean {
  return status >= STATUS_IDLE && status <= STATUS_ATTACKING;
}

/** Najbliższy żywy wróg albo -1. Przy równej odległości wygrywa niższe `unitId`. */
export function nearestEnemy(state: BattleState, unitId: number): number {
  const first = unitId < TEAM_SIZE ? TEAM_SIZE : 0;
  const myX = state.x[unitId] ?? 0;
  let best = -1;
  let bestDistance = 0;
  for (let enemy = first; enemy < first + TEAM_SIZE; enemy++) {
    if (!isAlive(state.status[enemy] ?? 0)) continue;
    const distance = Math.abs((state.x[enemy] ?? 0) - myX);
    if (best === -1 || distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

export function decide(battle: Battle): void {
  const { state, specs, events } = battle;
  for (let i = 0; i < MAX_UNITS; i++) {
    const status = state.status[i] ?? 0;
    if (!isAlive(status)) continue;

    if (status === STATUS_ATTACKING) {
      // W trakcie zamachu jednostka nie zmienia celu ani się nie rusza.
      if ((state.swingTick[i] ?? 0) < (specs.swingTicks[i] ?? 0)) continue;
      state.swingTick[i] = -1;
    }

    const target = nearestEnemy(state, i);
    state.target[i] = target;
    if (target === -1) {
      state.status[i] = STATUS_IDLE;
      continue;
    }

    const distance = Math.abs((state.x[target] ?? 0) - (state.x[i] ?? 0));
    if (distance > (specs.range[i] ?? 0)) {
      state.status[i] = STATUS_MOVING;
    } else if ((state.sinceAttack[i] ?? 0) >= (specs.attackInterval[i] ?? 0)) {
      state.status[i] = STATUS_ATTACKING;
      state.swingTick[i] = 0;
      state.sinceAttack[i] = 0;
      pushEvent(events, EVENT_ATTACK_STARTED, i, target, 0);
    } else {
      // Cel w zasięgu, ale odstęp między atakami jeszcze trwa.
      state.status[i] = STATUS_IDLE;
    }
  }
}
