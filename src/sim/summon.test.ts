import { describe, expect, it } from 'vitest';
import { type Battle, createBattle } from './battle.ts';
import { backUnit, frontUnit } from './decide.ts';
import {
  EVENT_ATTACK_STARTED,
  EVENT_DAMAGED,
  EVENT_DIED,
  EVENT_KNOCKED_BACK,
  EVENT_SUMMONED,
} from './events.ts';
import {
  CLOSE_SLOTS,
  lastEvents,
  melee,
  ranged,
  runTicks,
  runUntil,
  setupOf,
  u,
} from './fixtures.ts';
import { hashState } from './hash.ts';
import { battleResult } from './result.ts';
import { stepBattle } from './step.ts';
import {
  isPlayerUnit,
  MAX_UNITS,
  OUTCOME_IN_PROGRESS,
  OUTCOME_LOSS,
  OUTCOME_WIN,
  PROJECTILE_AIMED,
  SQUAD_UNITS,
  STATUS_DEAD,
  STATUS_EMPTY,
  STATUS_IDLE,
  STATUS_MOVING,
  TEAM_ENEMY,
  TEAM_PLAYER,
  TEAM_SIZE,
  teamOf,
  type UnitSpec,
} from './types.ts';
import { validateSetup } from './validate-setup.ts';

/** Przyzwany wojownik: 100 życia, 20 ataku, 30 jednostek na sekundę. */
const sprout = (overrides: Partial<UnitSpec> = {}): UnitSpec =>
  melee({ maxHp: 100, attack: 20, moveStep: 256, ...overrides });

/**
 * Przyzywacz: stoi w miejscu, sięga całego pola, nie zadaje obrażeń. Zamach 12 ticków,
 * przyzwanie w 6., co 15 ticków.
 */
const summoner = (overrides: Partial<UnitSpec> = {}): UnitSpec =>
  melee({
    maxHp: 10_000,
    attack: 0,
    moveStep: 0,
    range: u(1000),
    attackInterval: 15,
    summon: sprout(),
    ...overrides,
  });

/** Wróg, który nic nie robi i nie ginie. */
const dummy = (overrides: Partial<UnitSpec> = {}): UnitSpec =>
  melee({ moveStep: 0, attack: 0, maxHp: 100_000, ...overrides });

const FIRST = SQUAD_UNITS;
const ENEMY_FIRST = SQUAD_UNITS + TEAM_SIZE;

/** Wykonuje ticki i zbiera zdarzenia danego typu jako krotki `[tick, a, b, c]`. */
function collect(battle: Battle, ticks: number, type: number): number[][] {
  const seen: number[][] = [];
  for (let i = 0; i < ticks; i++) {
    stepBattle(battle);
    for (const event of lastEvents(battle)) {
      if (event[0] === type) seen.push([battle.state.tick, ...event.slice(1)]);
    }
  }
  return seen;
}

function alive(battle: Battle, from: number): number[] {
  const out: number[] = [];
  for (let i = from; i < from + TEAM_SIZE; i++) {
    const status = battle.state.status[i] ?? STATUS_EMPTY;
    if (status !== STATUS_EMPTY && status !== STATUS_DEAD) out.push(i);
  }
  return out;
}

describe('miejsca jednostek przyzwanych', () => {
  it('drużyny: skład 0..4 i 5..9, przyzwani 10..14 i 15..19', () => {
    expect(MAX_UNITS).toBe(20);
    const teams = Array.from({ length: MAX_UNITS }, (_, id) => teamOf(id));
    expect(teams).toEqual([
      ...new Array(5).fill(TEAM_PLAYER),
      ...new Array(5).fill(TEAM_ENEMY),
      ...new Array(5).fill(TEAM_PLAYER),
      ...new Array(5).fill(TEAM_ENEMY),
    ]);
    expect(isPlayerUnit(4)).toBe(true);
    expect(isPlayerUnit(5)).toBe(false);
    expect(isPlayerUnit(10)).toBe(true);
    expect(isPlayerUnit(15)).toBe(false);
  });

  it('walka bez przyzywaczy ma dziesięć jednostek, jak przed dodaniem przyzywania', () => {
    const battle = createBattle(setupOf([melee()], [melee()]));
    expect(battle.state.unitSpan).toBe(SQUAD_UNITS);
    expect(battle.state.status).toHaveLength(SQUAD_UNITS);
    expect(battle.hasSummons).toBe(false);
    runUntil(battle, () => false);
    expect(battleResult(battle).finalHp).toHaveLength(SQUAD_UNITS);
  });

  it('walka z przyzywaczem ma dwadzieścia miejsc, na początku pustych', () => {
    const battle = createBattle(setupOf([summoner()], [dummy()]));
    expect(battle.state.unitSpan).toBe(MAX_UNITS);
    expect(battle.hasSummons).toBe(true);
    expect(alive(battle, FIRST)).toEqual([]);
    expect(Array.from(battle.state.summonedBy)).toEqual(new Array(MAX_UNITS).fill(-1));
  });
});

describe('przyzywanie', () => {
  it('w ticku trafienia zamachu stawia jednostkę w miejscu przyzywacza', () => {
    const battle = createBattle(setupOf([summoner()], [dummy()]));
    const events = collect(battle, 7, EVENT_SUMMONED);
    // Zamach zaczyna się w pierwszym ticku, przyzwanie wypada w jego 6. ticku: siódmy krok.
    expect(events).toEqual([[7, FIRST, 0, u(400)]]);
    const { state, specs } = battle;
    expect(state.status[FIRST]).toBe(STATUS_IDLE);
    expect(state.x[FIRST]).toBe(u(400));
    expect(state.prevX[FIRST]).toBe(u(400));
    expect(state.hp[FIRST]).toBe(100);
    expect(state.summonedBy[FIRST]).toBe(0);
    expect(specs.maxHp[FIRST]).toBe(100);
    expect(specs.attack[FIRST]).toBe(20);
    // Przyzywacz nie zadaje obrażeń i nie wypuszcza pocisków.
    expect(state.projCount).toBe(0);
    expect(state.damageTaken[5]).toBe(0);
  });

  it('przyzwany nie działa w ticku, w którym się pojawił; rusza w następnym', () => {
    const battle = createBattle(setupOf([summoner()], [dummy()]));
    runTicks(battle, 7);
    expect(battle.state.x[FIRST]).toBe(u(400));
    expect(battle.state.target[FIRST]).toBe(-1);
    stepBattle(battle);
    expect(battle.state.status[FIRST]).toBe(STATUS_MOVING);
    expect(battle.state.target[FIRST]).toBe(5);
    expect(battle.state.x[FIRST]).toBe(u(400) + 256);
  });

  it('kolejni zajmują kolejne miejsca, najwyżej pięciu żywych naraz', () => {
    const battle = createBattle(setupOf([summoner()], [dummy()]));
    const events = collect(battle, 15 * 12, EVENT_SUMMONED);
    expect(events.map((event) => event[1])).toEqual([10, 11, 12, 13, 14]);
    // Co odstęp ataku: 15 ticków.
    expect(events.map((event) => event[0])).toEqual([7, 22, 37, 52, 67]);
    expect(alive(battle, FIRST)).toEqual([10, 11, 12, 13, 14]);
  });

  it('przy pełnych miejscach przyzywacz nie zaczyna zamachu i czeka na wolne', () => {
    const battle = createBattle(setupOf([summoner()], [dummy()]));
    runTicks(battle, 80);
    expect(alive(battle, FIRST)).toHaveLength(5);
    const starts = collect(battle, 60, EVENT_ATTACK_STARTED).filter((event) => event[1] === 0);
    expect(starts).toEqual([]);
    expect(battle.state.status[0]).toBe(STATUS_IDLE);

    // Jedno miejsce się zwalnia: przyzywacz zaczyna zamach od razu, bo odstęp dawno minął.
    battle.pending.damage[12] = 1000;
    stepBattle(battle);
    expect(battle.state.status[12]).toBe(STATUS_DEAD);
    const next = collect(battle, 8, EVENT_SUMMONED);
    expect(next).toEqual([[battle.state.tick - 1, 12, 0, u(400)]]);
    expect(battle.state.hp[12]).toBe(100);
  });

  it('wolne miejsca zajmuje po kolei, zaczynając za ostatnio zajętym', () => {
    const battle = createBattle(setupOf([summoner()], [dummy()]));
    runTicks(battle, 80);
    // Giną jednostki z miejsc 11 i 13; ostatnio zajęte było 14, więc kolej na 10 (zajęte), 11.
    battle.pending.damage[11] = 1000;
    battle.pending.damage[13] = 1000;
    const events = collect(battle, 40, EVENT_SUMMONED);
    expect(events.map((event) => event[1])).toEqual([11, 13]);
  });

  it('przyzwanie dochodzi do skutku, choć przyzywacz ginie w tym samym ticku', () => {
    const battle = createBattle(setupOf([summoner({ maxHp: 50 })], [dummy()]));
    runTicks(battle, 6);
    battle.pending.damage[0] = 50;
    stepBattle(battle);
    expect(battle.state.status[0]).toBe(STATUS_DEAD);
    expect(battle.state.status[FIRST]).toBe(STATUS_IDLE);
    // Drużyna ma żywą jednostkę, więc walka trwa.
    expect(battle.state.outcome).toBe(OUTCOME_IN_PROGRESS);
  });

  it('martwy przyzywacz już nie przyzywa, a jego jednostki walczą dalej', () => {
    const battle = createBattle(setupOf([summoner({ maxHp: 50 })], [dummy()]));
    runTicks(battle, 10);
    battle.pending.damage[0] = 50;
    const events = collect(battle, 120, EVENT_SUMMONED);
    expect(events).toEqual([]);
    expect(alive(battle, FIRST)).toEqual([10]);
    expect(battle.state.outcome).toBe(OUTCOME_IN_PROGRESS);
  });
});

describe('przyzwani w walce', () => {
  it('idą do wroga, biją go, a obrażenia liczą się przyzywaczowi', () => {
    const battle = createBattle(setupOf([summoner()], [dummy({ maxHp: 200 })], CLOSE_SLOTS));
    const result = (() => {
      runUntil(battle, () => false);
      return battleResult(battle);
    })();
    expect(result.outcome).toBe('win');
    // Kilku przyzwanych może trafić w tym samym ticku, więc suma bywa większa niż życie wroga.
    expect(result.damageDealt[0]).toBeGreaterThanOrEqual(200);
    expect(result.damageDealt[0]).toBe(result.damageTaken[5]);
    expect(result.damageDealt.slice(FIRST)).toEqual(new Array(10).fill(0));
    expect(result.finalHp).toHaveLength(MAX_UNITS);
  });

  it('wróg celuje w najbliższego, także przyzwanego, i może go zabić', () => {
    const battle = createBattle(setupOf([summoner()], [melee({ attack: 100, moveStep: 0 })]));
    const died = collect(battle, 300, EVENT_DIED);
    // Przyzwani dochodzą do wroga i stają przed przyzywaczem; każdy ginie od jednego ciosu.
    expect(died.length).toBeGreaterThan(0);
    for (const event of died) expect(event[1]).toBeGreaterThanOrEqual(FIRST);
  });

  it('pociski trafiają przyzwanych, a przebijający nie omija nikogo', () => {
    const shooter = ranged({ attack: 30, pierce: true, range: u(1000), moveStep: 0 });
    const battle = createBattle(
      setupOf([shooter], [summoner({ summon: sprout({ moveStep: 0 }) })]),
    );
    runTicks(battle, 80);
    expect(alive(battle, ENEMY_FIRST).length).toBeGreaterThan(1);
    const hits = collect(battle, 60, EVENT_DAMAGED).filter((event) => event[3] === 0);
    const targets = new Set(hits.map((event) => event[1]));
    expect(targets.has(5)).toBe(true);
    expect([...targets].some((target) => (target ?? 0) >= ENEMY_FIRST)).toBe(true);
  });

  it('cios obszarowy rani przyzwanych stojących przy celu', () => {
    const cleaver = melee({ attack: 30, splashRadius: u(40), moveStep: 0, range: u(1000) });
    const battle = createBattle(
      setupOf([cleaver], [summoner({ summon: sprout({ moveStep: 0 }) })], CLOSE_SLOTS),
    );
    runTicks(battle, 30);
    const hit = collect(battle, 40, EVENT_DAMAGED).map((event) => event[1]);
    expect(hit).toContain(5);
    expect(hit).toContain(ENEMY_FIRST);
  });

  it('leczenie drużynowe obejmuje przyzwanych', () => {
    const healer = melee({
      healAmount: 10,
      healInterval: 5,
      healTeam: true,
      moveStep: 0,
      attack: 0,
    });
    const battle = createBattle(
      setupOf([summoner({ summon: sprout({ moveStep: 0 }) }), healer], [dummy()]),
    );
    runTicks(battle, 10);
    battle.state.hp[FIRST] = 40;
    runTicks(battle, 5);
    expect(battle.state.hp[FIRST]).toBe(50);
  });

  it('przyzwany z leczeniem okresowym leczy siebie', () => {
    const mender = sprout({ moveStep: 0, healAmount: 7, healInterval: 4 });
    const battle = createBattle(setupOf([summoner({ summon: mender })], [dummy()]));
    runTicks(battle, 8);
    battle.state.hp[FIRST] = 10;
    runTicks(battle, 4);
    expect(battle.state.hp[FIRST]).toBe(17);
  });

  it('odrzut spycha przyzwanych w stronę własnej krawędzi', () => {
    const brute = melee({ attack: 1, knockback: u(50), moveStep: 0, range: u(1000) });
    const forPlayer = createBattle(
      setupOf([summoner({ summon: sprout({ moveStep: 0, maxHp: 1000 }) })], [brute], CLOSE_SLOTS),
    );
    runTicks(forPlayer, 8);
    forPlayer.state.x[FIRST] = u(510);
    const pushed = collect(forPlayer, 40, EVENT_KNOCKED_BACK).find((event) => event[1] === FIRST);
    expect(pushed).toBeDefined();
    expect(forPlayer.state.x[FIRST]).toBeLessThan(u(510));

    const forEnemy = createBattle(
      setupOf([brute], [summoner({ summon: sprout({ moveStep: 0, maxHp: 1000 }) })], CLOSE_SLOTS),
    );
    runTicks(forEnemy, 8);
    forEnemy.state.x[ENEMY_FIRST] = u(510);
    collect(forEnemy, 40, EVENT_KNOCKED_BACK);
    expect(forEnemy.state.x[ENEMY_FIRST]).toBeGreaterThan(u(510));
  });

  it('cechy przyzwanych działają: unik w stałym rytmie', () => {
    const dodger = sprout({ moveStep: 0, dodgePercent: 50, maxHp: 1000 });
    const battle = createBattle(
      setupOf(
        [melee({ moveStep: 0, range: u(1000) })],
        [summoner({ summon: dodger })],
        CLOSE_SLOTS,
      ),
    );
    expect(battle.hasGuards).toBe(true);
  });
});

describe('front i koniec szyku z przyzwanymi', () => {
  // Przyzwani stoją w miejscu, żeby pozycje ustawione w teście się nie zmieniały.
  const still = () => summoner({ summon: sprout({ moveStep: 0, maxHp: 1000 }) });

  it('front drużyny to najbardziej wysunięta jednostka, także przyzwana', () => {
    const battle = createBattle(setupOf([still()], [still()]));
    runTicks(battle, 25);
    const { state } = battle;
    expect(frontUnit(state, 0)).toBe(0);
    expect(frontUnit(state, TEAM_SIZE)).toBe(5);
    state.x[11] = u(450);
    state.x[16] = u(550);
    expect(frontUnit(state, 0)).toBe(11);
    expect(frontUnit(state, TEAM_SIZE)).toBe(16);
    // Remis pozycji wygrywa niższe unitId: przyzwany z niższego miejsca.
    state.x[10] = u(450);
    expect(frontUnit(state, 0)).toBe(10);
  });

  it('koniec szyku to jednostka najdalej od wroga, także przyzwana', () => {
    const battle = createBattle(setupOf([still()], [still()]));
    runTicks(battle, 25);
    const { state } = battle;
    expect(backUnit(state, 0)).toBe(0);
    expect(backUnit(state, TEAM_SIZE)).toBe(5);
    state.x[11] = u(300);
    state.x[16] = u(700);
    expect(backUnit(state, 0)).toBe(11);
    expect(backUnit(state, TEAM_SIZE)).toBe(16);
  });

  it('zwykły pocisk trafia pierwszego na drodze: przyzwanego stojącego przed składem', () => {
    const shooter = ranged({ attack: 30, range: u(1000), moveStep: 0 });
    const battle = createBattle(setupOf([shooter], [still()]));
    runTicks(battle, 8);
    battle.state.x[ENEMY_FIRST] = u(500);
    const hits = collect(battle, 60, EVENT_DAMAGED).filter((event) => event[3] === 0);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((event) => event[1] === ENEMY_FIRST)).toBe(true);
    expect(battle.state.damageTaken[5]).toBe(0);
  });

  it('pocisk wycelowany w koniec szyku trafia przyzwanego, gdy to on stoi ostatni', () => {
    const sniper = ranged({ attack: 30, range: u(1000), moveStep: 0, targetLast: true });
    const battle = createBattle(setupOf([sniper], [still()]));
    runTicks(battle, 8);
    battle.state.x[ENEMY_FIRST] = u(800);
    const hits = collect(battle, 80, EVENT_DAMAGED).filter((event) => event[3] === 0);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.at(-1)?.[1]).toBe(ENEMY_FIRST);
  });
});

describe('koniec walki z przyzwanymi', () => {
  it('strona żyje, dopóki żyje ktokolwiek z niej, także przyzwany', () => {
    const battle = createBattle(setupOf([summoner({ maxHp: 50 })], [dummy()]));
    runTicks(battle, 10);
    battle.pending.damage[0] = 50;
    stepBattle(battle);
    expect(battle.state.outcome).toBe(OUTCOME_IN_PROGRESS);
    battle.pending.damage[FIRST] = 100;
    stepBattle(battle);
    expect(battle.state.outcome).toBe(OUTCOME_LOSS);
  });

  it('gracz wygrywa dopiero, gdy zginą także przyzwani przeciwnika', () => {
    const battle = createBattle(setupOf([dummy()], [summoner({ maxHp: 50 })]));
    runTicks(battle, 10);
    battle.pending.damage[5] = 50;
    stepBattle(battle);
    expect(battle.state.outcome).toBe(OUTCOME_IN_PROGRESS);
    battle.pending.damage[ENEMY_FIRST] = 100;
    stepBattle(battle);
    expect(battle.state.outcome).toBe(OUTCOME_WIN);
  });
});

describe('ponowne użycie miejsca', () => {
  it('cios wymierzony w poprzednika nie trafia jednostki, która zajęła jego miejsce', () => {
    // Wróg bije raz na 30 ticków, cios dochodzi w 6. ticku zamachu.
    const striker = melee({ attack: 50, moveStep: 0, range: u(1000) });
    const battle = createBattle(setupOf([summoner()], [striker], CLOSE_SLOTS));
    runTicks(battle, 8);
    // Pierwszy przyzwany wysuwa się przed przyzywacza, więc to w niego wróg wymierzy następny cios.
    battle.state.x[FIRST] = u(505);
    // Wróg właśnie zaczyna zamach w przyzwanego; ten ginie, a jego miejsce jest wolne.
    const started = runUntil(battle, () =>
      lastEvents(battle).some((event) => event[0] === EVENT_ATTACK_STARTED && event[1] === 5),
    );
    expect(started).toBeGreaterThan(0);
    const victim = battle.state.target[5] ?? -1;
    expect(victim).toBeGreaterThanOrEqual(FIRST);
    // Zwalniamy wszystkie pozostałe miejsca, żeby następny przyzwany trafił dokładnie w to.
    for (let slot = FIRST; slot < FIRST + TEAM_SIZE; slot++) {
      if (battle.state.status[slot] !== STATUS_EMPTY) battle.pending.damage[slot] = 1000;
    }
    battle.state.summonCursor[0] = victim - FIRST;
    battle.pending.summon[0] = 1;
    stepBattle(battle);
    expect(battle.state.status[victim]).toBe(STATUS_IDLE);
    expect(battle.state.hp[victim]).toBe(100);
    // Zamach wroga dobiega końca: cios chybia, nowa jednostka jest cała.
    expect(battle.state.target[5]).toBe(-1);
    const damaged = collect(battle, 6, EVENT_DAMAGED).filter((event) => event[1] === victim);
    expect(damaged).toEqual([]);
  });

  it('pocisk przebijający może trafić nową jednostkę, a wycelowany w poprzednika już nie', () => {
    const battle = createBattle(
      setupOf([ranged({ pierce: true, moveStep: 0, range: u(1000) })], [summoner()]),
    );
    runTicks(battle, 8);
    const { state } = battle;
    // Pocisk w locie, który „już trafił” jednostkę z miejsca 15 i celuje w nią.
    state.projCount = 1;
    state.projHitMask[0] = 1 << ENEMY_FIRST;
    state.projMode[0] = PROJECTILE_AIMED;
    state.projTarget[0] = ENEMY_FIRST;
    state.projX[0] = u(10);
    state.projStep[0] = 1;
    battle.pending.damage[ENEMY_FIRST] = 1000;
    state.summonCursor[1] = 0;
    battle.pending.summon[5] = 1;
    stepBattle(battle);
    expect(state.status[ENEMY_FIRST]).toBe(STATUS_IDLE);
    expect(state.projHitMask[0]).toBe(0);
    expect(state.projTarget[0]).toBe(-1);
  });
});

describe('determinizm i walidacja', () => {
  const setup = () =>
    setupOf(
      [summoner(), melee(), ranged()],
      [summoner({ summon: sprout({ attack: 35 }) }), melee({ maxHp: 900 }), ranged()],
    );

  it('ta sama walka daje ten sam wynik i hash', () => {
    const run = () => {
      const battle = createBattle(setup());
      runUntil(battle, () => false);
      return battleResult(battle);
    };
    expect(run()).toEqual(run());
  });

  it('hash stanu obejmuje miejsca przyzwanych', () => {
    const a = createBattle(setup());
    const b = createBattle(setup());
    runTicks(a, 20);
    runTicks(b, 20);
    expect(hashState(a.state)).toBe(hashState(b.state));
    b.state.summonCursor[0] = 3;
    expect(hashState(a.state)).not.toBe(hashState(b.state));
    b.state.summonCursor[0] = a.state.summonCursor[0] ?? 0;
    b.state.hp[FIRST] = 1;
    expect(hashState(a.state)).not.toBe(hashState(b.state));
  });

  it('sprawdza specyfikację przyzwanej jednostki', () => {
    const bad = setupOf([summoner({ summon: sprout({ maxHp: 0 }) })], [dummy()]);
    expect(validateSetup(bad)).toEqual(['gracz, slot 0, przyzwany: maxHp musi być co najmniej 1']);
  });

  it('przyzwany nie może sam przyzywać, a przyzywacz strzelać', () => {
    const nested = setupOf([summoner({ summon: summoner() })], [dummy()]);
    expect(validateSetup(nested)).toEqual([
      'gracz, slot 0, przyzwany: przyzwana jednostka nie może przyzywać',
    ]);
    const shooting = setupOf([summoner({ projectileStep: 100 })], [dummy()]);
    expect(validateSetup(shooting)).toEqual([
      'gracz, slot 0: przyzywacz nie może mieć ataku z pociskiem',
    ]);
  });

  it('szybkość przyzwanych liczy się do reguły mijania', () => {
    const fast = setupOf([summoner({ summon: sprout({ moveStep: u(40) }) })], [dummy()]);
    expect(validateSetup(fast).join('\n')).toContain('jednostki mogłyby się minąć');
  });

  it('pociski pięciu przyzwanych strzelców liczą się do puli', () => {
    // Powolny pocisk i szybkie strzelanie: jeden strzelec trzyma w locie wiele pocisków.
    const spammer = ranged({ projectileStep: 64, attackInterval: 18, range: u(1000) });
    const crowded = setupOf([summoner({ summon: spammer })], [dummy()]);
    expect(validateSetup(crowded).join('\n')).toContain('przekracza pulę');
  });
});
