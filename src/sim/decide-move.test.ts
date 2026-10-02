import { describe, expect, it } from 'vitest';
import { type Battle, createBattle } from './battle.ts';
import { nearestEnemy } from './decide.ts';
import { EVENT_ATTACK_STARTED } from './events.ts';
import { melee, ranged, setupOf, u } from './fixtures.ts';
import { stepBattle } from './step.ts';
import {
  OUTCOME_WIN,
  STATUS_ATTACKING,
  STATUS_IDLE,
  STATUS_MOVING,
  type UnitSpec,
} from './types.ts';

const STEP = melee().moveStep;
const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });

function run(battle: Battle, ticks: number): void {
  for (let i = 0; i < ticks; i++) stepBattle(battle);
}

function runUntil(battle: Battle, done: () => boolean, limit = 500): number {
  let ticks = 0;
  while (!done() && ticks < limit) {
    stepBattle(battle);
    ticks++;
  }
  return ticks;
}

describe('wybór celu', () => {
  it('wybiera najbliższego żywego wroga', () => {
    const battle = createBattle(setupOf([melee()], [null, melee(), melee()]));
    expect(nearestEnemy(battle.state, 0)).toBe(6);
    expect(nearestEnemy(battle.state, 6)).toBe(0);
  });

  it('przy równej odległości wybiera niższe unitId', () => {
    const battle = createBattle(
      setupOf([melee(), melee()], [melee(), melee(), melee()], {
        playerSlots: [400, 400, 280, 220, 160].map(u),
        enemySlots: [600, 600, 600, 780, 840].map(u),
      }),
    );
    expect(nearestEnemy(battle.state, 0)).toBe(5);
    expect(nearestEnemy(battle.state, 1)).toBe(5);
    expect(nearestEnemy(battle.state, 5)).toBe(0);
    expect(nearestEnemy(battle.state, 7)).toBe(0);
  });

  it('pomija martwych i puste sloty; bez wrogów zwraca -1', () => {
    const battle = createBattle(setupOf([melee()], [melee(), melee()]));
    battle.state.status[5] = 4;
    expect(nearestEnemy(battle.state, 0)).toBe(6);
    battle.state.status[6] = 4;
    expect(nearestEnemy(battle.state, 0)).toBe(-1);
  });

  it('jednostka bez żywych wrogów stoi bez celu', () => {
    const battle = createBattle(setupOf([melee()], []));
    stepBattle(battle);
    expect(battle.state.status[0]).toBe(STATUS_IDLE);
    expect(battle.state.target[0]).toBe(-1);
    expect(battle.state.x[0]).toBe(u(400));
  });
});

describe('ruch', () => {
  it('obie strony idą ku sobie o swój krok na tick', () => {
    const battle = createBattle(setupOf([melee()], [melee()]));
    stepBattle(battle);
    const { state } = battle;
    expect(state.status[0]).toBe(STATUS_MOVING);
    expect(state.target[0]).toBe(5);
    expect(state.x[0]).toBe(u(400) + STEP);
    expect(state.x[5]).toBe(u(600) - STEP);
    expect(state.prevX[0]).toBe(u(400));
    expect(state.tick).toBe(1);
  });

  it('zatrzymuje się dokładnie na granicy zasięgu przed stojącym celem', () => {
    const battle = createBattle(setupOf([melee()], [still()]));
    const { state } = battle;
    runUntil(battle, () => state.status[0] === STATUS_ATTACKING);
    expect(state.x[0]).toBe(u(600) - u(30));
    expect(state.x[5]).toBe(u(600));
  });

  it('strzelec zatrzymuje się w swoim zasięgu i zaczyna atak', () => {
    const battle = createBattle(setupOf([ranged({ range: u(150) })], [still()]));
    const { state } = battle;
    const ticks = runUntil(battle, () => state.status[0] === STATUS_ATTACKING);
    expect(state.x[0]).toBe(u(600) - u(150));
    // 50 jednostek do przejścia w tempie 427 podjednostek na tick, potem decyzja o ataku.
    expect(ticks).toBe(Math.ceil(u(50) / ranged().moveStep) + 1);
  });

  it('jednostka z celem w zasięgu od razu atakuje i nie rusza się', () => {
    const battle = createBattle(setupOf([ranged()], [still()]));
    stepBattle(battle);
    expect(battle.state.status[0]).toBe(STATUS_ATTACKING);
    expect(battle.state.swingTick[0]).toBe(0);
    expect(battle.state.x[0]).toBe(u(400));
    expect(battle.events.type[0]).toBe(EVENT_ATTACK_STARTED);
    expect(battle.events.a[0]).toBe(0);
    expect(battle.events.b[0]).toBe(5);
  });

  it('sojusznicy mijają się i mogą stać w tym samym miejscu', () => {
    // Wolny startuje z przodu (slot 0), szybki 60 jednostek za nim (slot 1).
    const slow = melee({ moveStep: u(1) });
    const fast = melee({ moveStep: u(4) });
    const battle = createBattle(setupOf([slow, fast], [still()]));
    const { state } = battle;

    run(battle, 30);
    expect(state.x[0]).toBe(u(430));
    expect(state.x[1]).toBe(u(460));

    const ticks = runUntil(
      battle,
      () => state.status[0] === STATUS_ATTACKING && state.status[1] === STATUS_ATTACKING,
    );
    expect(ticks).toBeLessThan(500);
    // Obaj mają ten sam zasięg, więc kończą w tym samym punkcie.
    expect(state.x[0]).toBe(u(570));
    expect(state.x[1]).toBe(u(570));
  });

  it('wrogie jednostki nigdy się nie mijają, nawet przy największym dozwolonym kroku', () => {
    const sprinter = melee({ moveStep: u(30) });
    const battle = createBattle(setupOf([sprinter, sprinter], [sprinter, sprinter]));
    const { state } = battle;
    for (let tick = 0; tick < 60; tick++) {
      stepBattle(battle);
      const front = Math.max(state.x[0] ?? 0, state.x[1] ?? 0);
      const enemyFront = Math.min(state.x[5] ?? 0, state.x[6] ?? 0);
      expect(front).toBeLessThanOrEqual(enemyFront);
    }
    expect(state.status[0]).toBe(STATUS_ATTACKING);
  });

  it('idący co tick wybiera cel od nowa', () => {
    // Wróg ze slotu 1 jest szybszy i wyprzedza wolniejszego ze slotu 0.
    const battle = createBattle(
      setupOf([still()], [melee({ moveStep: 64 }), melee({ moveStep: u(8) })]),
    );
    const { state } = battle;
    stepBattle(battle);
    expect(state.target[0]).toBe(5);
    run(battle, 20);
    expect(state.x[6]).toBeLessThan(state.x[5] ?? 0);
    expect(state.target[0]).toBe(6);
  });
});

describe('stepBattle', () => {
  it('liczy ticki i nic nie robi po zakończeniu walki', () => {
    const battle = createBattle(setupOf([melee()], [melee()]));
    run(battle, 3);
    expect(battle.state.tick).toBe(3);
    battle.state.outcome = OUTCOME_WIN;
    const x = battle.state.x[0];
    run(battle, 3);
    expect(battle.state.tick).toBe(3);
    expect(battle.state.x[0]).toBe(x);
  });

  it('ten sam setup daje identyczny przebieg', () => {
    const setup = setupOf([melee(), ranged()], [melee(), ranged()]);
    const a = createBattle(setup);
    const b = createBattle(setup);
    run(a, 40);
    run(b, 40);
    expect(Array.from(a.state.x)).toEqual(Array.from(b.state.x));
    expect(a.eventHash).toBe(b.eventHash);
  });
});
