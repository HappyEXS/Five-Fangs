import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { backUnit } from './decide.ts';
import {
  EVENT_ATTACK_STARTED,
  EVENT_DIED,
  EVENT_PROJECTILE_EXPIRED,
  EVENT_PROJECTILE_HIT,
} from './events.ts';
import { lastEvents, melee, ranged, runTicks, runUntil, setupOf, u } from './fixtures.ts';
import { hashState } from './hash.ts';
import { stepBattle } from './step.ts';
import {
  OUTCOME_IN_PROGRESS,
  OUTCOME_WIN,
  STATUS_DEAD,
  STATUS_MOVING,
  type UnitSpec,
} from './types.ts';
import { validateSetup } from './validate-setup.ts';

// Strzelec na 400, wrogowie na 600, 660 i 720 (unitId 5, 6, 7). Pocisk powstaje w ticku 10
// i dolatuje do kolejnych pozycji w tickach 25, 29 i 34, tak jak w testach przebicia.
const sniper = (overrides: Partial<UnitSpec> = {}) =>
  ranged({ moveStep: 0, targetLast: true, range: u(1000), ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) =>
  melee({ moveStep: 0, attack: 0, ...overrides });

type BattleOf = ReturnType<typeof createBattle>;

/** Wykonuje ticki do końca lotu wszystkich pocisków i zbiera zdarzenia podanego typu. */
function eventsUntilQuiet(battle: BattleOf, type: number, limit = 200): number[][] {
  const seen: number[][] = [];
  for (let i = 0; i < limit && battle.state.projCount > 0; i++) {
    stepBattle(battle);
    seen.push(...lastEvents(battle).filter((event) => event[0] === type));
  }
  return seen;
}

describe('backUnit', () => {
  it('zwraca koniec szyku: największe x u przeciwnika, najmniejsze u gracza', () => {
    const battle = createBattle(setupOf([dummy(), dummy()], [dummy(), dummy(), dummy()]));
    expect(backUnit(battle.state, 5)).toBe(7);
    expect(backUnit(battle.state, 0)).toBe(1);
  });

  it('pomija poległych, a przy równej pozycji wybiera niższe unitId', () => {
    const battle = createBattle(
      setupOf([dummy()], [dummy(), dummy(), dummy()], {
        enemySlots: [600, 720, 720, 780, 840].map(u),
      }),
    );
    expect(backUnit(battle.state, 5)).toBe(6);
    battle.state.status[6] = STATUS_DEAD;
    expect(backUnit(battle.state, 5)).toBe(7);
    battle.state.status[5] = STATUS_DEAD;
    battle.state.status[7] = STATUS_DEAD;
    expect(backUnit(battle.state, 5)).toBe(-1);
  });
});

describe('cecha targetLast: wybór celu', () => {
  it('celuje w ostatniego wroga w szyku, a nie w najbliższego', () => {
    const battle = createBattle(setupOf([sniper()], [dummy(), dummy(), dummy()]));
    stepBattle(battle);
    expect(lastEvents(battle)).toEqual([[EVENT_ATTACK_STARTED, 0, 7, 0]]);
    expect(battle.state.target[0]).toBe(7);
  });

  it('zwykły strzelec w tym samym składzie dalej celuje w najbliższego', () => {
    const battle = createBattle(
      setupOf([sniper(), ranged({ moveStep: 0, range: u(1000) })], [dummy(), dummy(), dummy()]),
    );
    stepBattle(battle);
    expect(battle.state.target[0]).toBe(7);
    expect(battle.state.target[1]).toBe(5);
  });

  it('stoi w miejscu: cel na końcu pola jest w zasięgu od pierwszego ticka', () => {
    const battle = createBattle(
      setupOf([sniper({ moveStep: ranged().moveStep })], [dummy(), dummy(), dummy()]),
    );
    for (let tick = 0; tick < 120; tick++) {
      stepBattle(battle);
      expect(battle.state.status[0]).not.toBe(STATUS_MOVING);
    }
    expect(battle.state.x[0]).toBe(u(400));
  });

  it('po śmierci ostatniego bierze kolejnego od końca: wrogowie giną od tyłu', () => {
    const battle = createBattle(setupOf([sniper({ attack: 600 })], [dummy(), dummy(), dummy()]));
    const died: number[] = [];
    while (battle.state.outcome === OUTCOME_IN_PROGRESS) {
      stepBattle(battle);
      for (const event of lastEvents(battle)) if (event[0] === EVENT_DIED) died.push(event[1] ?? 0);
    }
    expect(died).toEqual([7, 6, 5]);
    expect(battle.state.outcome).toBe(OUTCOME_WIN);
  });

  it('przeciwnik z cechą strzela w lewo, w gracza stojącego najdalej', () => {
    const battle = createBattle(setupOf([dummy(), dummy(), dummy()], [sniper()]));
    const { state } = battle;
    stepBattle(battle);
    expect(state.target[5]).toBe(2);
    runTicks(battle, 9);
    expect(state.projStep[0]).toBeLessThan(0);
    expect(state.projTarget[0]).toBe(2);
    const hits = eventsUntilQuiet(battle, EVENT_PROJECTILE_HIT);
    expect(hits.map((event) => event[2])).toEqual([2]);
    expect([state.hp[0], state.hp[1], state.hp[2]]).toEqual([600, 600, 570]);
  });
});

describe('cecha targetLast: pocisk', () => {
  it('mija bliższych wrogów i trafia tylko cel', () => {
    const battle = createBattle(setupOf([sniper()], [dummy(), dummy(), dummy()]));
    const { state } = battle;
    runTicks(battle, 10);
    expect(state.projCount).toBe(1);
    expect(state.projTarget[0]).toBe(7);

    // Ticki 25 i 29: pocisk przelatuje przez pozycje wrogów 5 i 6 bez trafienia.
    runTicks(battle, 19);
    expect(state.projCount).toBe(1);
    expect([state.hp[5], state.hp[6], state.hp[7]]).toEqual([600, 600, 600]);

    runTicks(battle, 5);
    expect(state.tick).toBe(34);
    expect(lastEvents(battle).filter((e) => e[0] === EVENT_PROJECTILE_HIT)).toEqual([
      [EVENT_PROJECTILE_HIT, 0, 7, u(720)],
    ]);
    expect(state.projCount).toBe(0);
    expect([state.hp[5], state.hp[6], state.hp[7]]).toEqual([600, 600, 570]);
  });

  it('trafia cel, który idzie naprzeciw, i nikogo, kogo ten po drodze minął', () => {
    const walker = melee({ attack: 0 });
    const battle = createBattle(setupOf([sniper()], [dummy(), dummy(), walker]));
    const { state } = battle;
    runTicks(battle, 10);
    expect(state.projTarget[0]).toBe(7);
    const hits = eventsUntilQuiet(battle, EVENT_PROJECTILE_HIT);
    expect(hits.map((event) => event[2])).toEqual([7]);
    expect([state.hp[5], state.hp[6], state.hp[7]]).toEqual([600, 600, 570]);
  });

  it('cel ginie w trakcie lotu: pocisk nikogo nie trafia i wygasa na krawędzi pola', () => {
    const battle = createBattle(setupOf([sniper()], [dummy(), dummy(), dummy()]));
    const { state } = battle;
    runTicks(battle, 15);
    state.status[7] = STATUS_DEAD;
    const hits: number[][] = [];
    const expired: number[][] = [];
    // Kolejne strzały mają już nowy cel; śledzimy tylko pierwszy pocisk (id 0).
    runUntil(battle, () => {
      for (const event of lastEvents(battle)) {
        if (event[1] !== 0) continue;
        if (event[0] === EVENT_PROJECTILE_HIT) hits.push(event);
        if (event[0] === EVENT_PROJECTILE_EXPIRED) expired.push(event);
      }
      return expired.length > 0;
    });
    expect(hits).toEqual([]);
    expect(expired).toHaveLength(1);
    expect(expired[0]?.[3]).toBeGreaterThan(u(1000));
  });

  it('cel ginie w trakcie zamachu: strzał pada, ale nikogo nie trafia', () => {
    const battle = createBattle(setupOf([sniper()], [dummy(), dummy(), dummy()]));
    const { state } = battle;
    runTicks(battle, 5);
    state.status[7] = STATUS_DEAD;
    runTicks(battle, 5);
    expect(state.projCount).toBe(1);
    expect(state.projTarget[0]).toBe(7);
    runTicks(battle, 25);
    expect([state.hp[5], state.hp[6]]).toEqual([600, 600]);
    // Następny atak wybiera już nowego ostatniego.
    runUntil(battle, () => state.target[0] !== 7);
    expect(state.target[0]).toBe(6);
  });

  it('cel pocisku wchodzi do hasha stanu', () => {
    const battle = createBattle(setupOf([sniper()], [dummy(), dummy(), dummy()]));
    runTicks(battle, 12);
    const before = hashState(battle.state);
    battle.state.projTarget[0] = 6;
    expect(hashState(battle.state)).not.toBe(before);
  });
});

describe('cecha targetLast: niezmienniki', () => {
  const problemsOf = (spec: UnitSpec) => validateSetup(setupOf([spec], [dummy()]));

  it('poprawny strzelec przechodzi walidację', () => {
    expect(problemsOf(sniper())).toEqual([]);
  });

  it('wymaga ataku z pociskiem', () => {
    expect(problemsOf(melee({ targetLast: true, range: u(1000) }))).toEqual([
      'gracz, slot 0: targetLast wymaga ataku z pociskiem',
    ]);
  });

  it('nie łączy się z przebiciem', () => {
    expect(problemsOf(sniper({ pierce: true }))).toEqual([
      'gracz, slot 0: targetLast nie łączy się z pierce',
    ]);
  });

  it('wymaga zasięgu na całe pole, żeby jednostka nie szła do celu przez bliższych wrogów', () => {
    expect(problemsOf(sniper({ range: u(999) }))).toEqual([
      `gracz, slot 0: targetLast wymaga zasięgu na całe pole (range ≥ ${u(1000)})`,
    ]);
    expect(() => createBattle(setupOf([sniper({ range: u(300) })], [dummy()]))).toThrow(
      /zasięgu na całe pole/,
    );
  });
});
