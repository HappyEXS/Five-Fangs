import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { nextPurchase, runeStock } from './hero-options.ts';
import { applyEvolve, applyUpgrade, equipRune, newSave, previewUpgrade } from './progress.ts';
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
    const purchase = nextPurchase(content, next, SWORD);
    const bought =
      purchase?.kind === 'evolve'
        ? applyEvolve(content, next, SWORD)
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
      cost: 50,
      spec: previewUpgrade(content, save, SWORD),
      unitId: 'swordsman_a',
    });
    expect(nextPurchase(content, buy(save, 3), SWORD)).toMatchObject({
      kind: 'upgrade',
      cost: 180,
    });
  });

  it('po komplecie ulepszeń proponuje ewolucję w formę drugą', () => {
    const purchase = nextPurchase(content, buy(rich(), 4), SWORD);
    expect(purchase).toMatchObject({ kind: 'evolve', cost: 250, unitId: 'swordsman_b' });
  });

  it('po ewolucji proponuje ulepszenia formy drugiej, a po ich komplecie nic', () => {
    const evolved = buy(rich(), 5);
    expect(nextPurchase(content, evolved, SWORD)).toMatchObject({
      kind: 'upgrade',
      cost: 300,
      unitId: 'swordsman_b',
    });
    expect(nextPurchase(content, buy(evolved, 4), SWORD)).toBeNull();
  });

  it('nie zależy od złota i zwraca null dla nieznanego bohatera', () => {
    const broke = { ...rich(), gold: 0 };
    expect(nextPurchase(content, broke, SWORD)).toMatchObject({ kind: 'upgrade', cost: 50 });
    expect(nextPurchase(content, broke, 99)).toBeNull();
  });
});

describe('runeStock', () => {
  it('grupuje wolne runy po id: życie przed atakiem, rosnąco po wartości', () => {
    const save = rich(['rune_attack_25', 'rune_hp_200', 'rune_attack_10', 'rune_hp_200']);
    expect(runeStock(content, save).map(({ rune, count }) => [rune.id, count])).toEqual([
      ['rune_hp_200', 2],
      ['rune_attack_10', 1],
      ['rune_attack_25', 1],
    ]);
  });

  it('pomija runy włożone bohaterom i nieznane treści gry', () => {
    const save = equipRune(
      content,
      rich(['rune_hp_100', 'rune_hp_100', 'gone']),
      SWORD,
      0,
      'rune_hp_100',
    );
    if (save === null) throw new Error('equip refused');
    expect(runeStock(content, save).map(({ rune, count }) => [rune.id, count])).toEqual([
      ['rune_hp_100', 1],
    ]);
  });

  it('bez wolnych run daje pustą listę', () => {
    expect(runeStock(content, rich())).toEqual([]);
  });
});
