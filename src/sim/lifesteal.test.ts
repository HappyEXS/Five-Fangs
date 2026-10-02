import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { EVENT_HEALED } from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, ranged, runTicks, setupOf } from './fixtures.ts';
import { stepBattle } from './step.ts';
import { STATUS_DEAD, type UnitSpec } from './types.ts';
import { validateSetup } from './validate-setup.ts';

// Sloty frontowe: bohater na 500, wróg na 520. Pierwsze trafienie wręcz pada w ticku 7,
// kolejne co 30 ticków.
const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) => still({ attack: 0, ...overrides });
const close = (player: (UnitSpec | null)[], enemy: (UnitSpec | null)[]) =>
  createBattle(setupOf(player, enemy, CLOSE_SLOTS));

const heals = (battle: Parameters<typeof lastEvents>[0]) =>
  lastEvents(battle).filter((e) => e[0] === EVENT_HEALED);

describe('kradzież życia', () => {
  it('leczy o procent zadanych obrażeń w ticku trafienia', () => {
    const battle = close([still({ lifestealPercent: 50 })], [dummy()]);
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    expect(battle.state.hp[5]).toBe(560);
    expect(battle.state.hp[0]).toBe(120);
    expect(heals(battle)).toEqual([[EVENT_HEALED, 0, 20, 0]]);
    expect(battle.state.healingDone[0]).toBe(20);
  });

  it('zaokrągla leczenie w dół', () => {
    const battle = close([still({ attack: 35, lifestealPercent: 30 })], [dummy()]);
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    // floor(35 × 30%) = 10
    expect(battle.state.hp[0]).toBe(110);
  });

  it('nie przekracza maxHp i nie zgłasza leczenia przy pełnym zdrowiu', () => {
    const battle = close([still({ lifestealPercent: 100 })], [dummy()]);
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(600);
    expect(heals(battle)).toEqual([]);
  });

  it('liczy się od obrażeń ciosu, także gdy cel miał mniej życia', () => {
    const battle = close([still({ lifestealPercent: 50 })], [dummy({ maxHp: 5 })]);
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    expect(battle.state.status[5]).toBe(STATUS_DEAD);
    expect(battle.state.hp[0]).toBe(120);
  });

  it('ratuje przed śmiercią w tym samym ticku', () => {
    // Oba ciosy padają w ticku 7: bohater dostaje 40 przy 30 HP i kradnie 20.
    const battle = close([still({ lifestealPercent: 50 })], [still()]);
    battle.state.hp[0] = 30;
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(10);
    expect(battle.state.status[0]).not.toBe(STATUS_DEAD);
  });

  it('nie ratuje, gdy leczenie nie pokrywa obrażeń', () => {
    const battle = close([still({ lifestealPercent: 50 })], [still()]);
    battle.state.hp[0] = 20;
    runTicks(battle, 7);
    expect(battle.state.status[0]).toBe(STATUS_DEAD);
    expect(heals(battle)).toEqual([]);
  });

  it('łączy się z szałem: leczenie liczy się od powiększonych obrażeń', () => {
    const battle = close(
      [still({ lifestealPercent: 50, enrageHpPercent: 50, enrageAttackPercent: 50 })],
      [dummy()],
    );
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    // 40 + 50% = 60 obrażeń, z tego połowa wraca.
    expect(battle.state.hp[5]).toBe(540);
    expect(battle.state.hp[0]).toBe(130);
  });

  it('strzelec leczy się w chwili trafienia pocisku, nie wystrzału', () => {
    const archer = ranged({ moveStep: 0, lifestealPercent: 50 });
    const battle = createBattle(setupOf([archer], [dummy({ maxHp: 5000 })]));
    battle.state.hp[0] = 100;
    runTicks(battle, 10);
    expect(battle.state.projCount).toBe(1);
    expect(battle.state.hp[0]).toBe(100);
    let healed = false;
    for (let i = 0; i < 40 && !healed; i++) {
      stepBattle(battle);
      healed = heals(battle).length > 0;
    }
    expect(battle.state.hp[0]).toBe(115);
  });

  it('pocisk przebijający leczy za każdego trafionego wroga', () => {
    const archer = ranged({ moveStep: 0, pierce: true, lifestealPercent: 50 });
    const battle = createBattle(
      setupOf([archer], [dummy({ maxHp: 5000 }), dummy({ maxHp: 5000 })]),
    );
    battle.state.hp[0] = 100;
    // Jeden strzał (tick 10) trafia obu wrogów; drugi strzał pada dopiero w ticku 48.
    runTicks(battle, 45);
    expect(battle.state.damageDealt[0]).toBe(60);
    expect(battle.state.hp[0]).toBe(130);
  });

  it('martwy strzelec nie leczy się z pocisku, który jeszcze leci', () => {
    const archer = ranged({ moveStep: 0, lifestealPercent: 50 });
    // Drugi bohater tylko po to, żeby walka nie skończyła się ze śmiercią strzelca.
    const battle = createBattle(setupOf([archer, dummy()], [dummy({ maxHp: 5000 })]));
    runTicks(battle, 10);
    expect(battle.state.projCount).toBe(1);
    // Strzelec ginie, zanim pocisk doleci.
    battle.state.hp[0] = 0;
    battle.state.status[0] = STATUS_DEAD;
    let hit = false;
    for (let i = 0; i < 40 && !hit; i++) {
      stepBattle(battle);
      hit = (battle.state.damageTaken[5] ?? 0) > 0;
    }
    expect(hit).toBe(true);
    expect(battle.state.hp[0]).toBe(0);
    expect(battle.pending.heal[0]).toBe(0);
    expect(battle.state.healingDone[0]).toBe(0);
  });
});

describe('walidacja kradzieży życia', () => {
  const problems = (overrides: Partial<UnitSpec>) =>
    validateSetup(setupOf([melee(overrides)], [melee()]));

  it('przyjmuje 0..100 procent', () => {
    expect(problems({ lifestealPercent: 1 })).toEqual([]);
    expect(problems({ lifestealPercent: 100 })).toEqual([]);
  });

  it('odrzuca wartości powyżej 100, ujemne i ułamkowe', () => {
    expect(problems({ lifestealPercent: 101 })).not.toEqual([]);
    expect(problems({ lifestealPercent: -5 })).not.toEqual([]);
    expect(problems({ lifestealPercent: 2.5 })).not.toEqual([]);
  });
});
