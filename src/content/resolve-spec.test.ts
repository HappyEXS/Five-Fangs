import { describe, expect, it } from 'vitest';
import { requireContent } from './load.ts';
import { levelSetup, levelVisuals, resolveUnitSpec } from './resolve-spec.ts';
import type { Rune } from './schema-progression.ts';

const content = requireContent();
const { progression } = content;

function hero(id: string) {
  const unit = content.heroes.get(id);
  if (unit === undefined) throw new Error(`no hero ${id}`);
  return unit;
}

function levelOf(id: string) {
  const level = content.levels.get(id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
}

const attackRune: Rune = { id: 'rune_attack_25', stat: 'attack', value: 25 };
const hpRune: Rune = { id: 'rune_hp_200', stat: 'maxHp', value: 200 };

describe('resolveUnitSpec', () => {
  const swordsman = hero('swordsman_a');

  it('bez ulepszeń i run zwraca statystyki bazowe', () => {
    expect(resolveUnitSpec(swordsman, 0, [], progression)).toEqual(swordsman.base);
  });

  it('każde ulepszenie dodaje 10% bazowego maxHp i attack', () => {
    const spec = resolveUnitSpec(swordsman, 3, [], progression);
    expect(spec.maxHp).toBe(780);
    expect(spec.attack).toBe(52);
  });

  it('zaokrągla w dół', () => {
    // Łucznik: 350 HP i 30 ataku; 350 × 1,1 = 385, 30 × 1,1 = 33; przy randze 7: 595 i 51.
    const archer = hero('archer_a');
    expect(resolveUnitSpec(archer, 1, [], progression)).toMatchObject({ maxHp: 385, attack: 33 });
    const brute = content.enemies.get('brute');
    if (brute === undefined) throw new Error('no brute');
    // Osiłek: 35 ataku × 1,3 = 45,5 → 45.
    expect(resolveUnitSpec(brute, 3, [], progression).attack).toBe(45);
  });

  it('runy dodają wartości płaskie po przeliczeniu ulepszeń', () => {
    const spec = resolveUnitSpec(swordsman, 4, [attackRune, hpRune], progression);
    expect(spec.maxHp).toBe(840 + 200);
    expect(spec.attack).toBe(56 + 25);
  });

  it('przyzywany rośnie z ulepszeniami przyzywacza, ale nie z jego run', () => {
    const tree = hero('mother_tree');
    expect(resolveUnitSpec(tree, 0, [], progression)).toEqual(tree.base);
    const spec = resolveUnitSpec(tree, 4, [attackRune, hpRune], progression);
    expect(spec.maxHp).toBe(14_000 + 200);
    expect(spec.attack).toBe(0 + 25);
    // Krzak: 100 życia i 20 ataku, po czterech ulepszeniach o 40% więcej.
    expect(spec.summon).toMatchObject({ maxHp: 140, attack: 28 });
    expect(spec.summon?.moveStep).toBe(tree.base.summon?.moveStep);
  });

  it('dwie takie same runy się sumują', () => {
    expect(resolveUnitSpec(swordsman, 0, [attackRune, attackRune], progression).attack).toBe(90);
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
    const setup = levelSetup(content, levelOf('w1_l4'), [
      { unit: hero('swordsman_a'), rank: 2, runes: [hpRune] },
      null,
      { unit: hero('archer_a'), rank: 0, runes: [] },
    ]);
    expect(setup.arena).toBe(content.arena);
    expect(setup.player).toHaveLength(5);
    expect(setup.player[0]?.maxHp).toBe(720 + 200);
    expect(setup.player[1]).toBeNull();
    expect(setup.player[2]?.maxHp).toBe(350);
    expect(setup.player[4]).toBeNull();

    // Poziom w1_l4: Tarczownik poziomu 0 w slocie 0 i Łucznicy poziomu 2 w slotach 2 i 3.
    expect(setup.enemy[0]?.maxHp).toBe(1300);
    expect(setup.enemy[1]).toBeNull();
    expect(setup.enemy[2]?.maxHp).toBe(420);
    expect(setup.enemy[3]?.attack).toBe(36);
  });
});

describe('levelVisuals', () => {
  it('podaje wygląd jednostek pod ich unitId: gracz 0..4, przeciwnik 5..9', () => {
    const squad = [
      { unit: hero('swordsman_a'), rank: 0, runes: [] },
      null,
      { unit: hero('archer_b'), rank: 0, runes: [] },
    ];
    const visuals = levelVisuals(content, levelOf('w1_l4'), squad);
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
    // Poziom w1_l4 ma Tarczownika w slocie 0 i Łuczników w slotach 2 i 3.
    expect(visuals[5]?.skin).toBe('guard_a');
    expect(visuals[6]).toBeNull();
    expect(visuals[7]?.skin).toBe('archer_a');
  });
});
