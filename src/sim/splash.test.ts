import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { EVENT_ATTACK_HIT, EVENT_DAMAGED, EVENT_KNOCKED_BACK } from './events.ts';
import { lastEvents, melee, ranged, runTicks, setupOf, u } from './fixtures.ts';
import { STATUS_DEAD, type UnitSpec } from './types.ts';
import { validateSetup } from './validate-setup.ts';

const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) => still({ attack: 0, ...overrides });

// Bohater na 500, wrogowie na 520, 550, 580, 700, 760: cel to wróg ze slotu 0 (unitId 5),
// kolejni stoją 30, 60, 180 i 240 jednostek za nim. Pierwsze trafienie pada w ticku 7.
const LINE = {
  playerSlots: [500, 440, 380, 320, 260].map(u),
  enemySlots: [520, 550, 580, 700, 760].map(u),
};
const line = (player: (UnitSpec | null)[], enemy: (UnitSpec | null)[]) =>
  createBattle(setupOf(player, enemy, LINE));
const row = (count: number, overrides: Partial<UnitSpec> = {}) =>
  Array.from({ length: count }, () => dummy(overrides));

const events = (battle: Parameters<typeof lastEvents>[0], type: number) =>
  lastEvents(battle).filter((e) => e[0] === type);

describe('cios obszarowy', () => {
  it('rani celem i wszystkich wrogów w promieniu od celu, pełnymi obrażeniami', () => {
    const battle = line([still({ splashRadius: u(60) })], row(4));
    runTicks(battle, 7);
    expect([5, 6, 7, 8].map((id) => battle.state.hp[id])).toEqual([560, 560, 560, 600]);
    expect(battle.state.damageDealt[0]).toBe(120);
  });

  it('promień jest domknięty: wróg dokładnie na granicy obrywa, tuż za nią nie', () => {
    const inside = line([still({ splashRadius: u(30) })], row(3));
    runTicks(inside, 7);
    expect([5, 6, 7].map((id) => inside.state.hp[id])).toEqual([560, 560, 600]);

    const outside = line([still({ splashRadius: u(30) - 1 })], row(3));
    runTicks(outside, 7);
    expect([5, 6, 7].map((id) => outside.state.hp[id])).toEqual([560, 600, 600]);
  });

  it('bez cechy cios rani tylko cel', () => {
    const battle = line([still()], row(3));
    runTicks(battle, 7);
    expect([5, 6, 7].map((id) => battle.state.hp[id])).toEqual([560, 600, 600]);
  });

  it('zgłasza trafienie tylko dla celu, a obrażenia dla każdego rannego', () => {
    const battle = line([still({ splashRadius: u(60) })], row(3));
    runTicks(battle, 7);
    expect(events(battle, EVENT_ATTACK_HIT).filter((e) => e[1] === 0)).toEqual([
      [EVENT_ATTACK_HIT, 0, 5, 0],
    ]);
    expect(events(battle, EVENT_DAMAGED).filter((e) => e[3] === 0)).toEqual([
      [EVENT_DAMAGED, 5, 40, 0],
      [EVENT_DAMAGED, 6, 40, 0],
      [EVENT_DAMAGED, 7, 40, 0],
    ]);
  });

  it('odrzut dostaje tylko cel', () => {
    const battle = line([still({ splashRadius: u(60), knockback: u(10) })], row(3));
    runTicks(battle, 7);
    expect(events(battle, EVENT_KNOCKED_BACK)).toEqual([[EVENT_KNOCKED_BACK, 5, u(10), 0]]);
    expect([5, 6, 7].map((id) => battle.state.x[id])).toEqual([u(530), u(550), u(580)]);
  });

  it('nie rani sojuszników atakującego ani martwych wrogów', () => {
    const battle = line([still({ splashRadius: u(200) }), dummy()], row(3));
    battle.state.status[6] = STATUS_DEAD;
    battle.state.hp[6] = 0;
    runTicks(battle, 7);
    expect(battle.state.hp[1]).toBe(600);
    expect(battle.state.hp[6]).toBe(0);
    expect(battle.state.damageTaken[6]).toBe(0);
    expect([5, 7].map((id) => battle.state.hp[id])).toEqual([560, 560]);
  });

  it('gdy cel zginął w trakcie zamachu, cios chybia razem z obszarem', () => {
    const battle = line([still({ splashRadius: u(60) })], row(3));
    runTicks(battle, 3);
    battle.state.status[5] = STATUS_DEAD;
    battle.state.hp[5] = 0;
    runTicks(battle, 4);
    expect([6, 7].map((id) => battle.state.hp[id])).toEqual([600, 600]);
  });

  it('odległość liczy się od pozycji z początku ticka', () => {
    // Wróg ze slotu 0 (splash) bije bohatera 0; bohater 1 nadchodzi z tyłu, 2 jednostki na tick.
    // Na początku ticka trafienia stoi 48 jednostek za celem, po ruchu 46.
    const walker = dummy({ moveStep: u(2), range: u(30) });
    const setup = (radius: number) =>
      createBattle(
        setupOf([dummy(), walker], [still({ splashRadius: radius })], {
          playerSlots: [500, 440, 380, 320, 260].map(u),
          enemySlots: [520, 580, 640, 700, 760].map(u),
        }),
      );

    const narrow = setup(u(47));
    runTicks(narrow, 7);
    expect(narrow.state.prevX[1]).toBe(u(452));
    expect(narrow.state.x[1]).toBe(u(454));
    expect(narrow.state.hp[0]).toBe(560);
    expect(narrow.state.hp[1]).toBe(600);

    const wide = setup(u(48));
    runTicks(wide, 7);
    expect(wide.state.hp[1]).toBe(560);
  });

  it('łączy się z kradzieżą życia i szałem', () => {
    const spec = still({
      splashRadius: u(60),
      lifestealPercent: 25,
      enrageHpPercent: 50,
      enrageAttackPercent: 50,
    });
    const battle = line([spec], row(3));
    battle.state.hp[0] = 100;
    runTicks(battle, 7);
    // 60 obrażeń w szale dla trzech wrogów; 25% z 60 to 15 leczenia za każdego.
    expect([5, 6, 7].map((id) => battle.state.hp[id])).toEqual([540, 540, 540]);
    expect(battle.state.hp[0]).toBe(145);
  });

  it('może zabić kilku wrogów jednym ciosem', () => {
    const battle = line([still({ splashRadius: u(60) })], row(3, { maxHp: 40 }));
    runTicks(battle, 7);
    expect([5, 6, 7].map((id) => battle.state.status[id])).toEqual([
      STATUS_DEAD,
      STATUS_DEAD,
      STATUS_DEAD,
    ]);
    expect(battle.state.outcome).not.toBe(0);
  });
});

describe('walidacja ciosu obszarowego', () => {
  it('przyjmuje promień dla ataku wręcz', () => {
    expect(validateSetup(setupOf([melee({ splashRadius: u(40) })], [melee()]))).toEqual([]);
  });

  it('odrzuca cios obszarowy u strzelca oraz promień ujemny i ułamkowy', () => {
    expect(validateSetup(setupOf([ranged({ splashRadius: u(40) })], [melee()]))).not.toEqual([]);
    expect(validateSetup(setupOf([melee({ splashRadius: -1 })], [melee()]))).not.toEqual([]);
    expect(validateSetup(setupOf([melee({ splashRadius: 0.5 })], [melee()]))).not.toEqual([]);
  });
});
