// Wynik walki i pomocnicze operacje dla konsumentów symulacji.
import type { Battle } from './battle.ts';
import { appendEvents, type EventBuffer } from './events.ts';
import { hashState } from './hash.ts';
import { stepBattle } from './step.ts';
import { OUTCOME_IN_PROGRESS, OUTCOME_WIN, REASON_ELIMINATED, REASON_MUTUAL } from './types.ts';

export interface BattleResult {
  readonly outcome: 'win' | 'loss';
  readonly reason: 'eliminated' | 'mutual' | 'timeout';
  /** Długość walki w tickach. */
  readonly ticks: number;
  /** Statystyki per `unitId`. */
  readonly damageDealt: readonly number[];
  readonly damageTaken: readonly number[];
  readonly healingDone: readonly number[];
  /** HP na koniec walki per `unitId`; martwi mają wartość niedodatnią, puste sloty 0. */
  readonly finalHp: readonly number[];
  /** Hash stanu końcowego i narastający hash wszystkich zdarzeń, bez znaku. */
  readonly stateHash: number;
  readonly eventHash: number;
}

/**
 * Dopisuje zdarzenia ostatniego ticka do bufora konsumenta. Przy prędkości większej niż x1
 * w jednej klatce wykonuje się kilka ticków, więc wywołuj po każdym `stepBattle`.
 */
export function drainEvents(battle: Battle, out: EventBuffer): void {
  appendEvents(out, battle.events);
}

/** Wynik zakończonej walki. Rzuca błąd, gdy walka jeszcze trwa. */
export function battleResult(battle: Battle): BattleResult {
  const { state } = battle;
  if (state.outcome === OUTCOME_IN_PROGRESS) throw new Error('Battle is still in progress');
  return {
    outcome: state.outcome === OUTCOME_WIN ? 'win' : 'loss',
    reason:
      state.reason === REASON_ELIMINATED
        ? 'eliminated'
        : state.reason === REASON_MUTUAL
          ? 'mutual'
          : 'timeout',
    ticks: state.tick,
    damageDealt: Array.from(state.damageDealt),
    damageTaken: Array.from(state.damageTaken),
    healingDone: Array.from(state.healingDone),
    finalHp: Array.from(state.hp),
    stateHash: hashState(state),
    eventHash: battle.eventHash >>> 0,
  };
}

/** Wykonuje ticki do końca walki. Limit czasu areny gwarantuje, że pętla się skończy. */
export function runBattleToEnd(battle: Battle): BattleResult {
  while (battle.state.outcome === OUTCOME_IN_PROGRESS) stepBattle(battle);
  return battleResult(battle);
}
