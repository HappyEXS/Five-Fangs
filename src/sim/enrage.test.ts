import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { EVENT_DAMAGED } from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, ranged, runTicks, setupOf, u } from './fixtures.ts';
import { stepBattle } from './step.ts';
import type { UnitSpec } from './types.ts';
import { validateSetup } from './validate-setup.ts';

// Sloty frontowe: bohater na 500, wróg na 520. Pierwsze trafienie wręcz pada w ticku 7,
// kolejne co 30 ticków.
const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) => still({ attack: 0, ...overrides });
const close = (player: (UnitSpec | null)[], enemy: (UnitSpec | null)[]) =>
  createBattle(setupOf(player, enemy, CLOSE_SLOTS));

/** Szał poniżej 50% życia: +50% ataku. */
const berserk = { enrageHpPercent: 50, enrageAttackPercent: 50 } as const;

/** Obrażenia zadane w ostatnim ticku przez bohatera ze slotu 0 (zdarzenie: cel, obrażenia, źródło). */
const damage = (battle: Parameters<typeof lastEvents>[0]) =>
  lastEvents(battle)
    .filter((e) => e[0] === EVENT_DAMAGED && e[3] === 0)
    .map((e) => e[2] ?? 0);

describe('szał', () => {
  it('powyżej progu jednostka zadaje zwykłe obrażenia', () => {
    const battle = close([still(berserk)], [dummy()]);
    runTicks(battle, 7);
    expect(damage(battle)).toEqual([40]);
    expect(battle.state.hp[5]).toBe(560);
  });

  it('poniżej progu zadaje obrażenia powiększone o premię', () => {
    const battle = close([still(berserk)], [dummy()]);
    battle.state.hp[0] = 299;
    runTicks(battle, 7);
    expect(damage(battle)).toEqual([60]);
    expect(battle.state.damageDealt[0]).toBe(60);
  });

  it('próg jest ostry: dokładnie na progu szału jeszcze nie ma', () => {
    const battle = close([still(berserk)], [dummy()]);
    battle.state.hp[0] = 300;
    runTicks(battle, 7);
    expect(damage(battle)).toEqual([40]);
  });

  it('próg dla nieparzystego maxHp liczy się od dokładnej wartości procentowej', () => {
    // 33% z 101 HP to 33,33: szał przy 33 HP, jeszcze nie przy 34.
    const spec = still({ maxHp: 101, enrageHpPercent: 33, enrageAttackPercent: 100 });
    const at = (hp: number) => {
      const battle = close([spec], [dummy()]);
      battle.state.hp[0] = hp;
      runTicks(battle, 7);
      return damage(battle);
    };
    expect(at(34)).toEqual([40]);
    expect(at(33)).toEqual([80]);
  });

  it('premia zaokrągla się w dół', () => {
    const battle = close([still({ attack: 35, ...berserk })], [dummy()]);
    battle.state.hp[0] = 1;
    runTicks(battle, 7);
    // 35 + floor(35 × 50%) = 52
    expect(damage(battle)).toEqual([52]);
  });

  it('o szale decyduje HP z chwili trafienia, nie z początku zamachu', () => {
    // Wróg trafia w ticku 7 razem z bohaterem; drugi cios bohatera (tick 37) pada już w szale.
    const battle = close([still({ maxHp: 60, ...berserk })], [still({ attack: 35 })]);
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(25);
    expect(battle.state.hp[5]).toBe(560);
    runTicks(battle, 30);
    // W ticku 37 bohater ginie od drugiego ciosu, ale jego własny cios jest jednoczesny.
    expect(battle.state.hp[5]).toBe(500);
  });

  it('leczenie powyżej progu kończy szał', () => {
    const healer = still({ ...berserk, healAmount: 400, healInterval: 5 });
    const battle = close([healer], [dummy()]);
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(500);
    expect(damage(battle)).toEqual([40]);
  });

  it('pocisk niesie obrażenia z chwili wystrzału', () => {
    // Strzał wychodzi w ticku 10 (hitTick 9). Do tego czasu strzelec jest w szale.
    const archer = ranged({ moveStep: 0, ...berserk });
    const battle = createBattle(setupOf([archer], [dummy({ maxHp: 5000 })]));
    battle.state.hp[0] = 100;
    runTicks(battle, 10);
    expect(battle.state.projDamage[0]).toBe(45);
    // Uleczenie strzelca w locie pocisku nie zmienia już jego obrażeń.
    battle.state.hp[0] = 350;
    let hits: number[] = [];
    for (let i = 0; i < 40 && hits.length === 0; i++) {
      stepBattle(battle);
      hits = damage(battle);
    }
    expect(hits).toEqual([45]);
  });

  it('nie zmienia odrzutu', () => {
    const pusher = still({ knockback: u(10), ...berserk });
    const battle = close([pusher], [dummy()]);
    battle.state.hp[0] = 1;
    runTicks(battle, 7);
    expect(battle.state.x[5]).toBe(u(520) + u(10));
  });
});

describe('walidacja szału', () => {
  const problems = (overrides: Partial<UnitSpec>) =>
    validateSetup(setupOf([melee(overrides)], [melee()]));

  it('przyjmuje próg 1..99 z dodatnią premią', () => {
    expect(problems({ enrageHpPercent: 1, enrageAttackPercent: 1 })).toEqual([]);
    expect(problems({ enrageHpPercent: 99, enrageAttackPercent: 300 })).toEqual([]);
  });

  it('odrzuca próg 100 i więcej, wartości ujemne i ułamkowe', () => {
    expect(problems({ enrageHpPercent: 100, enrageAttackPercent: 50 })).not.toEqual([]);
    expect(problems({ enrageHpPercent: -1, enrageAttackPercent: 50 })).not.toEqual([]);
    expect(problems({ enrageHpPercent: 50, enrageAttackPercent: 12.5 })).not.toEqual([]);
  });

  it('wymaga obu pól naraz', () => {
    expect(problems({ enrageHpPercent: 50, enrageAttackPercent: 0 })).not.toEqual([]);
    expect(problems({ enrageHpPercent: 0, enrageAttackPercent: 50 })).not.toEqual([]);
  });
});
