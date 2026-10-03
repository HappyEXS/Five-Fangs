import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { EVENT_KNOCKED_BACK, EVENT_PROJECTILE_EXPIRED, EVENT_PROJECTILE_HIT } from './events.ts';
import { lastEvents, melee, ranged, runTicks, setupOf, u } from './fixtures.ts';
import { stepBattle } from './step.ts';
import { STATUS_DEAD, type UnitSpec } from './types.ts';

// Strzelec na 400, wrogowie na 600, 660 i 720. Pocisk powstaje w ticku 10 i dolatuje
// do kolejnych wrogów w tickach 25, 29 i 34.
const piercer = (overrides: Partial<UnitSpec> = {}) =>
  ranged({ moveStep: 0, pierce: true, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) =>
  melee({ moveStep: 0, attack: 0, ...overrides });

const hitsOf = (battle: Parameters<typeof lastEvents>[0]) =>
  lastEvents(battle)
    .filter((e) => e[0] === EVENT_PROJECTILE_HIT)
    .map((e) => e[2]);

describe('pociski przebijające', () => {
  it('trafia każdego wroga na drodze i leci dalej', () => {
    const battle = createBattle(setupOf([piercer()], [dummy(), dummy(), dummy()]));
    const { state } = battle;

    runTicks(battle, 25);
    expect(hitsOf(battle)).toEqual([5]);
    expect(state.projCount).toBe(1);
    expect([state.hp[5], state.hp[6], state.hp[7]]).toEqual([570, 600, 600]);

    runTicks(battle, 4);
    expect(state.tick).toBe(29);
    expect(hitsOf(battle)).toEqual([6]);

    runTicks(battle, 5);
    expect(state.tick).toBe(34);
    expect(hitsOf(battle)).toEqual([7]);
    expect([state.hp[5], state.hp[6], state.hp[7]]).toEqual([570, 570, 570]);
    expect(state.projCount).toBe(1);
    expect(state.projHitMask[0]).toBe((1 << 5) | (1 << 6) | (1 << 7));
    expect(state.damageDealt[0]).toBe(90);
  });

  it('zwykły pocisk w tym samym ustawieniu trafia tylko pierwszego', () => {
    const battle = createBattle(setupOf([ranged({ moveStep: 0 })], [dummy(), dummy(), dummy()]));
    runTicks(battle, 40);
    expect([battle.state.hp[5], battle.state.hp[6], battle.state.hp[7]]).toEqual([570, 600, 600]);
  });

  it('wrogów stojących w tym samym miejscu trafia w jednym ticku, w kolejności unitId', () => {
    const battle = createBattle(
      setupOf([piercer()], [dummy(), dummy(), dummy()], {
        enemySlots: [600, 600, 600, 780, 840].map(u),
      }),
    );
    runTicks(battle, 25);
    expect(hitsOf(battle)).toEqual([5, 6, 7]);
    expect([battle.state.hp[5], battle.state.hp[6], battle.state.hp[7]]).toEqual([570, 570, 570]);
  });

  it('każdego wroga trafia najwyżej raz, także gdy odrzut znów stawia go przed pociskiem', () => {
    // Odrzut 30 przenosi trafionego daleko przed pocisk, który potem mija go ponownie.
    const battle = createBattle(setupOf([piercer({ knockback: u(30) })], [dummy()]));
    const { state } = battle;
    runTicks(battle, 25);
    expect(state.hp[5]).toBe(570);
    expect(state.x[5]).toBe(u(630));
    expect((state.x[5] ?? 0) > (state.projX[0] ?? 0)).toBe(true);

    // Do ticka 47 w locie jest tylko ten jeden pocisk (następny strzał pada w ticku 48).
    runTicks(battle, 22);
    expect((state.projX[0] ?? 0) > (state.x[5] ?? 0)).toBe(true);
    expect(state.hp[5]).toBe(570);
    expect(state.x[5]).toBe(u(630));
  });

  it('odrzuca każdego trafionego', () => {
    const battle = createBattle(
      setupOf([piercer({ knockback: u(10) })], [dummy(), dummy({ knockback: u(4) }), dummy()]),
    );
    const { state } = battle;
    const pushes: number[][] = [];
    for (let tick = 1; tick <= 36; tick++) {
      stepBattle(battle);
      for (const e of lastEvents(battle)) {
        if (e[0] === EVENT_KNOCKED_BACK) pushes.push([tick, e[1] ?? 0, e[2] ?? 0]);
      }
    }
    // Pierwszy wróg po odrzucie na 610 nie zasłania drugiego (660), bo pocisk go już minął.
    expect(pushes).toEqual([
      [25, 5, u(10)],
      [29, 6, u(6)],
      [34, 7, u(10)],
    ]);
    expect([state.x[5], state.x[6], state.x[7]]).toEqual([u(610), u(666), u(730)]);
  });

  it('pomija martwych i wygasa na krawędzi pola', () => {
    const battle = createBattle(setupOf([piercer()], [dummy(), dummy()]));
    const { state } = battle;
    runTicks(battle, 12);
    state.status[5] = STATUS_DEAD;

    let expiredAt = -1;
    for (let tick = 13; tick <= 47 && expiredAt === -1; tick++) {
      stepBattle(battle);
      if (lastEvents(battle).some((e) => e[0] === EVENT_PROJECTILE_EXPIRED)) expiredAt = tick;
    }
    expect(state.hp[5]).toBe(600);
    expect(state.hp[6]).toBe(570);
    // 600 jednostek do krawędzi to 46 kroków pocisku: ticki 10..55; tu sprawdzamy, że
    // do ticka 47 pocisk jeszcze leci, a wygaśnięcie następuje później.
    expect(expiredAt).toBe(-1);
    runTicks(battle, 8);
    expect(state.tick).toBe(55);
    expect(lastEvents(battle).some((e) => e[0] === EVENT_PROJECTILE_EXPIRED)).toBe(true);
  });

  it('kolejny pocisk ma własną listę trafionych', () => {
    const battle = createBattle(setupOf([piercer()], [dummy(), dummy()]));
    // Drugi strzał pada w ticku 48 i dolatuje do pierwszego wroga w ticku 63.
    runTicks(battle, 63);
    expect(battle.state.hp[5]).toBe(540);
    expect(battle.state.hp[6]).toBe(570);
  });

  it('przebijający pocisk przeciwnika działa w drugą stronę', () => {
    const battle = createBattle(setupOf([dummy(), dummy()], [piercer()]));
    runTicks(battle, 29);
    expect([battle.state.hp[0], battle.state.hp[1]]).toEqual([570, 570]);
  });
});
