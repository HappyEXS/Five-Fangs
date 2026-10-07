import { describe, expect, it } from 'vitest';
import { type Battle, createBattle, placeUnit } from './battle.ts';
import { EVENT_AFFLICTED, EVENT_DAMAGED, EVENT_DIED } from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, ranged, runTicks, setupOf, u } from './fixtures.ts';
import { hashState } from './hash.ts';
import { stepBattle } from './step.ts';
import {
  DOT_BLEED,
  DOT_KINDS,
  DOT_POISON,
  MAX_UNITS,
  OUTCOME_IN_PROGRESS,
  OUTCOME_WIN,
  SQUAD_UNITS,
  STATUS_DEAD,
  type UnitSpec,
} from './types.ts';
import { validateSetup } from './validate-setup.ts';

// Fixture `melee()`: 40 obrażeń, trafienie w ticku 6 zamachu, atak co 30 ticków.
// W CLOSE_SLOTS jednostki frontowe mają się w zasięgu od pierwszego ticka, więc pierwszy cios
// dochodzi celu w ticku 6.
const dummy = (overrides: Partial<UnitSpec> = {}) =>
  melee({ moveStep: 0, attack: 0, maxHp: 100_000, ...overrides });

/** Krwawienie ze szkicu autora: 30 życia co sekundę przez 10 sekund. */
const bleeder = (overrides: Partial<UnitSpec> = {}) =>
  melee({ dotDamage: 30, dotInterval: 30, dotTicks: 10, dotKind: DOT_BLEED, ...overrides });

/** Jeden cios na całą walkę: efekt widać wtedy bez kolejnych trafień. */
const ONCE = { attackInterval: 100_000 };

/** Indeks efektu rodzaju `kind` jednostki `unit` w walce bez przyzywaczy. */
const slot = (kind: number, unit: number) => kind * SQUAD_UNITS + unit;

/**
 * Wykonuje `ticks` ticków (albo mniej, gdy walka się skończy) i zbiera zdarzenia typu `type`
 * jako `[tick, a, b, c]`.
 */
function log(battle: Battle, ticks: number, type: number): number[][] {
  const seen: number[][] = [];
  for (let i = 0; i < ticks && battle.state.outcome === OUTCOME_IN_PROGRESS; i++) {
    const { tick } = battle.state;
    stepBattle(battle);
    for (const event of lastEvents(battle)) {
      if (event[0] === type) seen.push([tick, ...event.slice(1)]);
    }
  }
  return seen;
}

/** Obrażenia jednostki `target` jako `[tick, wartość, źródło]`. */
function damageTo(battle: Battle, ticks: number, target: number): number[][] {
  return log(battle, ticks, EVENT_DAMAGED)
    .filter((event) => event[1] === target)
    .map(([tick, , value, source]) => [tick ?? 0, value ?? 0, source ?? 0]);
}

/** Kolejne tyknięcia co 30 ticków, zaczynając od `first`. */
const ticksFrom = (first: number, count: number, value: number, source: number) =>
  Array.from({ length: count }, (_, n) => [first + 30 * n, value, source]);

describe('obrażenia w czasie: nałożenie i rytm', () => {
  it('trafienie nakłada efekt: pierwsze tyknięcie pełny odstęp później, potem co odstęp', () => {
    const battle = createBattle(setupOf([bleeder(ONCE)], [dummy()], CLOSE_SLOTS));
    expect(damageTo(battle, 400, 5)).toEqual([[6, 40, 0], ...ticksFrom(36, 10, 30, 0)]);
    expect(battle.state.hp[5]).toBe(100_000 - 40 - 300);
    expect(battle.state.dotLeft[slot(DOT_BLEED, 5)]).toBe(0);
    // Obrażenia efektu liczą się w wyniku walki temu, kto go nałożył.
    expect(battle.state.damageDealt[0]).toBe(340);
    expect(battle.state.damageTaken[5]).toBe(340);
  });

  it('zgłasza nowy efekt raz; odnowienie trwającego efektu nie jest nowym efektem', () => {
    const battle = createBattle(setupOf([bleeder()], [dummy()], CLOSE_SLOTS));
    // Ciosy w tickach 6, 36, 66, 96: każdy odnawia efekt nałożony pierwszym.
    expect(log(battle, 100, EVENT_AFFLICTED)).toEqual([[6, 5, DOT_BLEED, 0]]);
    expect(battle.state.dotLeft[slot(DOT_BLEED, 5)]).toBeGreaterThan(0);
  });

  it('częste trafienia odnawiają liczbę tyknięć, ale nie zmieniają ich rytmu', () => {
    // Cios co 25 ticków (słabszy niż tyknięcie, żeby dało się je rozróżnić): 6, 31, 56, 81, 106.
    const attacker = bleeder({ attack: 1, attackInterval: 25 });
    const battle = createBattle(setupOf([attacker, dummy()], [dummy()], CLOSE_SLOTS));
    const during = damageTo(battle, 110, 5);
    expect(during.filter((event) => event[1] === 1).map((event) => event[0])).toEqual([
      6, 31, 56, 81, 106,
    ]);
    // Efekt tyka co 30 ticków od pierwszego trafienia, niezależnie od kolejnych.
    expect(during.filter((event) => event[1] === 30)).toEqual(ticksFrom(36, 3, 30, 0));

    // Po ostatnim trafieniu (tick 106) efekt tyka jeszcze dziesięć razy, pierwszy raz w swoim
    // dotychczasowym rytmie, czyli wcześniej niż pełny odstęp po trafieniu.
    battle.state.status[0] = STATUS_DEAD;
    expect(damageTo(battle, 400, 5)).toEqual(ticksFrom(126, 10, 30, 0));
    expect(battle.state.dotLeft[slot(DOT_BLEED, 5)]).toBe(0);
  });

  it('tyknięcie w ticku trafienia zużywa jedno z odnowionych tyknięć', () => {
    // Ciosy co 30 ticków: 6, 36, 66. W ticku 66 cios odnawia efekt, a faza cech od razu tyka.
    const battle = createBattle(setupOf([bleeder({ attack: 1 }), dummy()], [dummy()], CLOSE_SLOTS));
    runTicks(battle, 67);
    expect(battle.state.dotLeft[slot(DOT_BLEED, 5)]).toBe(9);
    battle.state.status[0] = STATUS_DEAD;
    expect(damageTo(battle, 400, 5)).toEqual(ticksFrom(96, 9, 30, 0));
  });
});

describe('obrażenia w czasie: kilka źródeł', () => {
  // Drugi atakujący stoi 80 jednostek od celu; ma dłuższy zasięg, żeby bił od pierwszego ticka.
  const second = (overrides: Partial<UnitSpec>) =>
    bleeder({ range: u(100), ...ONCE, ...overrides });

  it('słabsze trafienie nie zmienia silniejszego efektu', () => {
    const battle = createBattle(
      setupOf([bleeder(ONCE), second({ dotDamage: 10 })], [dummy()], CLOSE_SLOTS),
    );
    const damage = damageTo(battle, 400, 5);
    expect(damage.slice(2)).toEqual(ticksFrom(36, 10, 30, 0));
    expect(battle.state.damageDealt[1]).toBe(40);
  });

  it('silniejsze trafienie przejmuje efekt bez zgłaszania nowego', () => {
    const battle = createBattle(
      setupOf(
        [bleeder({ ...ONCE, dotDamage: 10 }), second({ dotDamage: 30 })],
        [dummy()],
        CLOSE_SLOTS,
      ),
    );
    const afflicted: number[][] = [];
    const damage: number[][] = [];
    for (let i = 0; i < 400; i++) {
      const { tick } = battle.state;
      stepBattle(battle);
      for (const event of lastEvents(battle)) {
        if (event[0] === EVENT_AFFLICTED) afflicted.push([tick, ...event.slice(1)]);
        if (event[0] === EVENT_DAMAGED && event[1] === 5) {
          damage.push([tick, event[2] ?? 0, event[3] ?? 0]);
        }
      }
    }
    // Oba ciosy dochodzą w ticku 6, w kolejności `unitId`: efekt zakłada jednostka 0, a jednostka 1
    // go przejmuje.
    expect(afflicted).toEqual([[6, 5, DOT_BLEED, 0]]);
    expect(damage.slice(2)).toEqual(ticksFrom(36, 10, 30, 1));
    expect(battle.state.damageDealt[0]).toBe(40);
    expect(battle.state.damageDealt[1]).toBe(340);
  });

  it('przy równej sile efekt należy do ostatniego trafiającego', () => {
    const battle = createBattle(setupOf([bleeder(ONCE), second({})], [dummy()], CLOSE_SLOTS));
    expect(damageTo(battle, 400, 5).slice(2)).toEqual(ticksFrom(36, 10, 30, 1));
  });

  it('krwawienie i trucizna działają obok siebie, każde w swoim rytmie', () => {
    const poisoner = second({ dotDamage: 12, dotInterval: 15, dotTicks: 4, dotKind: DOT_POISON });
    const battle = createBattle(setupOf([bleeder(ONCE), poisoner], [dummy()], CLOSE_SLOTS));
    const damage = damageTo(battle, 100, 5).slice(2);
    expect(damage).toEqual([
      [21, 12, 1],
      // W jednym ticku najpierw krwawienie, potem trucizna: efekty idą po rodzaju.
      [36, 30, 0],
      [36, 12, 1],
      [51, 12, 1],
      [66, 30, 0],
      [66, 12, 1],
      [96, 30, 0],
    ]);
    expect(battle.state.dotLeft[slot(DOT_POISON, 5)]).toBe(0);
    expect(battle.state.dotLeft[slot(DOT_BLEED, 5)]).toBe(7);
  });
});

describe('obrażenia w czasie: cechy trafionego i śmierć', () => {
  it('tarcza trafionego zmniejsza obrażenia efektu tak jak obrażenia ciosu', () => {
    const battle = createBattle(
      setupOf([bleeder(ONCE)], [dummy({ shieldPercent: 50 })], CLOSE_SLOTS),
    );
    expect(damageTo(battle, 70, 5)).toEqual([
      [6, 20, 0],
      [36, 15, 0],
      [66, 15, 0],
    ]);
  });

  it('unik znosi efekt razem z trafieniem', () => {
    const battle = createBattle(setupOf([bleeder()], [dummy({ dodgePercent: 50 })], CLOSE_SLOTS));
    // Licznik rytmu ustawiony tak, żeby unik wypadł na pierwsze trafienie (tick 6).
    battle.state.dodgeCharge[5] = 50;
    expect(log(battle, 40, EVENT_AFFLICTED)).toEqual([[36, 5, DOT_BLEED, 0]]);
    expect(damageTo(battle, 30, 5)).toEqual([[66, 30, 0]]);
  });

  it('cios bez obrażeń też nakłada efekt', () => {
    const battle = createBattle(setupOf([bleeder({ ...ONCE, attack: 0 })], [dummy()], CLOSE_SLOTS));
    expect(damageTo(battle, 40, 5)).toEqual([
      [6, 0, 0],
      [36, 30, 0],
    ]);
  });

  it('tyknięcie zabija; obrażenia liczą się źródłu także po jego śmierci', () => {
    const victim = dummy({ maxHp: 70 });
    const battle = createBattle(
      setupOf([bleeder({ ...ONCE, attack: 10 }), dummy()], [victim], CLOSE_SLOTS),
    );
    runTicks(battle, 10);
    expect(battle.state.hp[5]).toBe(60);
    battle.state.status[0] = STATUS_DEAD;

    const died = log(battle, 100, EVENT_DIED);
    expect(died).toEqual([[66, 5, 0, 0]]);
    expect(battle.state.outcome).toBe(OUTCOME_WIN);
    expect(battle.state.damageDealt[0]).toBe(70);
    // Śmierć zdejmuje efekt, choć zostało mu osiem tyknięć.
    expect(battle.state.dotLeft[slot(DOT_BLEED, 5)]).toBe(0);
  });

  it('leczenie z tego samego ticka może uratować przed tyknięciem', () => {
    // Leczenie co 37 ticków wypada w ticku 36, razem z pierwszym tyknięciem.
    const victim = dummy({ maxHp: 100, healAmount: 15, healInterval: 37 });
    const battle = createBattle(setupOf([bleeder({ ...ONCE, attack: 0 })], [victim], CLOSE_SLOTS));
    battle.state.hp[5] = 20;
    runTicks(battle, 37);
    expect(battle.state.hp[5]).toBe(5);
    expect(battle.state.status[5]).not.toBe(STATUS_DEAD);
  });
});

describe('obrażenia w czasie: pociski, cios obszarowy, przyzwani', () => {
  it('pocisk nakłada efekt w chwili trafienia, a przebijający każdemu trafionemu', () => {
    const archer = ranged({
      ...ONCE,
      pierce: true,
      dotDamage: 12,
      dotInterval: 30,
      dotTicks: 3,
      dotKind: DOT_POISON,
    });
    const battle = createBattle(setupOf([archer], [dummy(), dummy()], CLOSE_SLOTS));
    const afflicted: number[][] = [];
    const damage: number[][] = [];
    for (let i = 0; i < 150; i++) {
      const { tick } = battle.state;
      stepBattle(battle);
      for (const event of lastEvents(battle)) {
        if (event[0] === EVENT_AFFLICTED) afflicted.push([tick, ...event.slice(1)]);
        if (event[0] === EVENT_DAMAGED && event[2] === 12) damage.push([tick, event[1] ?? 0]);
      }
    }
    expect(afflicted.map((event) => event.slice(1))).toEqual([
      [5, DOT_POISON, 0],
      [6, DOT_POISON, 0],
    ]);
    const [near, far] = afflicted.map((event) => event[0] ?? 0);
    // Wystrzał jest w ticku 9; dalszy cel pocisk mija później niż bliższy.
    expect(near).toBeGreaterThan(9);
    expect(far).toBeGreaterThan(near ?? 0);
    expect(damage.filter((event) => event[1] === 5).map((event) => event[0])).toEqual(
      [30, 60, 90].map((after) => (near ?? 0) + after),
    );
    expect(damage.filter((event) => event[1] === 6).map((event) => event[0])).toEqual(
      [30, 60, 90].map((after) => (far ?? 0) + after),
    );
  });

  it('cios obszarowy nakłada efekt każdemu, kogo rani', () => {
    const cleaver = bleeder({ ...ONCE, splashRadius: u(100) });
    const battle = createBattle(setupOf([cleaver], [dummy(), dummy()], CLOSE_SLOTS));
    expect(log(battle, 10, EVENT_AFFLICTED)).toEqual([
      [6, 5, DOT_BLEED, 0],
      [6, 6, DOT_BLEED, 0],
    ]);
  });

  it('efekt nałożony przez przyzwanego liczy się jego przyzywaczowi', () => {
    const summoner = dummy({
      range: u(1000),
      attackInterval: 15,
      summon: bleeder({ maxHp: 100, attack: 0, moveStep: 512 }),
    });
    const battle = createBattle(setupOf([summoner], [dummy()], CLOSE_SLOTS));
    expect(battle.state.dotLeft.length).toBe(MAX_UNITS * DOT_KINDS);
    const afflicted = log(battle, 200, EVENT_AFFLICTED);
    expect(afflicted.length).toBe(1);
    const source = afflicted[0]?.[3] ?? 0;
    expect(source).toBeGreaterThanOrEqual(SQUAD_UNITS);
    expect(battle.state.damageDealt[source]).toBe(0);
    expect(battle.state.damageDealt[0]).toBeGreaterThan(0);
    expect((battle.state.damageDealt[0] ?? 0) % 30).toBe(0);
  });

  it('nowa jednostka w miejscu nie dziedziczy efektów poprzednika', () => {
    const summoner = dummy({ range: u(1000), attackInterval: 15, summon: bleeder() });
    const battle = createBattle(setupOf([summoner], [dummy()], CLOSE_SLOTS));
    const place = SQUAD_UNITS;
    const k = DOT_POISON * MAX_UNITS + place;
    battle.state.dotLeft[k] = 4;
    placeUnit(battle, place, bleeder(), 0);
    expect(battle.state.dotLeft[k]).toBe(0);
    expect(battle.specs.dotDamage[place]).toBe(30);
  });
});

describe('obrażenia w czasie: stan walki i walidacja', () => {
  it('walka bez tej cechy nie ma jej tablic', () => {
    const plain = createBattle(setupOf([melee()], [melee()]));
    expect(plain.hasDot).toBe(false);
    expect(plain.state.dotLeft.length).toBe(0);
    expect(plain.specs.dotDamage.length).toBe(0);

    const afflicting = createBattle(setupOf([bleeder()], [melee()]));
    expect(afflicting.hasDot).toBe(true);
    expect(afflicting.state.dotLeft.length).toBe(SQUAD_UNITS * DOT_KINDS);
    // Cecha jednostki przyzywanej też się liczy: może pojawić się w walce.
    const viaSummon = createBattle(
      setupOf([dummy({ range: u(1000), summon: bleeder() })], [melee()]),
    );
    expect(viaSummon.hasDot).toBe(true);
  });

  it('hash stanu obejmuje efekty', () => {
    const battle = createBattle(setupOf([bleeder(ONCE)], [dummy()], CLOSE_SLOTS));
    runTicks(battle, 10);
    const before = hashState(battle.state);
    const k = slot(DOT_BLEED, 5);
    for (const field of ['dotLeft', 'dotNext', 'dotDamage', 'dotInterval', 'dotSource'] as const) {
      const array = battle.state[field];
      const value = array[k] ?? 0;
      array[k] = value + 1;
      expect(hashState(battle.state)).not.toBe(before);
      array[k] = value;
    }
    expect(hashState(battle.state)).toBe(before);
  });

  it('dwa przebiegi tej samej walki dają ten sam hash w każdym ticku', () => {
    const setup = setupOf(
      [bleeder(), ranged({ dotDamage: 8, dotInterval: 20, dotTicks: 5, dotKind: DOT_POISON })],
      [melee({ shieldPercent: 30 }), bleeder({ attackInterval: 20 }), ranged()],
    );
    const a = createBattle(setup);
    const b = createBattle(setup);
    for (let i = 0; i < 600; i++) {
      stepBattle(a);
      stepBattle(b);
      expect(hashState(a.state)).toBe(hashState(b.state));
    }
    expect(a.eventHash).toBe(b.eventHash);
  });

  it('odrzuca specyfikację bez odstępu, bez tyknięć albo z nieznanym rodzajem efektu', () => {
    const problems = (spec: UnitSpec) => validateSetup(setupOf([spec], [melee()]));
    expect(problems(bleeder())).toEqual([]);
    expect(problems(bleeder({ dotInterval: 0 }))).toEqual([
      'gracz, slot 0: dotInterval i dotTicks muszą być co najmniej 1, gdy dotDamage > 0',
    ]);
    expect(problems(bleeder({ dotTicks: 0 }))).toHaveLength(1);
    expect(problems(bleeder({ dotKind: DOT_KINDS }))).toEqual([
      `gracz, slot 0: dotKind musi być w przedziale 0..${DOT_KINDS - 1}`,
    ]);
    expect(problems(bleeder({ dotDamage: 1.5 }))).toHaveLength(1);
  });
});
