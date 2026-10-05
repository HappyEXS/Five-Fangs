import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import type { CompiledLevel } from '../content/load-progression.ts';
import { levelSetup, type SquadMember } from '../content/resolve-spec.ts';
import { CLOSE_SLOTS, melee, setupOf } from '../sim/fixtures.ts';
import { createBattle, OUTCOME_IN_PROGRESS, STATUS_DEAD, stepBattle } from '../sim/index.ts';
import { aliveMask, battleFaces, battleLineup } from './battle-faces.ts';

const content = requireContent();

function member(unitId: string): SquadMember {
  const unit = content.heroes.get(unitId);
  if (unit === undefined) throw new Error(`no hero ${unitId}`);
  return { unit, rank: 0, runes: [] };
}

const level: CompiledLevel = {
  id: 'test',
  world: 'w1',
  index: 0,
  enemies: [
    { slot: 0, unit: 'brute', level: 0 },
    { slot: 3, unit: 'archer_a', level: 2 },
  ],
  gold: 0,
  rune: null,
};
const squad = [member('guard_a'), null, member('archer_a'), null, null];

describe('battleLineup', () => {
  it('układa id jednostek pod indeksami symulacji, tak jak levelSetup', () => {
    const lineup = battleLineup(level, squad);
    expect(lineup).toEqual([
      'guard_a',
      null,
      'archer_a',
      null,
      null,
      'brute',
      null,
      null,
      'archer_a',
      null,
    ]);
    const setup = levelSetup(content, level, squad);
    const occupied = [...setup.player, ...setup.enemy].map((spec) => spec !== null);
    expect(lineup.map((id) => id !== null)).toEqual(occupied);
  });

  it('pomija wroga ze slotem spoza drużyny', () => {
    const broken = { ...level, enemies: [{ slot: 7, unit: 'brute', level: 0 }] };
    expect(battleLineup(broken, []).every((id) => id === null)).toBe(true);
  });
});

describe('battleFaces', () => {
  const lineup = battleLineup(level, squad);

  it('podaje postacie w kolejności ze sceny: tył gracza, front gracza, front wroga, tył wroga', () => {
    const faces = battleFaces(lineup, 0b1111111111);
    expect(faces.map((face) => `${face.side}:${face.unit}:${face.unitId}`)).toEqual([
      'player:2:archer_a',
      'player:0:guard_a',
      'enemy:5:brute',
      'enemy:8:archer_a',
    ]);
    expect(faces.every((face) => face.alive)).toBe(true);
  });

  it('oznacza poległych zamiast ich usuwać', () => {
    const faces = battleFaces(lineup, 0b0100000100);
    expect(faces.map((face) => face.alive)).toEqual([true, false, false, true]);
  });

  it('pusta lista dla pustego składu', () => {
    expect(battleFaces([], 0)).toEqual([]);
  });
});

describe('aliveMask', () => {
  it('ma bit każdej żywej jednostki i gasi go po jej śmierci', () => {
    const battle = createBattle(
      setupOf([melee()], [melee({ maxHp: 40, attack: 0, moveStep: 0 })], CLOSE_SLOTS),
    );
    expect(aliveMask(battle)).toBe(0b0000100001);
    while (battle.state.outcome === OUTCOME_IN_PROGRESS) stepBattle(battle);
    expect(battle.state.status[5]).toBe(STATUS_DEAD);
    expect(aliveMask(battle)).toBe(0b0000000001);
  });

  it('zgadza się z twarzami prawdziwego poziomu od pierwszego ticka', () => {
    const battle = createBattle(levelSetup(content, level, squad));
    const faces = battleFaces(battleLineup(level, squad), aliveMask(battle));
    expect(faces).toHaveLength(4);
    expect(faces.every((face) => face.alive)).toBe(true);
  });
});
