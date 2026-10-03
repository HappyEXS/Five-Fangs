import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import {
  EVENT_ATTACK_HIT,
  EVENT_ATTACK_STARTED,
  EVENT_BATTLE_ENDED,
  EVENT_DAMAGED,
  EVENT_DIED,
} from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, runTicks, runUntil, setupOf, u } from './fixtures.ts';
import { stepBattle } from './step.ts';
import {
  OUTCOME_IN_PROGRESS,
  OUTCOME_LOSS,
  OUTCOME_WIN,
  REASON_ELIMINATED,
  REASON_MUTUAL,
  REASON_TIMEOUT,
  STATUS_ATTACKING,
  STATUS_DEAD,
  STATUS_IDLE,
  STATUS_MOVING,
  type UnitSpec,
} from './types.ts';

// Fixture `melee()`: zamach 12 ticków, trafienie w 6., atak co 30 ticków, 40 obrażeń, 600 HP.
const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });
const close = (player: (UnitSpec | null)[], enemy: (UnitSpec | null)[]) =>
  createBattle(setupOf(player, enemy, CLOSE_SLOTS));

describe('oś czasu ataku wręcz', () => {
  it('atak zaczyna się w ticku 1, trafia w ticku 1 + hitTick', () => {
    const battle = close([melee()], [melee()]);
    const { state } = battle;

    stepBattle(battle);
    expect(state.status[0]).toBe(STATUS_ATTACKING);
    expect(lastEvents(battle)).toEqual([
      [EVENT_ATTACK_STARTED, 0, 5, 0],
      [EVENT_ATTACK_STARTED, 5, 0, 0],
    ]);

    runTicks(battle, 5);
    expect(state.hp[0]).toBe(600);
    expect(state.hp[5]).toBe(600);

    stepBattle(battle);
    expect(state.tick).toBe(7);
    expect(state.hp[0]).toBe(560);
    expect(state.hp[5]).toBe(560);
    expect(lastEvents(battle)).toEqual([
      [EVENT_ATTACK_HIT, 0, 5, 0],
      [EVENT_DAMAGED, 5, 40, 0],
      [EVENT_ATTACK_HIT, 5, 0, 0],
      [EVENT_DAMAGED, 0, 40, 5],
    ]);
  });

  it('po zamachu jednostka czeka do końca odstępu, potem atakuje ponownie', () => {
    const battle = close([melee()], [still({ attack: 0 })]);
    const { state } = battle;

    runTicks(battle, 12);
    expect(state.status[0]).toBe(STATUS_ATTACKING);
    stepBattle(battle);
    expect(state.tick).toBe(13);
    expect(state.status[0]).toBe(STATUS_IDLE);
    expect(state.swingTick[0]).toBe(-1);

    runTicks(battle, 17);
    expect(state.tick).toBe(30);
    expect(state.status[0]).toBe(STATUS_IDLE);
    stepBattle(battle);
    expect(state.status[0]).toBe(STATUS_ATTACKING);
    expect(lastEvents(battle)[0]).toEqual([EVENT_ATTACK_STARTED, 0, 5, 0]);

    runTicks(battle, 6);
    expect(state.tick).toBe(37);
    expect(state.hp[5]).toBe(520);
  });

  it('przy odstępie równym zamachowi ataki następują jeden po drugim', () => {
    const battle = close([melee({ attackInterval: 12 })], [still({ attack: 0 })]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.hp[5]).toBe(560);
    runTicks(battle, 12);
    expect(state.hp[5]).toBe(520);
    runTicks(battle, 12);
    expect(state.hp[5]).toBe(480);
  });

  it('w trakcie zamachu jednostka nie zmienia celu ani się nie rusza', () => {
    // Wróg ze slotu 1 jest szybki i ma krótszy zasięg, więc w trakcie zamachu staje bliżej
    // niż pierwotny cel.
    const runner = melee({ attack: 0, range: u(10), moveStep: u(8) });
    const battle = close([still()], [still({ attack: 0 }), runner]);
    const { state } = battle;
    stepBattle(battle);
    expect(state.target[0]).toBe(5);

    runTicks(battle, 11);
    expect(state.x[6]).toBeLessThan(state.x[5] ?? 0);
    expect(state.target[0]).toBe(5);
    expect(state.x[0]).toBe(u(500));

    stepBattle(battle);
    expect(state.tick).toBe(13);
    expect(state.target[0]).toBe(6);
  });
});

describe('rozstrzygnięcie', () => {
  it('obrażenia z jednego ticka sumują się i są liczone w statystykach', () => {
    const battle = close([melee(), melee({ range: u(100) })], [still({ attack: 0 })]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.hp[5]).toBe(520);
    expect(state.damageTaken[5]).toBe(80);
    expect(state.damageDealt[0]).toBe(40);
    expect(state.damageDealt[1]).toBe(40);
  });

  it('dwie jednostki mogą zabić się nawzajem w tym samym ticku', () => {
    const battle = close([melee({ maxHp: 40 })], [melee({ maxHp: 40 })]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.status[0]).toBe(STATUS_DEAD);
    expect(state.status[5]).toBe(STATUS_DEAD);
    expect(state.hp[0]).toBe(0);
    expect(state.outcome).toBe(OUTCOME_LOSS);
    expect(state.reason).toBe(REASON_MUTUAL);
    expect(lastEvents(battle).slice(-3)).toEqual([
      [EVENT_DIED, 0, 0, 0],
      [EVENT_DIED, 5, 0, 0],
      [EVENT_BATTLE_ENDED, OUTCOME_LOSS, REASON_MUTUAL, 0],
    ]);
  });

  it('cios w cel, który zginął w trakcie zamachu, chybia, a zamach dobiega końca', () => {
    // Drugi bohater trafia później (hitTick 10), gdy pierwszy już zabił cel w ticku 7.
    const late = melee({ range: u(100), hitTick: 10 });
    const battle = close([melee(), late], [still({ maxHp: 40, attack: 0 }), still({ attack: 0 })]);
    const { state } = battle;

    runTicks(battle, 7);
    expect(state.status[5]).toBe(STATUS_DEAD);
    expect(state.status[1]).toBe(STATUS_ATTACKING);
    expect(state.target[1]).toBe(5);

    runTicks(battle, 4);
    expect(state.tick).toBe(11);
    expect(lastEvents(battle)).toEqual([]);
    expect(state.damageDealt[1]).toBe(0);
    expect(state.hp[6]).toBe(600);

    stepBattle(battle);
    expect(state.status[1]).toBe(STATUS_ATTACKING);
    stepBattle(battle);
    expect(state.tick).toBe(13);
    expect(state.status[1]).toBe(STATUS_MOVING);
    expect(state.target[1]).toBe(6);
  });

  it('nadmiarowe obrażenia zostawiają ujemne HP, a martwy nie przyjmuje kolejnych', () => {
    const battle = close([melee({ attack: 100 })], [still({ maxHp: 30, attack: 0 }), still()]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.hp[5]).toBe(-70);
    expect(state.status[5]).toBe(STATUS_DEAD);
    runTicks(battle, 60);
    expect(state.hp[5]).toBe(-70);
  });
});

describe('koniec walki', () => {
  it('wygrana po zabiciu ostatniego wroga', () => {
    const battle = close([melee()], [still({ maxHp: 40, attack: 0 })]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.outcome).toBe(OUTCOME_WIN);
    expect(state.reason).toBe(REASON_ELIMINATED);
    expect(lastEvents(battle).at(-1)).toEqual([
      EVENT_BATTLE_ENDED,
      OUTCOME_WIN,
      REASON_ELIMINATED,
      0,
    ]);

    const hash = battle.eventHash;
    runTicks(battle, 5);
    expect(state.tick).toBe(7);
    expect(battle.eventHash).toBe(hash);
  });

  it('przegrana po stracie wszystkich bohaterów', () => {
    const battle = close([still({ maxHp: 40, attack: 0 })], [melee()]);
    runTicks(battle, 7);
    expect(battle.state.outcome).toBe(OUTCOME_LOSS);
    expect(battle.state.reason).toBe(REASON_ELIMINATED);
  });

  it('limit czasu oznacza przegraną gracza', () => {
    // Nikt się nie rusza i nikt nie ma nikogo w zasięgu.
    const battle = createBattle(setupOf([still()], [still()], { timeLimitTicks: 50 }));
    const { state } = battle;
    runTicks(battle, 49);
    expect(state.outcome).toBe(OUTCOME_IN_PROGRESS);
    stepBattle(battle);
    expect(state.tick).toBe(50);
    expect(state.outcome).toBe(OUTCOME_LOSS);
    expect(state.reason).toBe(REASON_TIMEOUT);
  });

  it('zabicie ostatniego wroga dokładnie w ostatnim ticku to wygrana', () => {
    const battle = createBattle(
      setupOf([melee()], [still({ maxHp: 40, attack: 0 })], { ...CLOSE_SLOTS, timeLimitTicks: 7 }),
    );
    runTicks(battle, 7);
    expect(battle.state.outcome).toBe(OUTCOME_WIN);
  });

  it('walka bez przeciwnika kończy się wygraną w pierwszym ticku', () => {
    const battle = createBattle(setupOf([melee()], []));
    stepBattle(battle);
    expect(battle.state.outcome).toBe(OUTCOME_WIN);
  });

  it('pełny pojedynek dochodzi do rozstrzygnięcia', () => {
    const battle = createBattle(setupOf([melee()], [melee({ maxHp: 300 })]));
    const ticks = runUntil(battle, () => false);
    expect(battle.state.outcome).toBe(OUTCOME_WIN);
    // 43 ticki dojścia, potem 8 wymian ciosów co 30 ticków. Ostatnia wymiana jest jednoczesna
    // ze śmiercią wroga, więc bohater przyjmuje także ósmy cios.
    expect(ticks).toBeGreaterThan(200);
    expect(ticks).toBeLessThan(300);
    expect(battle.state.hp[0]).toBe(600 - 8 * 40);
  });
});
