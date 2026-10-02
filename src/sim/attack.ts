// Faza 3: postęp zamachów. W ticku trafienia cios wręcz dopisuje obrażenia do kolejki.
//
// Oś czasu ataku rozpoczętego w ticku T (ADR 0008):
//   T               decyzja o ataku, swingTick = 0
//   T + hitTick     trafienie
//   T + swingTicks  faza decyzji zwalnia jednostkę
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import { EVENT_ATTACK_HIT, EVENT_DAMAGED, pushEvent } from './events.ts';
import { MAX_UNITS, STATUS_ATTACKING } from './types.ts';

/** Dopisuje trafienie do kolejki; HP zmieni dopiero faza rozstrzygnięcia. */
export function queueHit(battle: Battle, source: number, target: number, damage: number): void {
  const { state, pending } = battle;
  pending.damage[target] = (pending.damage[target] ?? 0) + damage;
  state.damageDealt[source] = (state.damageDealt[source] ?? 0) + damage;
  pushEvent(battle.events, EVENT_DAMAGED, target, damage, source);
}

function meleeHit(battle: Battle, unitId: number): void {
  const { state, specs } = battle;
  const target = state.target[unitId] ?? -1;
  // Cel mógł zginąć w trakcie zamachu: cios chybia, zamach dobiega końca.
  if (target < 0 || !isAlive(state.status[target] ?? 0)) return;
  pushEvent(battle.events, EVENT_ATTACK_HIT, unitId, target, 0);
  queueHit(battle, unitId, target, specs.attack[unitId] ?? 0);
}

export function progressAttacks(battle: Battle): void {
  const { state, specs } = battle;
  for (let i = 0; i < MAX_UNITS; i++) {
    if (state.status[i] !== STATUS_ATTACKING) continue;
    const swingTick = state.swingTick[i] ?? 0;
    if (swingTick === (specs.hitTick[i] ?? 0)) meleeHit(battle, i);
    state.swingTick[i] = swingTick + 1;
  }
}
