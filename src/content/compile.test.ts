import { describe, expect, it } from 'vitest';
import { compileArena, compileUnit, hitTickOf, swingTicksOf } from './compile.ts';
import type { RawAttackType, RawUnit } from './schema.ts';

const slash: RawAttackType = {
  id: 'slash',
  swingDuration: 0.4,
  hitFraction: 0.5,
  clip: 'slash',
  stance: 'sword',
};
const shoot: RawAttackType = {
  id: 'shoot',
  swingDuration: 0.6,
  hitFraction: 0.5,
  clip: 'shoot',
  stance: 'bow',
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
  traits: [],
  rig: 'humanoid',
  skin: 'swordsman_a',
  scale: 1,
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
        enrageHpPercent: 0,
        enrageAttackPercent: 0,
      },
      visual: {
        rig: 'humanoid',
        skin: 'swordsman_a',
        scale: 1,
        attackClip: 'slash',
        stance: 'sword',
        projectileSprite: null,
      },
    });
  });

  it('wygląd strzelca wskazuje klip, postawę i sprite pocisku z typu ataku', () => {
    const archer: RawUnit = {
      ...swordsman,
      kind: 'ranged',
      attackType: 'shoot',
      skin: 'archer_a',
      scale: 1.2,
    };
    expect(compileUnit(archer, shoot).visual).toEqual({
      rig: 'humanoid',
      skin: 'archer_a',
      scale: 1.2,
      attackClip: 'shoot',
      stance: 'bow',
      projectileSprite: 'arrow',
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

describe('cechy pasywne', () => {
  it('leczenie okresowe trafia do pól specyfikacji, z interwałem w tickach', () => {
    const healer: RawUnit = {
      ...swordsman,
      traits: [{ type: 'periodicHeal', target: 'team', amount: 20, interval: 2 }],
    };
    const { base } = compileUnit(healer, slash);
    expect(base.healAmount).toBe(20);
    expect(base.healInterval).toBe(60);
    expect(base.healTeam).toBe(true);
    expect(base.pierce).toBe(false);
  });

  it('leczenie siebie i bardzo krótki interwał', () => {
    const healer: RawUnit = {
      ...swordsman,
      traits: [{ type: 'periodicHeal', target: 'self', amount: 5, interval: 0.001 }],
    };
    const { base } = compileUnit(healer, slash);
    expect(base.healTeam).toBe(false);
    expect(base.healInterval).toBe(1);
  });

  it('szał zapisuje próg i premię w procentach', () => {
    const berserker: RawUnit = {
      ...swordsman,
      traits: [{ type: 'enrage', hpBelow: 40, attackBonus: 75 }],
    };
    const { base } = compileUnit(berserker, slash);
    expect([base.enrageHpPercent, base.enrageAttackPercent]).toEqual([40, 75]);
  });

  it('pierce ustawia flagę i łączy się z leczeniem', () => {
    const piercer: RawUnit = {
      ...swordsman,
      kind: 'ranged',
      attackType: 'shoot',
      traits: [
        { type: 'pierce' },
        { type: 'periodicHeal', target: 'self', amount: 3, interval: 1 },
      ],
    };
    const { base } = compileUnit(piercer, shoot);
    expect(base.pierce).toBe(true);
    expect(base.healAmount).toBe(3);
    expect(base.healInterval).toBe(30);
  });

  it('jednostka bez cech ma wyzerowane pola cech', () => {
    const { base } = compileUnit(swordsman, slash);
    expect([base.pierce, base.healAmount, base.healInterval, base.healTeam]).toEqual([
      false,
      0,
      0,
      false,
    ]);
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
