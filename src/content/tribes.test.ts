import { describe, expect, it } from 'vitest';
import { secondsToTicks } from '../core/units.ts';
import { requireContent } from './load.ts';

const content = requireContent();
const unit = (id: string) => {
  const found = content.heroes.get(id);
  if (found === undefined) throw new Error(`no unit ${id}`);
  return found;
};
const next = (line: string, id: string) => content.lines.get(line)?.forms.get(id)?.next;

describe('szczepy Immortals, Plants i Robots w treści gry', () => {
  it('Immortals: Orb, z niego Cardinal albo Guardian of hell, z każdego po dwie formy końcowe', () => {
    expect(content.lines.get('immortals')).toMatchObject({ base: 'orb', starter: false });
    expect(next('immortals', 'orb')).toEqual(['cardinal', 'guardian_of_hell']);
    expect(next('immortals', 'cardinal')).toEqual(['polaris', 'ultimus']);
    expect(next('immortals', 'guardian_of_hell')).toEqual(['xartix', 'enigmatix']);
  });

  it('Plants: Bush, z niego Trunk albo Ivy, z każdego po dwie formy końcowe', () => {
    expect(content.lines.get('plants')).toMatchObject({ base: 'bush', starter: false });
    expect(next('plants', 'bush')).toEqual(['trunk', 'ivy']);
    expect(next('plants', 'trunk')).toEqual(['oak_warrior', 'mother_tree']);
    expect(next('plants', 'ivy')).toEqual(['ice_ivy', 'toxic_ivy']);
  });

  it('Mother-tree nie atakuje: co 2 sekundy przyzywa krzak z 100 życia i 20 ataku', () => {
    const tree = unit('mother_tree');
    expect(tree.kind).toBe('summoner');
    expect(tree.summon).toBe('sprout');
    expect([tree.base.maxHp, tree.base.attack, tree.base.moveStep]).toEqual([10_000, 0, 0]);
    expect(tree.base.attackInterval).toBe(secondsToTicks(2));
    expect(tree.base.projectileStep).toBe(0);
    const sprout = content.summons.get('sprout');
    expect(tree.base.summon).toBe(sprout?.base);
    expect(tree.visual.summon).toBe(sprout?.visual);
    // „Bushes ver. 2” ze szkicu: życie 100, atak 20, szybkość 30, odrzut 0; walczy wręcz.
    expect(sprout?.kind).toBe('melee');
    expect(sprout?.base).toMatchObject({ maxHp: 100, attack: 20, moveStep: 256, knockback: 0 });
    // Krzaka nie da się kupić ani wystawić: nie jest bohaterem ani wrogiem poziomu.
    expect(content.heroes.has('sprout')).toBe(false);
    expect(content.enemies.has('sprout')).toBe(false);
  });

  it('Robots: Bot, z niego Egzo-bot albo Holo-bot, z każdego po dwie formy końcowe', () => {
    expect(content.lines.get('robots')).toMatchObject({ base: 'bot', starter: false });
    expect(next('robots', 'bot')).toEqual(['egzo_bot', 'holo_bot']);
    expect(next('robots', 'egzo_bot')).toEqual(['thermobot', 'ax_bot']);
    expect(next('robots', 'holo_bot')).toEqual(['whirl_bot', 'titan_bot']);
  });

  it('życie, atak, ruch i odrzut zgadzają się ze szkicami autora', () => {
    const stats = (id: string) => {
      const { base } = unit(id);
      // Ruch i odrzut w jednostkach świata na sekundę i jednostkach świata, jak na szkicu.
      return [
        base.maxHp,
        base.attack,
        Math.round((base.moveStep * 30) / 256),
        base.knockback / 256,
      ];
    };
    expect(
      Object.fromEntries(
        [
          'orb',
          'cardinal',
          'guardian_of_hell',
          'polaris',
          'ultimus',
          'xartix',
          'enigmatix',
          'bush',
          'trunk',
          'ivy',
          'oak_warrior',
          'ice_ivy',
          'toxic_ivy',
          'bot',
          'egzo_bot',
          'holo_bot',
          'thermobot',
          'ax_bot',
          'whirl_bot',
          'titan_bot',
        ].map((id) => [id, stats(id)]),
      ),
    ).toEqual({
      orb: [350, 35, 15, 10],
      cardinal: [450, 45, 10, 20],
      guardian_of_hell: [400, 60, 30, 10],
      polaris: [1100, 50, 0, 30],
      ultimus: [1250, 250, 30, 50],
      xartix: [850, 90, 75, 75],
      enigmatix: [1000, 160, 65, 100],
      bush: [400, 15, 0, 10],
      trunk: [600, 30, 25, 10],
      ivy: [500, 40, 0, 30],
      oak_warrior: [1250, 150, 40, 300],
      ice_ivy: [900, 20, 0, 10],
      toxic_ivy: [800, 10, 0, 30],
      bot: [200, 25, 50, 15],
      egzo_bot: [400, 40, 70, 25],
      holo_bot: [300, 30, 0, 30],
      thermobot: [900, 100, 80, 25],
      ax_bot: [750, 75, 80, 40],
      whirl_bot: [700, 70, 175, 30],
      titan_bot: [1200, 75, 40, 70],
    });
  });

  it('odstęp między atakami strzelców to liczba „Atk:” ze szkicu, w sekundach', () => {
    const seconds: Record<string, number> = {
      orb: 1.5,
      cardinal: 1,
      ultimus: 3,
      bush: 1.5,
      trunk: 1.5,
      ivy: 1.7,
      ice_ivy: 2,
      toxic_ivy: 1,
      holo_bot: 1,
      thermobot: 1,
    };
    for (const [id, interval] of Object.entries(seconds)) {
      expect(unit(id).kind, id).toBe('ranged');
      expect(unit(id).base.attackInterval, id).toBe(secondsToTicks(interval));
    }
    // Ultimus bije najmocniej i najrzadziej: 250 obrażeń co 3 sekundy.
    expect(unit('ultimus').base.attackInterval).toBe(90);
    // Zamach zawsze mieści się w odstępie, także u najszybszych.
    for (const hero of content.heroes.values()) {
      expect(hero.base.attackInterval, hero.id).toBeGreaterThanOrEqual(hero.base.swingTicks);
    }
  });

  it('postacie, które się nie ruszają, strzelają przez całe pole', () => {
    const still = [...content.heroes.values()].filter((hero) => hero.base.moveStep === 0);
    expect(still.map((hero) => hero.id)).toEqual([
      'polaris',
      'bush',
      'ivy',
      'mother_tree',
      'ice_ivy',
      'toxic_ivy',
      'holo_bot',
    ]);
    for (const hero of still) {
      // Stoją strzelcy i przyzywacz; nikt, kto musiałby dojść do wroga.
      expect(hero.kind, hero.id).not.toBe('melee');
      expect(hero.base.range, hero.id).toBeGreaterThanOrEqual(content.arena.width);
    }
  });

  it('szanse ze szkiców są cechami w stałym rytmie, tarcza zmniejsza obrażenia', () => {
    const traits = (id: string) => {
      const { base } = unit(id);
      return [base.doubleDamagePercent, base.dodgePercent, base.shieldPercent];
    };
    expect(traits('xartix')).toEqual([50, 0, 0]);
    expect(traits('enigmatix')).toEqual([0, 0, 50]);
    expect(traits('ax_bot')).toEqual([20, 0, 0]);
    expect(traits('whirl_bot')).toEqual([0, 70, 0]);
    expect(traits('titan_bot')).toEqual([0, 0, 10]);
  });

  it('Ice Ivy leczy całą drużynę o 50 co sekundę, pocisk Toxic Ivy przebija wszystkich', () => {
    const ice = unit('ice_ivy').base;
    expect([ice.healAmount, ice.healInterval, ice.healTeam]).toEqual([50, 30, true]);
    const toxic = unit('toxic_ivy').base;
    expect(toxic.pierce).toBe(true);
    expect(toxic.targetLast).toBe(false);
  });

  it('każdy strzelec ma własny pocisk wypuszczany z właściwej wysokości', () => {
    const shots = Object.fromEntries(
      [...content.lines.values()]
        .filter((line) => ['immortals', 'plants', 'robots'].includes(line.id))
        .flatMap((line) => [...line.forms.keys()])
        .map((id) => unit(id))
        .filter((hero) => hero.kind === 'ranged')
        .map((hero) => [hero.id, [hero.visual.projectileSprite, hero.visual.projectileHeight]]),
    );
    expect(shots).toEqual({
      orb: ['gaze', 39],
      cardinal: ['gaze', 52],
      polaris: ['star', 52],
      ultimus: ['ray', 58],
      bush: ['thorn', 26],
      trunk: ['seed', 50],
      ivy: ['thorn', 54],
      ice_ivy: ['frost', 54],
      toxic_ivy: ['spore', 54],
      holo_bot: ['glitch', 44],
      thermobot: ['slag', 50],
    });
  });
});
