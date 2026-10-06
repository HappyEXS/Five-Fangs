// Hash stanu i zdarzeń dla testów golden. Dwie walki o tym samym hashu stanu po każdym
// ticku przebiegały identycznie.
import { FNV_OFFSET_BASIS, hashInt32, hashInts } from '../core/hash.ts';
import type { EventBuffer } from './events.ts';
import type { BattleState } from './state.ts';
import { SQUAD_UNITS } from './types.ts';

export const EVENT_HASH_SEED = FNV_OFFSET_BASIS;

export function hashState(state: BattleState): number {
  let h = FNV_OFFSET_BASIS;
  h = hashInt32(h, state.tick);
  h = hashInt32(h, state.outcome);
  h = hashInt32(h, state.reason);

  // Walka bez przyzywaczy ma dziesięć jednostek i hash taki sam jak przed dodaniem przyzywania.
  const units = state.unitSpan;
  h = hashInts(h, state.status, units);
  h = hashInts(h, state.x, units);
  h = hashInts(h, state.prevX, units);
  h = hashInts(h, state.hp, units);
  h = hashInts(h, state.target, units);
  h = hashInts(h, state.swingTick, units);
  h = hashInts(h, state.sinceAttack, units);
  h = hashInts(h, state.traitTimer, units);
  h = hashInts(h, state.doubleCharge, units);
  h = hashInts(h, state.dodgeCharge, units);
  if (units > SQUAD_UNITS) {
    h = hashInts(h, state.summonedBy, units);
    h = hashInts(h, state.summonCursor);
  }

  // Tylko aktywne pociski: zawartość zwolnionych miejsc nie wpływa na dalszy przebieg.
  const n = state.projCount;
  h = hashInt32(h, n);
  h = hashInt32(h, state.nextProjId);
  h = hashInts(h, state.projId, n);
  h = hashInts(h, state.projX, n);
  h = hashInts(h, state.projPrevX, n);
  h = hashInts(h, state.projStep, n);
  h = hashInts(h, state.projOwner, n);
  h = hashInts(h, state.projDamage, n);
  h = hashInts(h, state.projKnockback, n);
  h = hashInts(h, state.projMode, n);
  h = hashInts(h, state.projHitMask, n);
  h = hashInts(h, state.projTarget, n);

  h = hashInts(h, state.damageDealt, units);
  h = hashInts(h, state.damageTaken, units);
  h = hashInts(h, state.healingDone, units);
  return h >>> 0;
}

/** Dołącza zdarzenia jednego ticka do narastającego hasha logu. */
export function hashEvents(hash: number, events: EventBuffer): number {
  const n = events.count;
  let h = hashInt32(hash, n);
  h = hashInts(h, events.type, n);
  h = hashInts(h, events.a, n);
  h = hashInts(h, events.b, n);
  h = hashInts(h, events.c, n);
  return h;
}
