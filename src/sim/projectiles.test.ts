import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import {
  EVENT_DAMAGED,
  EVENT_PROJECTILE_EXPIRED,
  EVENT_PROJECTILE_HIT,
  EVENT_PROJECTILE_SPAWNED,
} from './events.ts';
import { lastEvents, melee, ranged, runTicks, runUntil, setupOf, u } from './fixtures.ts';
import { spawnProjectile } from './projectiles.ts';
import { stepBattle } from './step.ts';
import { MAX_PROJECTILES, STATUS_DEAD, type UnitSpec } from './types.ts';

// Fixture `ranged()`: wystrzał w 9. ticku zamachu, atak co 38 ticków, 30 obrażeń,
// krok pocisku 3413 podjednostek (ok. 13,3 jednostki) na tick.
const ARROW = ranged().projectileStep;
const archer = (overrides: Partial<UnitSpec> = {}) => ranged({ moveStep: 0, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) =>
  melee({ moveStep: 0, attack: 0, ...overrides });

describe('wystrzał', () => {
  it('pocisk powstaje w ticku 1 + hitTick i porusza się już w tym samym ticku', () => {
    const battle = createBattle(setupOf([archer()], [dummy()]));
    const { state } = battle;
    runTicks(battle, 9);
    expect(state.projCount).toBe(0);

    stepBattle(battle);
    expect(state.tick).toBe(10);
    expect(state.projCount).toBe(1);
    expect(state.projX[0]).toBe(u(400) + ARROW);
    expect(state.projStep[0]).toBe(ARROW);
    expect(state.projOwner[0]).toBe(0);
    expect(state.projDamage[0]).toBe(30);
    expect(lastEvents(battle)).toEqual([[EVENT_PROJECTILE_SPAWNED, 0, 0, u(400)]]);

    stepBattle(battle);
    expect(state.projPrevX[0]).toBe(u(400) + ARROW);
    expect(state.projX[0]).toBe(u(400) + 2 * ARROW);
  });

  it('pocisk przeciwnika leci w lewo', () => {
    const battle = createBattle(setupOf([dummy()], [archer()]));
    runTicks(battle, 10);
    expect(battle.state.projStep[0]).toBe(-ARROW);
    expect(battle.state.projX[0]).toBe(u(600) - ARROW);
  });

  it('strzelec wypuszcza pocisk także wtedy, gdy cel zginął w trakcie zamachu', () => {
    const battle = createBattle(setupOf([archer()], [dummy(), dummy()]));
    runTicks(battle, 5);
    battle.state.status[5] = STATUS_DEAD;
    runTicks(battle, 5);
    expect(battle.state.projCount).toBe(1);
  });

  it('przepełnienie puli jest błędem, a nie cichym pominięciem strzału', () => {
    const battle = createBattle(setupOf([archer()], [dummy()]));
    battle.state.projCount = MAX_PROJECTILES;
    expect(() => spawnProjectile(battle, 0)).toThrow(/overflow/);
  });
});

describe('trafienie', () => {
  it('trafia pierwszego wroga na drodze i znika', () => {
    const battle = createBattle(setupOf([archer()], [dummy()]));
    const { state } = battle;
    // 200 jednostek to 51200 podjednostek, czyli 16 kroków pocisku: ticki 10..25.
    runTicks(battle, 24);
    expect(state.projCount).toBe(1);
    expect(state.hp[5]).toBe(600);

    stepBattle(battle);
    expect(state.tick).toBe(25);
    expect(state.projCount).toBe(0);
    expect(state.hp[5]).toBe(570);
    expect(state.damageDealt[0]).toBe(30);
    expect(lastEvents(battle)).toEqual([
      [EVENT_PROJECTILE_HIT, 0, 5, u(600)],
      [EVENT_DAMAGED, 5, 30, 0],
    ]);
  });

  it('wróg stojący tuż obok zostaje trafiony w ticku wystrzału', () => {
    const battle = createBattle(
      setupOf([archer()], [dummy()], { enemySlots: [410, 660, 720, 780, 840].map(u) }),
    );
    runTicks(battle, 10);
    expect(battle.state.hp[5]).toBe(570);
    expect(battle.state.projCount).toBe(0);
  });

  it('gdy cel zginie w locie, pocisk leci dalej i trafia następnego wroga', () => {
    const battle = createBattle(setupOf([archer()], [dummy(), dummy()]));
    const { state } = battle;
    runTicks(battle, 12);
    state.status[5] = STATUS_DEAD;
    runUntil(battle, () => state.projCount === 0, 60);
    expect(state.hp[5]).toBe(600);
    expect(state.hp[6]).toBe(570);
  });

  it('przy tej samej pozycji trafia wroga o niższym unitId', () => {
    const battle = createBattle(
      setupOf([archer()], [dummy(), dummy()], {
        enemySlots: [600, 600, 720, 780, 840].map(u),
      }),
    );
    runTicks(battle, 25);
    expect(battle.state.hp[5]).toBe(570);
    expect(battle.state.hp[6]).toBe(600);
  });

  it('wróg idący naprzeciw nie przeskakuje pocisku', () => {
    // Wróg biegnie 30 jednostek na tick, pocisk leci ok. 13: w jednym ticku mijają się o ponad 40.
    const runner = melee({ moveStep: u(30), attack: 0 });
    const battle = createBattle(setupOf([archer()], [runner]));
    const { state } = battle;
    let hitTick = -1;
    for (let tick = 1; tick <= 40 && hitTick === -1; tick++) {
      stepBattle(battle);
      if ((state.hp[5] ?? 0) < 600) hitTick = tick;
      // Dopóki pocisk leci, wróg nie może być za nim.
      if (state.projCount > 0) expect(state.x[5]).toBeGreaterThan(state.projX[0] ?? 0);
    }
    expect(hitTick).toBeGreaterThan(0);
    expect(state.hp[5]).toBe(570);
    expect(state.projCount).toBe(0);
  });

  it('pocisk żyje po śmierci strzelca i zalicza mu obrażenia', () => {
    const battle = createBattle(setupOf([archer(), dummy()], [dummy()]));
    const { state } = battle;
    runTicks(battle, 12);
    state.status[0] = STATUS_DEAD;
    runUntil(battle, () => state.projCount === 0, 60);
    expect(state.hp[5]).toBe(570);
    expect(state.damageDealt[0]).toBe(30);
  });

  it('obrażenia pocisku i ciosu wręcz z jednego ticka sumują się', () => {
    // Strzelec ze slotu 1 stoi 260 jednostek od celu: pocisk leci 20 ticków (10..29).
    // Ciosy wręcz padają w tickach 5 i 29 (zamach od ticka 25, trafienie w 4. ticku zamachu).
    const reach = melee({ moveStep: 0, range: u(250), hitTick: 4, attackInterval: 24 });
    const battle = createBattle(setupOf([reach, archer({ range: u(300) })], [dummy()]));
    const { state } = battle;
    runTicks(battle, 28);
    expect(state.hp[5]).toBe(600 - 40);
    stepBattle(battle);
    expect(state.tick).toBe(29);
    expect(state.hp[5]).toBe(600 - 40 - 40 - 30);
    expect(state.damageTaken[5]).toBe(110);
  });
});

describe('wygaśnięcie i kolejność', () => {
  it('pocisk bez wroga na drodze leci do krawędzi pola i wygasa', () => {
    const battle = createBattle(setupOf([archer()], [dummy(), dummy()]));
    const { state } = battle;
    runTicks(battle, 12);
    // Zostaje tylko wróg ustawiony za pociskiem, czyli już przez niego miniony.
    state.status[5] = STATUS_DEAD;
    state.x[6] = u(380);
    state.prevX[6] = u(380);

    // Strzelec dalej strzela do wroga za plecami, więc szukamy wygaśnięcia pocisku o id 0.
    let expired: number[] | undefined;
    for (let tick = 0; tick < 80 && expired === undefined; tick++) {
      stepBattle(battle);
      expired = lastEvents(battle).find((e) => e[0] === EVENT_PROJECTILE_EXPIRED && e[1] === 0);
    }
    expect(expired?.[3]).toBeGreaterThan(u(1000));
    expect(state.hp[6]).toBe(600);
    expect(Array.from(state.projId.subarray(0, state.projCount))).not.toContain(0);
  });

  it('po zniknięciu pocisku pozostałe zachowują kolejność i dane', () => {
    // Drugi strzelec stoi 60 jednostek dalej, więc jego pocisk dolatuje później.
    const far = archer({ attack: 7, range: u(300) });
    const battle = createBattle(setupOf([archer(), far], [dummy()]));
    const { state } = battle;
    runTicks(battle, 10);
    expect(state.projCount).toBe(2);
    expect(Array.from(state.projId.subarray(0, 2))).toEqual([0, 1]);

    runTicks(battle, 15);
    expect(state.tick).toBe(25);
    expect(state.projCount).toBe(1);
    expect(state.projId[0]).toBe(1);
    expect(state.projOwner[0]).toBe(1);
    expect(state.projDamage[0]).toBe(7);
    expect(state.projX[0]).toBe(u(340) + 16 * ARROW);

    runUntil(battle, () => state.projCount === 0, 20);
    expect(state.hp[5]).toBe(600 - 30 - 7);
  });

  it('kolejne pociski dostają rosnące id', () => {
    // Cel 260 jednostek dalej: pierwszy pocisk leci w tickach 10..29, drugi powstaje w ticku 28.
    const battle = createBattle(
      setupOf([archer({ attackInterval: 18, range: u(300) })], [dummy()], {
        enemySlots: [660, 720, 780, 840, 900].map(u),
      }),
    );
    runTicks(battle, 28);
    expect(battle.state.nextProjId).toBe(2);
    expect(Array.from(battle.state.projId.subarray(0, battle.state.projCount))).toEqual([0, 1]);
  });
});
