// Kolejka trafień. Ciosy wręcz i pociski dopisują tu swoje skutki; HP i pozycję odrzuconych
// zmienia dopiero faza rozstrzygnięcia, dla wszystkich jednostek naraz.
import { mulDivFloor } from '../core/int.ts';
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import { EVENT_DAMAGED, pushEvent } from './events.ts';

/**
 * Obrażenia ataku jednostki w tej chwili: z premią szału, gdy jej HP jest poniżej progu.
 * HP zmienia się tylko w rozstrzygnięciu ticka, więc wynik nie zależy od kolejności jednostek.
 */
export function attackDamage(battle: Battle, unitId: number): number {
  const { specs } = battle;
  return (battle.state.hp[unitId] ?? 0) < (specs.enrageHp[unitId] ?? 0)
    ? (specs.enragedAttack[unitId] ?? 0)
    : (specs.attack[unitId] ?? 0);
}

/**
 * Dopisuje trafienie do kolejki. `knockback` to odrzut źródła (dla pocisku: strzelca z chwili
 * wystrzału); trafiony jest odpychany o różnicę ponad własny odrzut, nigdy przyciągany.
 */
export function queueHit(
  battle: Battle,
  source: number,
  target: number,
  damage: number,
  knockback: number,
): void {
  const { state, pending } = battle;
  pending.damage[target] = (pending.damage[target] ?? 0) + damage;
  const push = knockback - (battle.specs.knockback[target] ?? 0);
  if (push > 0) pending.knockback[target] = (pending.knockback[target] ?? 0) + push;
  state.damageDealt[source] = (state.damageDealt[source] ?? 0) + damage;
  pushEvent(battle.events, EVENT_DAMAGED, target, damage, source);

  // Kradzież życia: leczenie trafia do tej samej kolejki, więc może uratować źródło przed
  // śmiercią w tym samym ticku. Liczy się od obrażeń ciosu, nie od HP, które cel jeszcze miał.
  // Martwy strzelec nie leczy się z pocisków, które jeszcze lecą: kolejka martwych jest pusta.
  const steal = battle.specs.lifesteal[source] ?? 0;
  if (steal > 0 && isAlive(state.status[source] ?? 0)) {
    const heal = mulDivFloor(damage, steal, 100);
    pending.heal[source] = (pending.heal[source] ?? 0) + heal;
    state.healingDone[source] = (state.healingDone[source] ?? 0) + heal;
  }
}
