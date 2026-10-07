import { describe, expect, it } from 'vitest';
import { type Battle, createBattle } from './battle.ts';
import { EVENT_DAMAGED } from './events.ts';
import { CLOSE_SLOTS, lastEvents, melee, ranged, runTicks, setupOf, u } from './fixtures.ts';
import { hashState } from './hash.ts';
import { stepBattle } from './step.ts';
import { SQUAD_UNITS, STATUS_DEAD, type UnitSpec } from './types.ts';

// Fixture `melee()`: 40 obrażeń, trafienie w ticku 6 zamachu, atak co 30 ticków.
const dummy = (overrides: Partial<UnitSpec> = {}) =>
  melee({ moveStep: 0, attack: 0, maxHp: 100_000, ...overrides });

/** Szarża ze szkicu Hornixa: pierwszy cios potrójny. */
const charger = (overrides: Partial<UnitSpec> = {}) => melee({ chargePercent: 200, ...overrides });

/** Obrażenia kolejnych trafień w `target` zadanych przez `source`. */
function damageBy(battle: Battle, ticks: number, source: number, target: number): number[] {
  const seen: number[] = [];
  for (let i = 0; i < ticks; i++) {
    stepBattle(battle);
    for (const event of lastEvents(battle)) {
      if (event[0] === EVENT_DAMAGED && event[1] === target && event[3] === source) {
        seen.push(event[2] ?? 0);
      }
    }
  }
  return seen;
}

describe('cecha charge: szarża', () => {
  it('pierwszy atak w walce jest mocniejszy o premię, kolejne zwykłe', () => {
    const triple = createBattle(setupOf([charger()], [dummy()], CLOSE_SLOTS));
    expect(damageBy(triple, 30 * 4, 0, 5)).toEqual([120, 40, 40, 40]);
    // Premia niepodzielna: zaokrąglenie w dół.
    const odd = createBattle(
      setupOf([charger({ attack: 7, chargePercent: 50 })], [dummy()], CLOSE_SLOTS),
    );
    expect(damageBy(odd, 30 * 2, 0, 5)).toEqual([10, 7]);
  });

  it('łączy się z szałem i z podwójnymi obrażeniami w rytmie', () => {
    const enraged = charger({ enrageHpPercent: 99, enrageAttackPercent: 50 });
    const first = createBattle(setupOf([enraged], [dummy()], CLOSE_SLOTS));
    first.state.hp[0] = 100;
    // Premia szału (40 → 60), potem szarża (× 3).
    expect(damageBy(first, 30 * 2, 0, 5)).toEqual([180, 60]);

    const doubled = createBattle(
      setupOf([charger({ doubleDamagePercent: 100 })], [dummy()], CLOSE_SLOTS),
    );
    expect(damageBy(doubled, 30 * 2, 0, 5)).toEqual([240, 80]);
  });

  it('pierwszy pocisk niesie premię szarży', () => {
    const archer = ranged({ chargePercent: 100 });
    const battle = createBattle(setupOf([archer], [dummy()], CLOSE_SLOTS));
    expect(damageBy(battle, 38 * 3, 0, 5)).toEqual([60, 30, 30]);
  });

  it('unik zużywa szarżę', () => {
    const battle = createBattle(setupOf([charger()], [dummy({ dodgePercent: 50 })], CLOSE_SLOTS));
    // Licznik rytmu ustawiony tak, żeby unik wypadł na pierwsze trafienie.
    battle.state.dodgeCharge[5] = 50;
    expect(damageBy(battle, 30 * 2, 0, 5)).toEqual([40]);
  });

  it('zamach, którego cel zginął, nie zużywa szarży', () => {
    // Sojusznik bije wcześniej (trafienie w ticku 2) i zabija pierwszego wroga, zanim dojdzie
    // do niego cios szarżującego (tick 6). Szarża zostaje na następny cel.
    const killer = melee({ attack: 1000, range: u(100), hitTick: 2, attackInterval: 100_000 });
    const battle = createBattle(
      setupOf([charger(), killer], [dummy({ maxHp: 100 }), dummy()], CLOSE_SLOTS),
    );
    runTicks(battle, 8);
    expect(battle.state.status[5]).toBe(STATUS_DEAD);
    expect(battle.state.chargeBonus[0]).toBe(200);
    expect(damageBy(battle, 120, 0, 6).slice(0, 2)).toEqual([120, 40]);
    expect(battle.state.chargeBonus[0]).toBe(0);
  });

  it('każdy przyzwany szarżuje osobno', () => {
    const summoner = dummy({
      range: u(1000),
      attackInterval: 15,
      summon: melee({ maxHp: 100, attack: 20, chargePercent: 100, moveStep: 512 }),
    });
    const battle = createBattle(setupOf([summoner], [dummy()], CLOSE_SLOTS));
    for (let place = SQUAD_UNITS; place < SQUAD_UNITS + 3; place++) {
      const copy = createBattle(setupOf([summoner], [dummy()], CLOSE_SLOTS));
      expect(damageBy(copy, 120, place, 5).slice(0, 2)).toEqual([40, 20]);
    }
    expect(battle.hasCharge).toBe(true);
  });

  it('walka bez szarżujących nie ma tablicy szarży, a hash stanu ją obejmuje', () => {
    const plain = createBattle(setupOf([melee()], [melee()]));
    expect(plain.hasCharge).toBe(false);
    expect(plain.state.chargeBonus.length).toBe(0);

    const battle = createBattle(setupOf([charger()], [dummy()], CLOSE_SLOTS));
    expect(battle.state.chargeBonus.length).toBe(SQUAD_UNITS);
    expect(battle.state.chargeBonus[0]).toBe(200);
    const before = hashState(battle.state);
    battle.state.chargeBonus[0] = 0;
    expect(hashState(battle.state)).not.toBe(before);
  });
});
