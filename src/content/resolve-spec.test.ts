import { describe, expect, it } from 'vitest';
import { requireContent } from './load.ts';
import type { CompiledLevel, Rune } from './load-progression.ts';
import { levelSetup, levelVisuals, resolveUnitSpec } from './resolve-spec.ts';

const content = requireContent();
const { progression } = content;

function hero(id: string) {
  const unit = content.heroes.get(id);
  if (unit === undefined) throw new Error(`no hero ${id}`);
  return unit;
}

/** Poziom testowy, niezależny od balansu gry: Tarczownik z przodu, dwóch Łuczników +2 z tyłu. */
const LEVEL: CompiledLevel = {
  id: 'test',
  world: 'world_1',
  index: 0,
  enemies: [
    { slot: 0, unit: 'guard_a', level: 0 },
    { slot: 2, unit: 'archer_a', level: 2 },
    { slot: 3, unit: 'archer_a', level: 2 },
  ],
  gold: 0,
  runeToken: false,
};

/** Runa testowa, niezależna od drzewka gry; `bonus` to premia w jednostkach symulacji. */
const rune = (stat: Rune['stat'], value: number, bonus = value): Rune => ({
  id: `${stat}_${value}`,
  branch: stat,
  depth: 0,
  stat,
  value,
  bonus,
});
const attackRune = rune('attack', 25);
const hpRune = rune('maxHp', 200);
// 20 jednostek świata odrzutu to 5120 podjednostek; 15 jednostek na sekundę to 128 na tick.
const pushRune = rune('knockback', 20, 5120);
const speedRune = rune('moveSpeed', 15, 128);

describe('resolveUnitSpec', () => {
  const swordsman = hero('swordsman_a');

  it('bez ulepszeń i run zwraca statystyki bazowe', () => {
    expect(resolveUnitSpec(swordsman, 0, [], progression)).toEqual(swordsman.base);
  });

  it('każde ulepszenie dodaje 10% bazowego maxHp i attack', () => {
    const spec = resolveUnitSpec(swordsman, 3, [], progression);
    // Miecznik: 160 życia i 20 ataku.
    expect(spec.maxHp).toBe(208);
    expect(spec.attack).toBe(26);
  });

  it('zaokrągla w dół', () => {
    // Łucznik: 120 życia i 14 ataku; 120 × 1,1 = 132, 14 × 1,1 = 15,4 → 15.
    const archer = hero('archer_a');
    expect(resolveUnitSpec(archer, 1, [], progression)).toMatchObject({ maxHp: 132, attack: 15 });
    const brute = content.enemies.get('brute');
    if (brute === undefined) throw new Error('no brute');
    // Osiłek: 35 ataku × 1,3 = 45,5 → 45.
    expect(resolveUnitSpec(brute, 3, [], progression).attack).toBe(45);
  });

  it('runy dodają wartości płaskie po przeliczeniu ulepszeń', () => {
    const spec = resolveUnitSpec(swordsman, 4, [attackRune, hpRune], progression);
    expect(spec.maxHp).toBe(224 + 200);
    expect(spec.attack).toBe(28 + 25);
  });

  it('runa odrzutu i runa szybkości dodają premie w jednostkach symulacji', () => {
    // Miecznik: szybkość 60 (512 podjednostek na tick) i odrzut 15 (3840 podjednostek).
    expect(swordsman.base).toMatchObject({ moveStep: 512, knockback: 3840 });
    const spec = resolveUnitSpec(swordsman, 4, [pushRune, speedRune], progression);
    expect(spec.knockback).toBe(3840 + 5120);
    expect(spec.moveStep).toBe(512 + 128);
    // Ulepszenia tych statystyk nie skalują, a życie i atak zostają bez premii.
    expect(spec).toMatchObject({ maxHp: 224, attack: 28 });
    expect(resolveUnitSpec(swordsman, 0, [speedRune, speedRune], progression).moveStep).toBe(768);
  });

  it('runa szybkości nie rusza jednostki, która stoi w miejscu', () => {
    const bush = hero('bush');
    expect(bush.base.moveStep).toBe(0);
    const spec = resolveUnitSpec(bush, 0, [speedRune, pushRune], progression);
    expect(spec.moveStep).toBe(0);
    // Pozostałe runy działają na nią jak na każdą inną.
    expect(spec.knockback).toBe(bush.base.knockback + 5120);
  });

  it('przyzywany rośnie z ulepszeniami przyzywacza, ale nie z jego run', () => {
    const tree = hero('mother_tree');
    expect(resolveUnitSpec(tree, 0, [], progression)).toEqual(tree.base);
    expect(resolveUnitSpec(tree, 0, [pushRune, speedRune], progression).summon).toEqual(
      tree.base.summon,
    );
    const spec = resolveUnitSpec(tree, 4, [attackRune, hpRune], progression);
    expect(spec.maxHp).toBe(14_000 + 200);
    expect(spec.attack).toBe(0 + 25);
    // Krzak: 100 życia i 20 ataku, po czterech ulepszeniach o 40% więcej.
    expect(spec.summon).toMatchObject({ maxHp: 140, attack: 28 });
    expect(spec.summon?.moveStep).toBe(tree.base.summon?.moveStep);
  });

  it('dwie runy tej samej statystyki się sumują', () => {
    expect(resolveUnitSpec(swordsman, 0, [attackRune, attackRune], progression).attack).toBe(70);
  });

  it('nie zmienia pozostałych statystyk ani cech', () => {
    const marksman = hero('archer_b');
    const spec = resolveUnitSpec(marksman, 4, [hpRune], progression);
    const { maxHp, attack, ...rest } = spec;
    const { maxHp: baseHp, attack: baseAttack, ...baseRest } = marksman.base;
    expect(rest).toEqual(baseRest);
    expect(rest.pierce).toBe(true);
    expect(maxHp).toBeGreaterThan(baseHp);
    expect(attack).toBeGreaterThan(baseAttack);
  });
});

describe('levelSetup', () => {
  it('stawia skład gracza na slotach i wrogów z poziomu z ich poziomem siły', () => {
    const setup = levelSetup(content, LEVEL, [
      { unit: hero('swordsman_a'), rank: 2, runes: [hpRune] },
      null,
      { unit: hero('archer_a'), rank: 0, runes: [] },
    ]);
    expect(setup.arena).toBe(content.arena);
    expect(setup.player).toHaveLength(5);
    expect(setup.player[0]?.maxHp).toBe(192 + 200);
    expect(setup.player[1]).toBeNull();
    expect(setup.player[2]?.maxHp).toBe(120);
    expect(setup.player[4]).toBeNull();

    // Tarczownik poziomu 0 w slocie 0 i Łucznicy poziomu 2 w slotach 2 i 3.
    expect(setup.enemy[0]?.maxHp).toBe(520);
    expect(setup.enemy[1]).toBeNull();
    expect(setup.enemy[2]?.maxHp).toBe(144);
    expect(setup.enemy[3]?.attack).toBe(16);
  });
});

describe('levelVisuals', () => {
  it('podaje wygląd jednostek pod ich unitId: gracz 0..4, przeciwnik 5..9', () => {
    const squad = [
      { unit: hero('swordsman_a'), rank: 0, runes: [] },
      null,
      { unit: hero('archer_b'), rank: 0, runes: [] },
    ];
    const visuals = levelVisuals(content, LEVEL, squad);
    expect(visuals).toHaveLength(10);
    expect(visuals[0]).toEqual({
      rig: 'humanoid',
      skin: 'swordsman_a',
      scale: 1,
      attackClip: 'slash',
      stance: 'sword',
      projectileSprite: null,
      projectileHeight: 0,
      portrait: null,
      summon: null,
    });
    expect(visuals[1]).toBeNull();
    expect(visuals[2]?.skin).toBe('archer_b');
    expect(visuals[2]?.projectileSprite).toBe('arrow');
    expect(visuals[3]).toBeNull();
    // Tarczownik w slocie 0 i Łucznicy w slotach 2 i 3.
    expect(visuals[5]?.skin).toBe('guard_a');
    expect(visuals[6]).toBeNull();
    expect(visuals[7]?.skin).toBe('archer_a');
  });
});
