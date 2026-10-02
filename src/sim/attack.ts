// Faza 3: postęp zamachów. W ticku trafienia cios wręcz dopisuje obrażenia do kolejki,
// a strzelec wypuszcza pocisk.
//
// Oś czasu ataku rozpoczętego w ticku T (ADR 0008):
//   T               decyzja o ataku, swingTick = 0
//   T + hitTick     trafienie albo wystrzał
//   T + swingTicks  faza decyzji zwalnia jednostkę
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import { EVENT_ATTACK_HIT, pushEvent } from './events.ts';
import { queueHit } from './hits.ts';
import { spawnProjectile } from './projectiles.ts';
import { MAX_UNITS, STATUS_ATTACKING } from './types.ts';

function meleeHit(battle: Battle, unitId: number): void {
  const { state, specs } = battle;
  const target = state.target[unitId] ?? -1;
  // Cel mógł zginąć w trakcie zamachu: cios chybia, zamach dobiega końca.
  if (target < 0 || !isAlive(state.status[target] ?? 0)) return;
  pushEvent(battle.events, EVENT_ATTACK_HIT, unitId, target, 0);
  queueHit(battle, unitId, target, specs.attack[unitId] ?? 0, specs.knockback[unitId] ?? 0);
}

export function progressAttacks(battle: Battle): void {
  const { state, specs } = battle;
  for (let i = 0; i < MAX_UNITS; i++) {
    if (state.status[i] !== STATUS_ATTACKING) continue;
    const swingTick = state.swingTick[i] ?? 0;
    if (swingTick === (specs.hitTick[i] ?? 0)) {
      // Strzelec wypuszcza pocisk także wtedy, gdy cel już nie żyje: pocisk i tak leci po linii.
      if ((specs.projectileStep[i] ?? 0) === 0) meleeHit(battle, i);
      else spawnProjectile(battle, i);
    }
    state.swingTick[i] = swingTick + 1;
  }
}
