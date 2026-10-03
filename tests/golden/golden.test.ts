import { describe, expect, it } from 'vitest';
import { hashToHex } from '../../src/core/hash.ts';
import { melee, setupOf } from '../../src/sim/fixtures.ts';
import { type BattleResult, createBattle, runBattleToEnd } from '../../src/sim/index.ts';
import { GOLDEN_SETUPS } from './setups.ts';

/** Zapis wyniku w migawce: hashe szesnastkowo, żeby różnice były czytelne w przeglądzie. */
function summary(result: BattleResult) {
  return {
    outcome: result.outcome,
    reason: result.reason,
    ticks: result.ticks,
    finalHp: result.finalHp.join(' '),
    stateHash: hashToHex(result.stateHash),
    eventHash: hashToHex(result.eventHash),
  };
}

describe('walki golden', () => {
  for (const [name, setup] of Object.entries(GOLDEN_SETUPS)) {
    it(name, () => {
      const first = runBattleToEnd(createBattle(setup));
      const second = runBattleToEnd(createBattle(setup));
      expect(second).toEqual(first);
      expect(summary(first)).toMatchSnapshot();
    });
  }

  it('jest co najmniej sześć walk i żadne dwie nie mają tego samego przebiegu', () => {
    const hashes = Object.values(GOLDEN_SETUPS).map(
      (setup) => runBattleToEnd(createBattle(setup)).eventHash,
    );
    expect(hashes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('zmiana jednej statystyki zmienia hash', () => {
    const base = runBattleToEnd(createBattle(setupOf([melee()], [melee({ maxHp: 450 })])));
    const changed = runBattleToEnd(
      createBattle(setupOf([melee({ attack: 41 })], [melee({ maxHp: 450 })])),
    );
    expect(changed.stateHash).not.toBe(base.stateHash);
    expect(changed.eventHash).not.toBe(base.eventHash);
  });
});
