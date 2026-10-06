// Fazy 6 i 7: jednoczesne nałożenie zmian z kolejki, śmierci, pojawienie się przyzwanych
// i warunek końca walki. HP zmienia się tylko tutaj, więc kolejność jednostek w pozostałych
// fazach nie daje przewagi.
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import {
  EVENT_BATTLE_ENDED,
  EVENT_DIED,
  EVENT_HEALED,
  EVENT_KNOCKED_BACK,
  pushEvent,
} from './events.ts';
import { spawnSummons } from './summon.ts';
import {
  isPlayerUnit,
  OUTCOME_LOSS,
  OUTCOME_WIN,
  REASON_ELIMINATED,
  REASON_MUTUAL,
  REASON_TIMEOUT,
  STATUS_DEAD,
  TEAM_SIZE,
} from './types.ts';

/**
 * Faza 6 dla żywej jednostki `i`: `hp = min(maxHp, hp - obrażenia + leczenie)`, potem
 * przesunięcie o zsumowany odrzut w stronę własnej krawędzi pola. Zwraca HP po zmianach.
 *
 * Wynik zależy tylko od kolejki tej jednostki, zebranej w poprzednich fazach, więc
 * rozstrzygnięcie jest jednoczesne niezależnie od kolejności wywołań.
 */
function applyPending(battle: Battle, i: number): number {
  const { state, pending, events } = battle;
  const damage = pending.damage[i] ?? 0;
  const heal = pending.heal[i] ?? 0;
  const push = pending.knockback[i] ?? 0;
  let hp = state.hp[i] ?? 0;
  // W większości ticków kolejka jednostki jest pusta.
  if (damage === 0 && heal === 0 && push === 0) return hp;
  pending.damage[i] = 0;
  pending.heal[i] = 0;
  pending.knockback[i] = 0;

  if (damage !== 0 || heal !== 0) {
    const afterDamage = hp - damage;
    const maxHp = battle.specs.maxHp[i] ?? 0;
    hp = afterDamage + heal;
    if (hp > maxHp) hp = maxHp;
    state.hp[i] = hp;
    state.damageTaken[i] = (state.damageTaken[i] ?? 0) + damage;
    // Leczenie, które nie uratowało jednostki, nie jest zgłaszane.
    if (hp > 0 && hp > afterDamage) pushEvent(events, EVENT_HEALED, i, hp - afterDamage, 0);
  }

  // Odrzut zmienia tylko pozycję: nie przerywa zamachu i nie odwołuje trafień w toku.
  if (push > 0 && hp > 0) {
    const x = state.x[i] ?? 0;
    let pushed = isPlayerUnit(i) ? x - push : x + push;
    if (pushed < 0) pushed = 0;
    else if (pushed > battle.width) pushed = battle.width;
    if (pushed !== x) {
      state.x[i] = pushed;
      pushEvent(events, EVENT_KNOCKED_BACK, i, Math.abs(pushed - x), 0);
    }
  }
  return hp;
}

function endBattle(battle: Battle, outcome: number, reason: number): void {
  battle.state.outcome = outcome;
  battle.state.reason = reason;
  pushEvent(battle.events, EVENT_BATTLE_ENDED, outcome, reason, 0);
}

/** Fazy 6 i 7: rozstrzygnięcie kolejki, śmierci, liczniki czasu i warunek końca. */
export function resolveAndFinish(battle: Battle): void {
  const { state } = battle;
  const { status, swingTick, sinceAttack } = state;
  let players = 0;
  let enemies = 0;
  for (let i = 0; i < state.unitSpan; i++) {
    // Kolejka martwych i pustych slotów jest zawsze pusta: trafienia i leczenie omijają je.
    if (!isAlive(status[i] ?? 0)) continue;
    if (applyPending(battle, i) <= 0) {
      status[i] = STATUS_DEAD;
      swingTick[i] = -1;
      pushEvent(battle.events, EVENT_DIED, i, 0, 0);
      continue;
    }
    sinceAttack[i] = (sinceAttack[i] ?? 0) + 1;
    if (isPlayerUnit(i)) players++;
    else enemies++;
  }
  // Przyzwani stają na polu po śmierciach tego ticka: miejsce zwolnione przed chwilą jest już
  // wolne, a strona, której ostatni bohater zginął w ticku przyzwania, walczy dalej.
  if (battle.hasSummons) {
    players += spawnSummons(battle, 0);
    enemies += spawnSummons(battle, TEAM_SIZE);
  }
  state.tick++;

  if (players === 0) {
    endBattle(battle, OUTCOME_LOSS, enemies === 0 ? REASON_MUTUAL : REASON_ELIMINATED);
  } else if (enemies === 0) {
    endBattle(battle, OUTCOME_WIN, REASON_ELIMINATED);
  } else if (state.tick >= battle.timeLimitTicks) {
    endBattle(battle, OUTCOME_LOSS, REASON_TIMEOUT);
  }
}
