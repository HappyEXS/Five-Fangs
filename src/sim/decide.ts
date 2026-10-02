// Faza 1: decyzje. Każda żywa jednostka poza zamachem wybiera cel i akcję na ten tick.
// Decyzja czyta wyłącznie pozycje z początku ticka (`prevX`), więc nie zależy od tego,
// które jednostki zdążyły się już ruszyć.
import type { Battle } from './battle.ts';
import { EVENT_ATTACK_STARTED, pushEvent } from './events.ts';
import type { BattleState } from './state.ts';
import { STATUS_ATTACKING, STATUS_IDLE, STATUS_MOVING, TEAM_SIZE } from './types.ts';

/** Jednostka żyje, gdy stoi, idzie albo atakuje. */
export function isAlive(status: number): boolean {
  return status >= STATUS_IDLE && status <= STATUS_ATTACKING;
}

/**
 * Żywa jednostka drużyny stojąca najbliżej przeciwnika, albo -1. `firstId` to 0 dla gracza
 * (szukamy największego x) albo TEAM_SIZE dla przeciwnika (najmniejszego x).
 * Przy równej pozycji wygrywa niższe `unitId`.
 */
export function frontUnit(state: BattleState, firstId: number): number {
  const { status, x } = state;
  const sign = firstId === 0 ? 1 : -1;
  let front = -1;
  let frontX = 0;
  for (let i = firstId; i < firstId + TEAM_SIZE; i++) {
    if (!isAlive(status[i] ?? 0)) continue;
    const position = (x[i] ?? 0) * sign;
    if (front === -1 || position > frontX) {
      front = i;
      frontX = position;
    }
  }
  return front;
}

/**
 * Najbliższy żywy wróg jednostki albo -1; przy równej odległości niższe `unitId`.
 *
 * Wrogie jednostki nigdy się nie mijają (gwarantuje to walidacja setupu), więc wszyscy
 * przeciwnicy stoją po tej samej stronie jednostki. Najbliższym jest zatem zawsze ten
 * najbardziej wysunięty, ten sam dla całej drużyny, i wystarczy wyznaczyć go raz na tick.
 */
export function nearestEnemy(state: BattleState, unitId: number): number {
  return frontUnit(state, unitId < TEAM_SIZE ? TEAM_SIZE : 0);
}

/**
 * Decyzja żywej jednostki `i`; `enemy` to najbliższy żywy wróg z początku ticka albo -1.
 * Zwraca status jednostki na ten tick.
 */
export function decideUnit(battle: Battle, i: number, enemy: number): number {
  const { state, specs } = battle;
  if (state.status[i] === STATUS_ATTACKING) {
    // W trakcie zamachu jednostka nie zmienia celu ani się nie rusza.
    if ((state.swingTick[i] ?? 0) < (specs.swingTicks[i] ?? 0)) return STATUS_ATTACKING;
    state.swingTick[i] = -1;
  }

  state.target[i] = enemy;
  let next = STATUS_IDLE;
  if (enemy !== -1) {
    const distance = Math.abs((state.prevX[enemy] ?? 0) - (state.prevX[i] ?? 0));
    if (distance > (specs.range[i] ?? 0)) {
      next = STATUS_MOVING;
    } else if ((state.sinceAttack[i] ?? 0) >= (specs.attackInterval[i] ?? 0)) {
      next = STATUS_ATTACKING;
      state.swingTick[i] = 0;
      state.sinceAttack[i] = 0;
      pushEvent(battle.events, EVENT_ATTACK_STARTED, i, enemy, 0);
    }
    // W przeciwnym razie cel jest w zasięgu, ale odstęp między atakami jeszcze trwa.
  }
  state.status[i] = next;
  return next;
}
