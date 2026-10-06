import { describe, expect, it } from 'vitest';
import { type Battle, createBattle } from './battle.ts';
import { EVENT_DAMAGED, EVENT_DODGED, EVENT_KNOCKED_BACK, EVENT_PROJECTILE_HIT } from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, ranged, runTicks, setupOf, u } from './fixtures.ts';
import { hashState } from './hash.ts';
import { stepBattle } from './step.ts';
import { STATUS_DEAD, type UnitSpec } from './types.ts';
import { validateSetup } from './validate-setup.ts';

// Fixture `melee()`: 40 obrażeń, trafienie w 6. ticku zamachu, atak co 30 ticków.
// W CLOSE_SLOTS jednostki frontowe mają się w zasięgu od pierwszego ticka.
const dummy = (overrides: Partial<UnitSpec> = {}) =>
  melee({ moveStep: 0, attack: 0, maxHp: 100_000, ...overrides });

/** Wykonuje `ticks` ticków i zbiera zdarzenia danego typu jako krotki `[a, b, c]`. */
function collect(battle: Battle, ticks: number, type: number): number[][] {
  const seen: number[][] = [];
  for (let i = 0; i < ticks; i++) {
    stepBattle(battle);
    for (const event of lastEvents(battle)) if (event[0] === type) seen.push(event.slice(1));
  }
  return seen;
}

/** Obrażenia kolejnych trafień w jednostkę `target`. */
function damageTo(battle: Battle, ticks: number, target: number): number[] {
  return collect(battle, ticks, EVENT_DAMAGED)
    .filter((event) => event[0] === target)
    .map((event) => event[1] ?? 0);
}

describe('cecha doubleDamage: podwójne obrażenia w stałym rytmie', () => {
  const striker = (percent: number, overrides: Partial<UnitSpec> = {}) =>
    melee({ doubleDamagePercent: percent, ...overrides });

  it('50 to co drugi atak, zaczynając od drugiego', () => {
    const battle = createBattle(setupOf([striker(50)], [dummy()], CLOSE_SLOTS));
    expect(damageTo(battle, 30 * 6, 5)).toEqual([40, 80, 40, 80, 40, 80]);
  });

  it('20 to co piąty atak', () => {
    const battle = createBattle(setupOf([striker(20)], [dummy()], CLOSE_SLOTS));
    expect(damageTo(battle, 30 * 10, 5)).toEqual([40, 40, 40, 40, 80, 40, 40, 40, 40, 80]);
  });

  it('100 podwaja każdy atak, a procent niepodzielny rozkłada podwojenia równo', () => {
    const always = createBattle(setupOf([striker(100)], [dummy()], CLOSE_SLOTS));
    expect(damageTo(always, 30 * 3, 5)).toEqual([80, 80, 80]);
    // 30 na 100: licznik 30, 60, 90, 120 (podwójny), 50, 80, 110 (podwójny), 40, 70, 100 (podwójny).
    const uneven = createBattle(setupOf([striker(30)], [dummy()], CLOSE_SLOTS));
    expect(damageTo(uneven, 30 * 10, 5)).toEqual([40, 40, 40, 80, 40, 40, 80, 40, 40, 80]);
  });

  it('podwaja obrażenia z premią szału', () => {
    const enraged = striker(50, { enrageHpPercent: 99, enrageAttackPercent: 50 });
    const battle = createBattle(setupOf([enraged], [dummy()], CLOSE_SLOTS));
    battle.state.hp[0] = 100;
    expect(damageTo(battle, 30 * 2, 5)).toEqual([60, 120]);
  });

  it('cios, który chybił, bo cel zginął w trakcie zamachu, nie przesuwa rytmu', () => {
    const battle = createBattle(setupOf([striker(50)], [dummy(), dummy()], CLOSE_SLOTS));
    runTicks(battle, 3);
    battle.state.status[5] = STATUS_DEAD;
    // Pierwszy zamach chybia; kolejne ciosy idą w następnego wroga po dojściu na zasięg.
    const striker0 = battle.state;
    striker0.x[0] = u(550);
    expect(damageTo(battle, 30 * 3, 6)).toEqual([40, 80]);
    expect(battle.state.doubleCharge[0]).toBe(0);
  });

  it('pocisk niesie obrażenia z chwili wystrzału, a przebijający rani nimi każdego', () => {
    const archer = ranged({ moveStep: 0, pierce: true, doubleDamagePercent: 50 });
    const battle = createBattle(setupOf([archer], [dummy(), dummy()]));
    // Strzały w tickach 10 i 48; trzeci (tick 86) już poza oknem.
    const hits = collect(battle, 38 + 40, EVENT_DAMAGED).map((event) => [event[0], event[1]]);
    expect(hits).toEqual([
      [5, 30],
      [6, 30],
      [5, 60],
      [6, 60],
    ]);
  });

  it('cios obszarowy to jeden atak: wszyscy trafieni dostają te same obrażenia', () => {
    const cleaver = striker(50, { splashRadius: u(100) });
    const battle = createBattle(setupOf([cleaver], [dummy(), dummy()], CLOSE_SLOTS));
    // Manekiny też „biją” (za 0), więc liczymy tylko trafienia w przeciwnika.
    const hits = collect(battle, 30 * 2, EVENT_DAMAGED)
      .filter((event) => (event[0] ?? 0) >= 5)
      .map((event) => [event[0], event[1]]);
    expect(hits).toEqual([
      [5, 40],
      [6, 40],
      [5, 80],
      [6, 80],
    ]);
  });

  it('kradzież życia liczy się od podwojonych obrażeń', () => {
    const leech = striker(100, { lifestealPercent: 50 });
    const battle = createBattle(setupOf([leech], [dummy()], CLOSE_SLOTS));
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(140);
  });
});

describe('cecha dodge: unik w stałym rytmie', () => {
  it('70 to siedem uników na każde dziesięć trafień, zawsze tych samych', () => {
    const dodger = dummy({ dodgePercent: 70 });
    const battle = createBattle(setupOf([melee()], [dodger], CLOSE_SLOTS));
    const outcome: string[] = [];
    for (let i = 0; i < 30 * 20; i++) {
      stepBattle(battle);
      for (const event of lastEvents(battle)) {
        if (event[1] !== 5) continue;
        if (event[0] === EVENT_DAMAGED) outcome.push('hit');
        if (event[0] === EVENT_DODGED) outcome.push('dodge');
      }
    }
    // Licznik: 70, 140 (unik), 110 (unik), 80, 150 (unik), 120 (unik), 90, 160, 130, 100 (uniki).
    const cycle = [
      'hit',
      'dodge',
      'dodge',
      'hit',
      'dodge',
      'dodge',
      'hit',
      'dodge',
      'dodge',
      'dodge',
    ];
    expect(outcome).toEqual([...cycle, ...cycle]);
    expect(battle.state.damageTaken[5]).toBe(6 * 40);
    expect(battle.state.damageDealt[0]).toBe(6 * 40);
  });

  it('unik znosi obrażenia, odrzut i kradzież życia, a zdarzenie wskazuje źródło', () => {
    const dodger = dummy({ dodgePercent: 50 });
    const attacker = melee({ knockback: u(30), lifestealPercent: 100 });
    const battle = createBattle(setupOf([attacker], [dodger], CLOSE_SLOTS));
    battle.state.hp[0] = 100;

    // Pierwsze trafienie wchodzi: obrażenia, odrzut i leczenie.
    runTicks(battle, 7);
    expect(lastEvents(battle).map((event) => event[0])).toContain(EVENT_KNOCKED_BACK);
    expect(battle.state.hp[0]).toBe(140);
    const x = battle.state.x[5];

    // Drugie jest unikane: nic się nie zmienia poza licznikiem.
    battle.state.x[0] = (x ?? 0) - u(20);
    const dodged = collect(battle, 30, EVENT_DODGED);
    expect(dodged).toEqual([[5, 0, 0]]);
    expect(battle.state.x[5]).toBe(x);
    expect(battle.state.hp[0]).toBe(140);
    expect(battle.state.hp[5]).toBe(100_000 - 40);
    expect(battle.state.dodgeCharge[5]).toBe(0);
  });

  it('dwa trafienia w jednym ticku: rytm idzie w kolejności unitId atakujących', () => {
    const dodger = dummy({ dodgePercent: 50 });
    const battle = createBattle(
      setupOf([melee(), melee({ attack: 55 })], [dodger], {
        ...CLOSE_SLOTS,
        playerSlots: [500, 495, 380, 320, 260].map(u),
      }),
    );
    runTicks(battle, 7);
    const events = lastEvents(battle).filter(
      (event) => (event[0] === EVENT_DAMAGED || event[0] === EVENT_DODGED) && event[1] === 5,
    );
    // Jednostka 0 trafia (licznik 50), cios jednostki 1 wypada na unik (licznik 100).
    expect(events).toEqual([
      [EVENT_DAMAGED, 5, 40, 0],
      [EVENT_DODGED, 5, 1, 0],
    ]);
  });

  it('pocisk, którego cel uniknął, znika; przebijający leci dalej', () => {
    const dodger = dummy({ dodgePercent: 99 });
    // Licznik zaczyna od 1, więc pierwsze trafienie jest unikane.
    const plain = createBattle(setupOf([ranged({ moveStep: 0 })], [dodger, dummy()]));
    plain.state.dodgeCharge[5] = 1;
    const plainHits = collect(plain, 40, EVENT_PROJECTILE_HIT);
    expect(plainHits.map((event) => event[1])).toEqual([5]);
    expect(plain.state.projCount).toBe(0);
    expect(plain.state.damageTaken[5]).toBe(0);
    expect(plain.state.damageTaken[6]).toBe(0);

    const piercing = createBattle(
      setupOf([ranged({ moveStep: 0, pierce: true })], [dodger, dummy()]),
    );
    piercing.state.dodgeCharge[5] = 1;
    runTicks(piercing, 40);
    expect(piercing.state.damageTaken[5]).toBe(0);
    expect(piercing.state.damageTaken[6]).toBe(30);
  });

  it('każde trafienie ciosu obszarowego liczy się u unikającego osobno', () => {
    const cleaver = melee({ splashRadius: u(100) });
    const battle = createBattle(
      setupOf([cleaver], [dummy({ dodgePercent: 50 }), dummy({ dodgePercent: 50 })], CLOSE_SLOTS),
    );
    runTicks(battle, 7);
    expect([battle.state.dodgeCharge[5], battle.state.dodgeCharge[6]]).toEqual([50, 50]);
    runTicks(battle, 30);
    expect([battle.state.damageTaken[5], battle.state.damageTaken[6]]).toEqual([40, 40]);
  });
});

describe('cecha shield: mniejsze obrażenia', () => {
  it('zmniejsza każde trafienie o swój procent, z zaokrągleniem w dół', () => {
    const half = createBattle(setupOf([melee()], [dummy({ shieldPercent: 50 })], CLOSE_SLOTS));
    expect(damageTo(half, 30 * 2, 5)).toEqual([20, 20]);
    // 35 × 90 / 100 = 31,5 → 31.
    const tenth = createBattle(
      setupOf([melee({ attack: 35 })], [dummy({ shieldPercent: 10 })], CLOSE_SLOTS),
    );
    expect(damageTo(tenth, 30, 5)).toEqual([31]);
    expect(tenth.state.damageDealt[0]).toBe(31);
    runTicks(tenth, 1);
    expect(tenth.state.damageTaken[5]).toBe(31);
  });

  it('nie zmienia odrzutu, a kradzież życia liczy obrażenia po tarczy', () => {
    const attacker = melee({ knockback: u(30), lifestealPercent: 100 });
    const battle = createBattle(setupOf([attacker], [dummy({ shieldPercent: 50 })], CLOSE_SLOTS));
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    expect(battle.state.x[5]).toBe(u(520) + u(30));
    expect(battle.state.hp[0]).toBe(120);
  });

  it('działa także na pociski i na podwójne obrażenia', () => {
    const archer = ranged({ moveStep: 0, doubleDamagePercent: 100 });
    const battle = createBattle(setupOf([archer], [dummy({ shieldPercent: 50 })]));
    expect(damageTo(battle, 40, 5)).toEqual([30]);
  });

  it('łączy się z unikiem: trafienia, które weszły, są mniejsze', () => {
    const tank = dummy({ dodgePercent: 50, shieldPercent: 50 });
    const battle = createBattle(setupOf([melee()], [tank], CLOSE_SLOTS));
    expect(damageTo(battle, 30 * 4, 5)).toEqual([20, 20]);
  });
});

describe('liczniki rytmu i niezmienniki', () => {
  it('liczniki wchodzą do hasha stanu', () => {
    const battle = createBattle(setupOf([melee()], [dummy()], CLOSE_SLOTS));
    const before = hashState(battle.state);
    battle.state.doubleCharge[0] = 50;
    const withDouble = hashState(battle.state);
    expect(withDouble).not.toBe(before);
    battle.state.dodgeCharge[5] = 70;
    expect(hashState(battle.state)).not.toBe(withDouble);
  });

  it('walidacja pilnuje zakresów procentów', () => {
    const problems = (spec: UnitSpec) => validateSetup(setupOf([spec], [dummy()]));
    expect(
      problems(melee({ doubleDamagePercent: 100, dodgePercent: 99, shieldPercent: 99 })),
    ).toEqual([]);
    expect(problems(melee({ doubleDamagePercent: 101 }))).toEqual([
      'gracz, slot 0: doubleDamagePercent musi być w przedziale 0..100',
    ]);
    expect(problems(melee({ dodgePercent: 100 }))).toEqual([
      'gracz, slot 0: dodgePercent musi być w przedziale 0..99',
    ]);
    expect(problems(melee({ shieldPercent: 100 }))).toEqual([
      'gracz, slot 0: shieldPercent musi być w przedziale 0..99',
    ]);
    expect(problems(melee({ dodgePercent: -1 }))).toHaveLength(1);
  });
});
