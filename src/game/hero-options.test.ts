import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { applyEvolve, previewEvolve } from './evolution.ts';
import { nextPurchase, runeStock } from './hero-options.ts';
import { applyUpgrade, equipRune, newSave, previewUpgrade } from './progress.ts';
import type { Save } from './save-schema.ts';

const content = requireContent();
// W nowej grze miecznik ma id 1.
const SWORD = 1;

function rich(runes: string[] = []): Save {
  return { ...newSave(content, '0.0.0', 'pl'), gold: 100_000, runes };
}

/** Kupuje następny zakup bohatera tyle razy, ile podano. */
function buy(save: Save, times: number): Save {
  let next = save;
  for (let i = 0; i < times; i++) {
    // Na rozwidleniu idzie pierwszą drogą z treści.
    const purchase = nextPurchase(content, next, SWORD);
    const bought =
      purchase?.kind === 'evolve'
        ? applyEvolve(content, next, SWORD, purchase.options[0].unitId)
        : applyUpgrade(content, next, SWORD);
    if (bought === null) throw new Error('purchase refused');
    next = bought;
  }
  return next;
}

describe('nextPurchase', () => {
  it('najpierw proponuje ulepszenia formy bazowej z ich kosztem i statystykami po zakupie', () => {
    const save = rich();
    expect(nextPurchase(content, save, SWORD)).toEqual({
      kind: 'upgrade',
      options: [{ cost: 50, spec: previewUpgrade(content, save, SWORD), unitId: 'swordsman_a' }],
    });
    expect(nextPurchase(content, buy(save, 3), SWORD)).toMatchObject({
      kind: 'upgrade',
      // Czwarte ulepszenie kosztuje tyle samo co pierwsze (ADR 0023).
      options: [{ cost: 50 }],
    });
  });

  it('po komplecie ulepszeń proponuje ewolucję w każdą z dróg, ze statystykami po zakupie', () => {
    const save = buy(rich(), 4);
    expect(nextPurchase(content, save, SWORD)).toEqual({
      kind: 'evolve',
      options: [
        {
          cost: 400,
          unitId: 'swordsman_b',
          spec: previewEvolve(content, save, SWORD, 'swordsman_b'),
        },
        {
          cost: 400,
          unitId: 'guard_a',
          spec: previewEvolve(content, save, SWORD, 'guard_a'),
        },
      ],
    });
  });

  it('po ewolucji: ulepszenia nowej formy, potem dwie formy końcowe tej drogi, a na końcu nic', () => {
    const evolved = buy(rich(), 5);
    expect(nextPurchase(content, evolved, SWORD)).toMatchObject({
      kind: 'upgrade',
      options: [{ cost: 200, unitId: 'swordsman_b' }],
    });
    expect(nextPurchase(content, buy(evolved, 4), SWORD)).toMatchObject({
      kind: 'evolve',
      options: [
        { cost: 1600, unitId: 'swordsman_b2' },
        { cost: 1600, unitId: 'berserker' },
      ],
    });
    expect(nextPurchase(content, buy(evolved, 9), SWORD)).toBeNull();
  });

  it('nie zależy od złota i zwraca null dla nieznanego bohatera', () => {
    const broke = { ...rich(), gold: 0 };
    expect(nextPurchase(content, broke, SWORD)).toMatchObject({
      kind: 'upgrade',
      options: [{ cost: 50 }],
    });
    expect(nextPurchase(content, broke, 99)).toBeNull();
  });
});

describe('runeStock', () => {
  it('podaje wolne runy w kolejności drzewka: kierunek po kierunku, od najsłabszej', () => {
    const save = rich(['speed_1', 'attack_2', 'hp_2', 'attack_1', 'knockback_1', 'hp_1']);
    expect(runeStock(content, save).map((rune) => rune.id)).toEqual([
      'hp_1',
      'hp_2',
      'attack_1',
      'attack_2',
      'knockback_1',
      'speed_1',
    ]);
  });

  it('pomija runy włożone bohaterom i nieznane treści gry', () => {
    const save = equipRune(content, rich(['hp_1', 'hp_2', 'gone']), SWORD, 0, 'hp_1');
    if (save === null) throw new Error('equip refused');
    expect(runeStock(content, save).map((rune) => rune.id)).toEqual(['hp_2']);
  });

  it('bez wolnych run daje pustą listę', () => {
    expect(runeStock(content, rich())).toEqual([]);
  });
});
