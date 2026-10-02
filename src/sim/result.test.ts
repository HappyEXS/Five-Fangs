import { describe, expect, it } from 'vitest';
import { CLOSE_SLOTS, melee, ranged, setupOf } from './fixtures.ts';
import {
  battleResult,
  createBattle,
  createEventBuffer,
  drainEvents,
  EVENT_ATTACK_HIT,
  EVENT_ATTACK_STARTED,
  EVENT_BATTLE_ENDED,
  EVENT_DAMAGED,
  EVENT_DIED,
  hashState,
  OUTCOME_IN_PROGRESS,
  OUTCOME_WIN,
  REASON_ELIMINATED,
  runBattleToEnd,
  stepBattle,
} from './index.ts';

const duel = () =>
  createBattle(setupOf([melee()], [melee({ maxHp: 80, attack: 5, moveStep: 0 })], CLOSE_SLOTS));

describe('log zdarzeń', () => {
  it('pełny log pojedynku 1 na 1 zgadza się z oczekiwanym', () => {
    const battle = duel();
    const log: number[][] = [];
    const frame = createEventBuffer();
    while (battle.state.outcome === OUTCOME_IN_PROGRESS) {
      stepBattle(battle);
      frame.count = 0;
      drainEvents(battle, frame);
      for (let i = 0; i < frame.count; i++) {
        log.push([
          battle.state.tick,
          frame.type[i] ?? 0,
          frame.a[i] ?? 0,
          frame.b[i] ?? 0,
          frame.c[i] ?? 0,
        ]);
      }
    }

    // Kolumny: tick, typ, a, b, c. Obie strony atakują co 30 ticków i trafiają w 6. ticku zamachu.
    expect(log).toEqual([
      [1, EVENT_ATTACK_STARTED, 0, 5, 0],
      [1, EVENT_ATTACK_STARTED, 5, 0, 0],
      [7, EVENT_ATTACK_HIT, 0, 5, 0],
      [7, EVENT_DAMAGED, 5, 40, 0],
      [7, EVENT_ATTACK_HIT, 5, 0, 0],
      [7, EVENT_DAMAGED, 0, 5, 5],
      [31, EVENT_ATTACK_STARTED, 0, 5, 0],
      [31, EVENT_ATTACK_STARTED, 5, 0, 0],
      [37, EVENT_ATTACK_HIT, 0, 5, 0],
      [37, EVENT_DAMAGED, 5, 40, 0],
      [37, EVENT_ATTACK_HIT, 5, 0, 0],
      [37, EVENT_DAMAGED, 0, 5, 5],
      [37, EVENT_DIED, 5, 0, 0],
      [37, EVENT_BATTLE_ENDED, OUTCOME_WIN, REASON_ELIMINATED, 0],
    ]);
  });

  it('drainEvents zbiera zdarzenia z kilku ticków jednej klatki', () => {
    const battle = duel();
    const frame = createEventBuffer();
    for (let i = 0; i < 7; i++) {
      stepBattle(battle);
      drainEvents(battle, frame);
    }
    expect(frame.count).toBe(6);
    expect(frame.type[0]).toBe(EVENT_ATTACK_STARTED);
    expect(frame.type[5]).toBe(EVENT_DAMAGED);
  });

  it('przepełnienie bufora konsumenta jest błędem', () => {
    const battle = duel();
    const tiny = createEventBuffer(1);
    stepBattle(battle);
    expect(() => drainEvents(battle, tiny)).toThrow(/overflow/);
  });
});

describe('wynik walki', () => {
  it('zawiera zwycięzcę, czas, statystyki i hashe', () => {
    const battle = duel();
    const result = runBattleToEnd(battle);
    expect(result.outcome).toBe('win');
    expect(result.reason).toBe('eliminated');
    expect(result.ticks).toBe(37);
    expect(result.damageDealt[0]).toBe(80);
    expect(result.damageTaken[5]).toBe(80);
    expect(result.damageDealt[5]).toBe(10);
    expect(result.finalHp[0]).toBe(590);
    expect(result.finalHp[5]).toBe(0);
    expect(result.stateHash).toBe(hashState(battle.state));
    expect(result.eventHash).toBeGreaterThanOrEqual(0);
  });

  it('rozróżnia powody przegranej', () => {
    const mutual = createBattle(
      setupOf([melee({ maxHp: 40 })], [melee({ maxHp: 40 })], CLOSE_SLOTS),
    );
    expect(runBattleToEnd(mutual)).toMatchObject({ outcome: 'loss', reason: 'mutual', ticks: 7 });

    const stalemate = createBattle(
      setupOf([melee({ moveStep: 0 })], [melee({ moveStep: 0 })], { timeLimitTicks: 90 }),
    );
    expect(runBattleToEnd(stalemate)).toMatchObject({
      outcome: 'loss',
      reason: 'timeout',
      ticks: 90,
    });
  });

  it('rzuca błąd, gdy walka jeszcze trwa', () => {
    expect(() => battleResult(duel())).toThrow(/in progress/);
  });

  it('ten sam setup daje te same hashe, inny setup inne', () => {
    const setup = setupOf([melee(), ranged()], [melee(), ranged({ knockback: 2560 })]);
    const a = runBattleToEnd(createBattle(setup));
    const b = runBattleToEnd(createBattle(setup));
    expect(a).toEqual(b);

    const other = runBattleToEnd(
      createBattle(setupOf([melee(), ranged()], [melee({ attack: 41 }), ranged()])),
    );
    expect(other.stateHash).not.toBe(a.stateHash);
    expect(other.eventHash).not.toBe(a.eventHash);
  });

  it('każda walka kończy się najpóźniej na limicie czasu', () => {
    const setup = setupOf(
      [melee(), melee(), ranged(), ranged(), ranged()],
      [melee(), melee(), melee(), ranged(), ranged()],
    );
    const result = runBattleToEnd(createBattle(setup));
    expect(result.ticks).toBeLessThanOrEqual(2700);
    expect(['win', 'loss']).toContain(result.outcome);
  });
});
