import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { applyVictory, levelOrder, newSave } from './progress.ts';
import type { Save } from './save-schema.ts';
import { sceneBackdrop } from './scene-world.ts';

const content = requireContent();
const fresh = newSave(content, '0.0.0', 'pl');

/** Zapis po wygraniu pierwszych `count` poziomów gry. */
function clearedFirst(count: number): Save {
  let save = fresh;
  for (const level of levelOrder(content).slice(0, count)) {
    const next = applyVictory(content, save, level, 500);
    if (next === null) throw new Error(`cannot clear ${level}`);
    save = next.save;
  }
  return save;
}

const BATTLE = { outcome: 'win', reason: 'eliminated', ticks: 400 } as const;

describe('sceneBackdrop', () => {
  it('mapa pokazuje tło świata wybranego poziomu, także zablokowanego', () => {
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'w1_l1' })).toBe('castle');
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'w2_l4' })).toBe('mechanus');
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'w3_l1' })).toBe('swamps');
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'w4_l6' })).toBe('jungle');
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'w5_l2' })).toBe('tower');
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'w6_l6' })).toBe('citadel');
  });

  it('walka i jej wynik mają tło świata swojego poziomu', () => {
    expect(sceneBackdrop(content, fresh, { name: 'battle', level: 'w4_l2' })).toBe('jungle');
    expect(
      sceneBackdrop(content, fresh, {
        name: 'result',
        level: 'w6_l6',
        battle: BATTLE,
        rewards: null,
      }),
    ).toBe('citadel');
  });

  it('ekran startowy pokazuje świat, do którego gracz doszedł', () => {
    expect(sceneBackdrop(content, fresh, { name: 'title' })).toBe('castle');
    expect(sceneBackdrop(content, clearedFirst(6), { name: 'title' })).toBe('mechanus');
    expect(sceneBackdrop(content, clearedFirst(36), { name: 'title' })).toBe('citadel');
  });

  it('skład, sklep i bohaterowie nie mają własnego świata: tło zostaje po poprzednim ekranie', () => {
    expect(sceneBackdrop(content, fresh, { name: 'squad' })).toBeNull();
    expect(sceneBackdrop(content, fresh, { name: 'shop' })).toBeNull();
    expect(
      sceneBackdrop(content, fresh, { name: 'heroes', line: 'beasts', form: null }),
    ).toBeNull();
  });

  it('nieznany poziom i mapa bez wybranego poziomu nie zmieniają tła', () => {
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: null })).toBeNull();
    expect(sceneBackdrop(content, fresh, { name: 'map', selected: 'nie_ma' })).toBeNull();
  });
});
