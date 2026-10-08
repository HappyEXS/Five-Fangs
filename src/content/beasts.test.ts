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
    // Przebijające kolce dodał autor gry 2026-10-08.
    expect(base.pierce).toBe(true);
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

  it('odstęp między atakami strzelców to liczba „Atk:” ze szkicu, w sekundach', () => {
    // Batfang 1,2 s, Spiker 1,0 s; przy 30 tickach na sekundę. Ignitix miał na szkicu 0,8 s,
    // autor wydłużył odstęp do 1,2 s (2026-10-08).
    expect(['batfang', 'spiker', 'ignitix'].map((id) => unit(id).base.attackInterval)).toEqual([
      36, 30, 36,
    ]);
    // Zamach każdego mieści się w jego odstępie.
    for (const id of ['batfang', 'spiker', 'ignitix']) {
      expect(unit(id).base.swingTicks, id).toBeLessThanOrEqual(unit(id).base.attackInterval);
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
