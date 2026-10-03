// Faza 3: postęp zamachów. W ticku trafienia cios wręcz dopisuje obrażenia do kolejki
// (z cechą splash także dla wrogów wokół celu), a strzelec wypuszcza pocisk.
//
// Oś czasu ataku rozpoczętego w ticku T (ADR 0008):
//   T               decyzja o ataku, swingTick = 0
//   T + hitTick     trafienie albo wystrzał
//   T + swingTicks  faza decyzji zwalnia jednostkę
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import { EVENT_ATTACK_HIT, pushEvent } from './events.ts';
import { attackDamage, queueHit } from './hits.ts';
import { spawnProjectile } from './projectiles.ts';
import { TEAM_SIZE } from './types.ts';

function meleeHit(battle: Battle, unitId: number): void {
  const { state, specs } = battle;
  const target = state.target[unitId] ?? -1;
  // Cel mógł zginąć w trakcie zamachu: cios chybia, zamach dobiega końca.
  if (target < 0 || !isAlive(state.status[target] ?? 0)) return;
  pushEvent(battle.events, EVENT_ATTACK_HIT, unitId, target, 0);
  const damage = attackDamage(battle, unitId);
  queueHit(battle, unitId, target, damage, specs.knockback[unitId] ?? 0);

  // Cios obszarowy: pełne obrażenia dla pozostałych wrogów w promieniu od celu, bez odrzutu.
  const radius = specs.splashRadius[unitId] ?? 0;
  if (radius === 0) return;
  // Odległości z pozycji z początku ticka, żeby wynik nie zależał od tego, które jednostki
  // zdążyły się już w tym ticku ruszyć.
  const { status, prevX } = state;
  const center = prevX[target] ?? 0;
  const first = target < TEAM_SIZE ? 0 : TEAM_SIZE;
  for (let other = first; other < first + TEAM_SIZE; other++) {
    if (other === target || !isAlive(status[other] ?? 0)) continue;
    const offset = (prevX[other] ?? 0) - center;
    if (offset <= radius && offset >= -radius) queueHit(battle, unitId, other, damage, 0);
  }
}

/** Postęp zamachu jednostki `i`, która w tym ticku ma status Attacking. */
export function progressAttack(battle: Battle, i: number): void {
  const { state, specs } = battle;
  const tick = state.swingTick[i] ?? 0;
  if (tick === (specs.hitTick[i] ?? 0)) {
    // Strzelec wypuszcza pocisk także wtedy, gdy cel już nie żyje: pocisk i tak leci po linii.
    if ((specs.projectileStep[i] ?? 0) === 0) meleeHit(battle, i);
    else spawnProjectile(battle, i);
  }
  state.swingTick[i] = tick + 1;
}
