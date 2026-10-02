// Kolejka trafień. Ciosy wręcz i pociski dopisują tu swoje skutki; HP zmienia dopiero
// faza rozstrzygnięcia, dla wszystkich jednostek naraz.
import type { Battle } from './battle.ts';
import { EVENT_DAMAGED, pushEvent } from './events.ts';

export function queueHit(battle: Battle, source: number, target: number, damage: number): void {
  const { state, pending } = battle;
  pending.damage[target] = (pending.damage[target] ?? 0) + damage;
  state.damageDealt[source] = (state.damageDealt[source] ?? 0) + damage;
  pushEvent(battle.events, EVENT_DAMAGED, target, damage, source);
}
