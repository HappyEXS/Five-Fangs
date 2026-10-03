import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { EVENT_HEALED } from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, runTicks, setupOf } from './fixtures.ts';
import { stepBattle } from './step.ts';
import { STATUS_DEAD, type UnitSpec } from './types.ts';

// Sloty frontowe: bohater na 500, wróg na 520. Pierwsze trafienie wręcz pada w ticku 7,
// kolejne co 30 ticków.
const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) => still({ attack: 0, ...overrides });
const close = (player: (UnitSpec | null)[], enemy: (UnitSpec | null)[]) =>
  createBattle(setupOf(player, enemy, CLOSE_SLOTS));

const heals = (battle: Parameters<typeof lastEvents>[0]) =>
  lastEvents(battle).filter((e) => e[0] === EVENT_HEALED);

describe('leczenie okresowe', () => {
  it('leczy siebie co interwał liczony od początku walki', () => {
    const healer = dummy({ healAmount: 25, healInterval: 10 });
    const battle = close([healer], [still()]);
    const { state } = battle;

    runTicks(battle, 9);
    expect(state.hp[0]).toBe(560);
    stepBattle(battle);
    expect(state.tick).toBe(10);
    expect(state.hp[0]).toBe(585);
    expect(heals(battle)).toEqual([[EVENT_HEALED, 0, 25, 0]]);

    runTicks(battle, 10);
    expect(state.hp[0]).toBe(600);
    expect(heals(battle)).toEqual([[EVENT_HEALED, 0, 15, 0]]);
    expect(state.healingDone[0]).toBe(50);
  });

  it('nie przekracza maxHp i nie zgłasza leczenia przy pełnym zdrowiu', () => {
    const battle = close([dummy({ healAmount: 25, healInterval: 5 })], [dummy()]);
    runTicks(battle, 5);
    expect(battle.state.hp[0]).toBe(600);
    expect(heals(battle)).toEqual([]);
  });

  it('leczenie drużynowe obejmuje wszystkich żywych sojuszników, ale nie wrogów', () => {
    const healer = dummy({ healAmount: 30, healInterval: 8, healTeam: true, range: 2560 });
    const battle = close([dummy(), healer, dummy()], [still(), dummy()]);
    const { state } = battle;
    state.hp[2] = 100;
    state.hp[6] = 100;

    runTicks(battle, 8);
    // Bohater 0 dostał cios w ticku 7 (560), potem leczenie w ticku 8.
    expect(state.hp[0]).toBe(590);
    expect(state.hp[1]).toBe(600);
    expect(state.hp[2]).toBe(130);
    expect(state.hp[6]).toBe(100);
    expect(state.healingDone[1]).toBe(90);
    expect(heals(battle)).toEqual([
      [EVENT_HEALED, 0, 30, 0],
      [EVENT_HEALED, 2, 30, 0],
    ]);
  });

  it('leczenie z tego samego ticka ratuje przed śmiercią', () => {
    // Cios za 40 i leczenie za 20 w ticku 7 przy 30 HP: zostaje 10.
    const survivor = dummy({ healAmount: 20, healInterval: 7 });
    const battle = close([survivor], [still()]);
    battle.state.hp[0] = 30;
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(10);
    expect(battle.state.status[0]).not.toBe(STATUS_DEAD);
    expect(heals(battle)).toEqual([[EVENT_HEALED, 0, 20, 0]]);
  });

  it('za słabe leczenie nie ratuje i nie jest zgłaszane', () => {
    const doomed = dummy({ healAmount: 5, healInterval: 7 });
    const battle = close([doomed, dummy()], [still()]);
    battle.state.hp[0] = 30;
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(-5);
    expect(battle.state.status[0]).toBe(STATUS_DEAD);
    expect(heals(battle)).toEqual([]);
  });

  it('martwy nie jest leczony, a martwy uzdrowiciel nie leczy', () => {
    const healer = dummy({ healAmount: 30, healInterval: 5, healTeam: true });
    const battle = close([dummy(), healer, dummy()], [dummy()]);
    const { state } = battle;
    state.hp[0] = 100;
    state.hp[2] = 100;
    state.status[2] = STATUS_DEAD;

    runTicks(battle, 5);
    expect(state.hp[0]).toBe(130);
    expect(state.hp[2]).toBe(100);

    state.status[1] = STATUS_DEAD;
    runTicks(battle, 10);
    expect(state.hp[0]).toBe(130);
  });

  it('uzdrowiciel ginący w tym ticku jeszcze leczy drużynę', () => {
    // Uzdrowiciel stoi z przodu i w ticku 7, w którym wypada leczenie, dostaje cios za 100:
    // własne leczenie za 30 go nie ratuje (40 - 100 + 30), ale sojusznik zostaje uleczony.
    const healer = dummy({ maxHp: 40, healAmount: 30, healInterval: 7, healTeam: true });
    const battle = close([healer, dummy()], [still({ attack: 100 })]);
    battle.state.hp[1] = 100;
    runTicks(battle, 7);
    expect(battle.state.status[0]).toBe(STATUS_DEAD);
    expect(battle.state.hp[0]).toBe(-30);
    expect(battle.state.hp[1]).toBe(130);
  });

  it('leczenie przeciwnika działa tak samo', () => {
    const healer = dummy({ healAmount: 15, healInterval: 9 });
    const battle = close([still()], [healer]);
    runTicks(battle, 9);
    expect(battle.state.hp[5]).toBe(600 - 40 + 15);
  });

  it('walka bez uzdrowicieli nie ma listy cech', () => {
    expect(close([melee()], [melee()]).healers).toEqual([]);
    const withHealers = close(
      [melee(), melee({ healAmount: 5, healInterval: 30 })],
      [melee({ healAmount: 5, healInterval: 30 })],
    );
    expect(withHealers.healers).toEqual([1, 5]);
  });
});
