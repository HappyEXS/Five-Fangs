import { describe, expect, it } from 'vitest';
import { requireContent } from './load.ts';

const content = requireContent();
const unit = (id: string) => {
  const found = content.heroes.get(id);
  if (found === undefined) throw new Error(`no unit ${id}`);
  return found;
};

describe('szczep Beasts w treści gry', () => {
  const line = content.lines.get('beasts');

  it('drzewo: Monstrosity, z niej Batfang albo Reaper, z każdej po dwie formy końcowe', () => {
    expect(line).toMatchObject({ id: 'beasts', base: 'monstrosity', starter: false });
    const next = (id: string) => line?.forms.get(id)?.next;
    expect(next('monstrosity')).toEqual(['batfang', 'reaper']);
    expect(next('batfang')).toEqual(['spiker', 'ironbeak']);
    expect(next('reaper')).toEqual(['tuskovator', 'ignitix']);
    for (const last of ['spiker', 'ironbeak', 'tuskovator', 'ignitix']) {
      expect(next(last)).toEqual([]);
      expect(line?.forms.get(last)?.tier).toBe(2);
    }
  });

  it('rodzaj ataku form zgadza się ze szkicami autora', () => {
    const kinds = Object.fromEntries(
      [...(line?.forms.keys() ?? [])].map((id) => [id, unit(id).kind]),
    );
    expect(kinds).toEqual({
      monstrosity: 'melee',
      batfang: 'ranged',
      reaper: 'melee',
      spiker: 'ranged',
      ironbeak: 'melee',
      tuskovator: 'melee',
      ignitix: 'ranged',
    });
  });

  it('Ignitix celuje w koniec szyku i sięga całego pola, więc strzela z miejsca', () => {
    const { base } = unit('ignitix');
    expect(base.targetLast).toBe(true);
    expect(base.pierce).toBe(false);
    expect(base.range).toBeGreaterThanOrEqual(content.arena.width);
  });

  it('Spiker leczy sam siebie co sekundę; pozostałe bestie nie mają cech', () => {
    const { base } = unit('spiker');
    expect([base.healAmount, base.healInterval, base.healTeam]).toEqual([25, 30, false]);
    for (const id of ['monstrosity', 'batfang', 'reaper', 'ironbeak', 'tuskovator']) {
      const spec = unit(id).base;
      expect([spec.healAmount, spec.targetLast, spec.pierce, spec.splashRadius], id).toEqual([
        0,
        false,
        false,
        0,
      ]);
    }
  });

  it('strzelcy mają własne pociski, każdy z innej wysokości', () => {
    const shots = ['batfang', 'spiker', 'ignitix'].map((id) => {
      const { visual } = unit(id);
      return [visual.projectileSprite, visual.projectileHeight];
    });
    expect(shots).toEqual([
      ['fang', 50],
      ['spike', 38],
      ['fireball', 72],
    ]);
  });
});
