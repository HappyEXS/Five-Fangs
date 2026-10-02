// Kolejka trafień. Ciosy wręcz i pociski dopisują tu swoje skutki; HP i pozycję odrzuconych
// zmienia dopiero faza rozstrzygnięcia, dla wszystkich jednostek naraz.
import type { Battle } from './battle.ts';
import { EVENT_DAMAGED, pushEvent } from './events.ts';

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
}
