// Fazy 6 i 7: jednoczesne nałożenie zmian z kolejki, śmierci i warunek końca walki.
// HP zmienia się tylko tutaj, więc kolejność jednostek w pozostałych fazach nie daje przewagi.
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import {
  EVENT_BATTLE_ENDED,
  EVENT_DIED,
  EVENT_HEALED,
  EVENT_KNOCKED_BACK,
  pushEvent,
} from './events.ts';
import {
  MAX_UNITS,
  OUTCOME_LOSS,
  OUTCOME_WIN,
  REASON_ELIMINATED,
  REASON_MUTUAL,
  REASON_TIMEOUT,
  STATUS_DEAD,
  TEAM_SIZE,
} from './types.ts';

/**
 * Faza 6, dla wszystkich jednostek naraz: `hp = min(maxHp, hp - obrażenia + leczenie)`,
 * potem przesunięcie o zsumowany odrzut w stronę własnej krawędzi pola.
 */
export function resolve(battle: Battle): void {
  const { state, specs, pending, events } = battle;
  for (let i = 0; i < MAX_UNITS; i++) {
    if (!isAlive(state.status[i] ?? 0)) continue;
    const damage = pending.damage[i] ?? 0;
    const heal = pending.heal[i] ?? 0;
    let hp = state.hp[i] ?? 0;

    if (damage !== 0 || heal !== 0) {
      const afterDamage = hp - damage;
      const maxHp = specs.maxHp[i] ?? 0;
      hp = afterDamage + heal;
      if (hp > maxHp) hp = maxHp;
      state.hp[i] = hp;
      state.damageTaken[i] = (state.damageTaken[i] ?? 0) + damage;
      // Leczenie, które nie uratowało jednostki, nie jest zgłaszane.
      if (hp > 0 && hp > afterDamage) pushEvent(events, EVENT_HEALED, i, hp - afterDamage, 0);
    }

    // Odrzut zmienia tylko pozycję: nie przerywa zamachu i nie odwołuje trafień w toku.
    const push = pending.knockback[i] ?? 0;
    if (push > 0 && hp > 0) {
      const x = state.x[i] ?? 0;
      let pushed = i < TEAM_SIZE ? x - push : x + push;
      if (pushed < 0) pushed = 0;
      else if (pushed > battle.width) pushed = battle.width;
      if (pushed !== x) {
        state.x[i] = pushed;
        pushEvent(events, EVENT_KNOCKED_BACK, i, Math.abs(pushed - x), 0);
      }
    }
  }
  pending.damage.fill(0);
  pending.heal.fill(0);
  pending.knockback.fill(0);
}

function endBattle(battle: Battle, outcome: number, reason: number): void {
  battle.state.outcome = outcome;
  battle.state.reason = reason;
  pushEvent(battle.events, EVENT_BATTLE_ENDED, outcome, reason, 0);
}

/** Faza 7: śmierci, liczniki czasu i warunek końca. */
export function finish(battle: Battle): void {
  const { state } = battle;
  let players = 0;
  let enemies = 0;
  for (let i = 0; i < MAX_UNITS; i++) {
    if (!isAlive(state.status[i] ?? 0)) continue;
    if ((state.hp[i] ?? 0) <= 0) {
      state.status[i] = STATUS_DEAD;
      state.swingTick[i] = -1;
      pushEvent(battle.events, EVENT_DIED, i, 0, 0);
      continue;
    }
    state.sinceAttack[i] = (state.sinceAttack[i] ?? 0) + 1;
    if (i < TEAM_SIZE) players++;
    else enemies++;
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
