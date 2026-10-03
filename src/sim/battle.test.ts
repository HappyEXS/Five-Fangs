import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { melee, ranged, setupOf, TEST_ARENA, u } from './fixtures.ts';
import { hashState } from './hash.ts';
import {
  forwardOf,
  OUTCOME_IN_PROGRESS,
  STATUS_EMPTY,
  STATUS_IDLE,
  TEAM_ENEMY,
  TEAM_PLAYER,
  teamOf,
} from './types.ts';
import { validateSetup } from './validate-setup.ts';

describe('createBattle', () => {
  it('stawia jednostki na slotach z pełnym HP', () => {
    const battle = createBattle(setupOf([melee(), null, ranged()], [melee({ maxHp: 900 })]));
    const { state, specs } = battle;

    expect(Array.from(state.status)).toEqual([
      STATUS_IDLE,
      STATUS_EMPTY,
      STATUS_IDLE,
      STATUS_EMPTY,
      STATUS_EMPTY,
      STATUS_IDLE,
      STATUS_EMPTY,
      STATUS_EMPTY,
      STATUS_EMPTY,
      STATUS_EMPTY,
    ]);
    expect(state.x[0]).toBe(u(400));
    expect(state.x[2]).toBe(u(280));
    expect(state.x[5]).toBe(u(600));
    expect(state.prevX[5]).toBe(u(600));
    expect(state.hp[0]).toBe(600);
    expect(state.hp[2]).toBe(350);
    expect(state.hp[5]).toBe(900);
    expect(specs.projectileStep[0]).toBe(0);
    expect(specs.projectileStep[2]).toBeGreaterThan(0);
  });

  it('zaczyna bez celu, poza zamachem, z gotowym pierwszym atakiem', () => {
    const { state, specs } = createBattle(setupOf([melee()], [melee()]));
    expect(state.tick).toBe(0);
    expect(state.outcome).toBe(OUTCOME_IN_PROGRESS);
    expect(state.target[0]).toBe(-1);
    expect(state.swingTick[0]).toBe(-1);
    expect(state.sinceAttack[0]).toBe(specs.attackInterval[0]);
    expect(state.projCount).toBe(0);
  });

  it('rzuca błąd dla niepoprawnego setupu', () => {
    expect(() => createBattle(setupOf([melee({ maxHp: 0 })], [melee()]))).toThrow(/maxHp/);
  });
});

describe('teamOf i forwardOf', () => {
  it('przypisują drużynę i kierunek', () => {
    expect(teamOf(0)).toBe(TEAM_PLAYER);
    expect(teamOf(4)).toBe(TEAM_PLAYER);
    expect(teamOf(5)).toBe(TEAM_ENEMY);
    expect(forwardOf(TEAM_PLAYER)).toBe(1);
    expect(forwardOf(TEAM_ENEMY)).toBe(-1);
  });
});

describe('hashState', () => {
  it('jest stabilny dla tego samego setupu', () => {
    const setup = setupOf([melee(), ranged()], [melee(), melee()]);
    expect(hashState(createBattle(setup).state)).toBe(hashState(createBattle(setup).state));
  });

  it('zmienia się przy zmianie dowolnej statystyki widocznej w stanie', () => {
    const base = hashState(createBattle(setupOf([melee()], [melee()])).state);
    expect(hashState(createBattle(setupOf([melee({ maxHp: 601 })], [melee()])).state)).not.toBe(
      base,
    );
    expect(hashState(createBattle(setupOf([melee()], [null, melee()])).state)).not.toBe(base);
  });

  it('zmienia się, gdy zmienia się stan', () => {
    const battle = createBattle(setupOf([melee()], [melee()]));
    const before = hashState(battle.state);
    battle.state.x[0] = (battle.state.x[0] ?? 0) + 1;
    expect(hashState(battle.state)).not.toBe(before);
  });
});

describe('validateSetup', () => {
  const problems = (setup: Parameters<typeof validateSetup>[0]) => validateSetup(setup);

  it('akceptuje poprawny setup', () => {
    expect(problems(setupOf([melee(), ranged()], [melee()]))).toEqual([]);
  });

  it('wymaga liczb całkowitych', () => {
    expect(problems(setupOf([melee({ moveStep: 1.5 })], [melee()]))[0]).toContain('moveStep');
    expect(problems(setupOf([melee({ attack: -1 })], [melee()]))[0]).toContain('attack');
  });

  it('pilnuje zależności między polami ataku', () => {
    expect(problems(setupOf([melee({ hitTick: 12 })], [melee()]))[0]).toContain('hitTick');
    expect(problems(setupOf([melee({ hitTick: 0 })], [melee()]))[0]).toContain('hitTick');
    expect(problems(setupOf([melee({ swingTicks: 1, hitTick: 1 })], [melee()]))).not.toEqual([]);
    expect(problems(setupOf([melee({ attackInterval: 11 })], [melee()]))[0]).toContain(
      'attackInterval',
    );
  });

  it('pierce tylko z pociskiem, leczenie tylko z interwałem', () => {
    expect(problems(setupOf([melee({ pierce: true })], [melee()]))[0]).toContain('pierce');
    expect(problems(setupOf([melee({ healAmount: 10 })], [melee()]))[0]).toContain('healInterval');
    expect(problems(setupOf([ranged({ pierce: true })], [melee()]))).toEqual([]);
  });

  it('krok ruchu nie może przekraczać najmniejszego zasięgu', () => {
    const fast = melee({ moveStep: u(31) });
    expect(problems(setupOf([fast], [melee()]))[0]).toContain('minąć');
  });

  it('pilnuje puli pocisków', () => {
    const spammer = ranged({ projectileStep: 64, attackInterval: 18 });
    const team = [spammer, spammer, spammer, spammer, spammer];
    expect(problems(setupOf(team, team)).at(-1)).toContain('pocisków');
  });

  it('pilnuje areny', () => {
    const bad = setupOf([melee()], [melee()], { playerSlots: [700, 340, 280, 220, 160].map(u) });
    expect(problems(bad)[0]).toContain('na lewo');
    expect(problems(setupOf([melee()], [melee()], { width: 0 }))[0]).toContain('width');
    expect(
      problems({ arena: TEST_ARENA, player: [melee()], enemy: [melee()] }).join('\n'),
    ).toContain('slotów');
  });
});
