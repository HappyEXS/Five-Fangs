import { describe, expect, it } from 'vitest';
import { compileArena, compileUnit, hitTickOf, swingTicksOf } from './compile.ts';
import type { RawAttackType, RawUnit } from './schema.ts';

const slash: RawAttackType = { id: 'slash', swingDuration: 0.4, hitFraction: 0.5, clip: 'slash' };
const shoot: RawAttackType = {
  id: 'shoot',
  swingDuration: 0.6,
  hitFraction: 0.5,
  clip: 'shoot',
  projectile: { speed: 400, sprite: 'arrow' },
};

const swordsman: RawUnit = {
  id: 'swordsman',
  kind: 'melee',
  maxHp: 600,
  attack: 40,
  moveSpeed: 60,
  attackSpeed: 1,
  range: 30,
  knockback: 15,
  attackType: 'slash',
};

describe('compileArena', () => {
  it('przelicza jednostki świata na podjednostki i sekundy na ticki', () => {
    expect(
      compileArena({
        width: 1000,
        playerSlots: [400, 340, 280, 220, 160],
        enemySlots: [600, 660, 720, 780, 840],
        timeLimit: 90,
      }),
    ).toEqual({
      width: 256_000,
      playerSlots: [102_400, 87_040, 71_680, 56_320, 40_960],
      enemySlots: [153_600, 168_960, 184_320, 199_680, 215_040],
      timeLimitTicks: 2700,
    });
  });
});

describe('compileUnit', () => {
  it('kompiluje jednostkę walczącą wręcz', () => {
    expect(compileUnit(swordsman, slash)).toEqual({
      id: 'swordsman',
      kind: 'melee',
      attackType: 'slash',
      base: {
        maxHp: 600,
        attack: 40,
        moveStep: 512,
        range: 7680,
        knockback: 3840,
        attackInterval: 30,
        swingTicks: 12,
        hitTick: 6,
        projectileStep: 0,
        pierce: false,
        healAmount: 0,
        healInterval: 0,
        healTeam: false,
      },
    });
  });

  it('kompiluje strzelca z krokiem pocisku', () => {
    const archer: RawUnit = {
      ...swordsman,
      id: 'archer',
      kind: 'ranged',
      moveSpeed: 50,
      attackSpeed: 0.8,
      range: 220,
      knockback: 0,
      attackType: 'shoot',
    };
    const { base } = compileUnit(archer, shoot);
    expect(base.moveStep).toBe(427);
    expect(base.range).toBe(56_320);
    expect(base.attackInterval).toBe(38);
    expect(base.swingTicks).toBe(18);
    expect(base.hitTick).toBe(9);
    expect(base.projectileStep).toBe(3413);
    expect(base.knockback).toBe(0);
  });

  it('wszystkie pola specyfikacji są liczbami całkowitymi', () => {
    const odd: RawUnit = {
      ...swordsman,
      moveSpeed: 47.3,
      attackSpeed: 1.37,
      range: 31.7,
      knockback: 12.2,
    };
    for (const value of Object.values(compileUnit(odd, slash).base)) {
      if (typeof value === 'number') expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('swingTicksOf i hitTickOf', () => {
  it('zamach trwa co najmniej 2 ticki, a trafienie wypada przed jego końcem', () => {
    const quick: RawAttackType = { ...slash, swingDuration: 0.01, hitFraction: 0.99 };
    expect(swingTicksOf(quick)).toBe(2);
    expect(hitTickOf(quick)).toBe(1);
  });

  it('trafienie nie wypada w ticku zerowym ani w ostatnim', () => {
    expect(hitTickOf({ ...slash, hitFraction: 0.01 })).toBe(1);
    expect(hitTickOf({ ...slash, hitFraction: 0.99 })).toBe(11);
  });
});
