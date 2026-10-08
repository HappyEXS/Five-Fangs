// Szczep wrogów Akronix w treści gry: poczet ze szkicu autora, statystyki Axinów ze szkicu,
// zdolności i kolejność siły. Test leży poza src/content, bo rozgrywa pojedynki w symulacji.
import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import { resolveUnitSpec } from '../../src/content/resolve-spec.ts';
import { displayStats, traitsOf } from '../../src/game/stats.ts';
import { createBattle, runBattleToEnd, type UnitSpec } from '../../src/sim/index.ts';

const content = requireContent();
const tribe = content.enemyTribes.get('akronix');
if (tribe === undefined) throw new Error('no akronix tribe');
const ORDER = tribe.members.map((member) => member.unit);

const unit = (id: string) => {
  const found = content.enemies.get(id);
  if (found === undefined) throw new Error(`no enemy ${id}`);
  return found;
};
const spec = (id: string): UnitSpec => resolveUnitSpec(unit(id), 0, [], content.progression);
const traitKeys = (id: string) => traitsOf(unit(id).base).map((trait) => trait.key);

/** Pojedynek jeden na jednego na arenie gry, z frontowych slotów. */
function duel(player: string, enemy: string) {
  const empty = [null, null, null, null];
  return runBattleToEnd(
    createBattle({
      arena: content.arena,
      player: [spec(player), ...empty],
      enemy: [spec(enemy), ...empty],
    }),
  );
}

describe('szczep Akronix', () => {
  it('poczet ze szkicu: zwiadowcy, żołnierze, wojownicy, generał i trzej Axiny', () => {
    expect(tribe.members).toEqual([
      { unit: 'bowix', rank: 'scout' },
      { unit: 'assasinix', rank: 'scout' },
      { unit: 'katanix', rank: 'soldier' },
      { unit: 'defenix', rank: 'soldier' },
      { unit: 'poisonix', rank: 'warrior' },
      { unit: 'hornix', rank: 'warrior' },
      { unit: 'kaisarix', rank: 'general' },
      { unit: 'axin_1', rank: 'boss' },
      { unit: 'axin_2', rank: 'boss' },
      { unit: 'axin_3', rank: 'boss' },
    ]);
  });

  it('to wyłącznie wrogowie: żadna postać nie jest formą bohatera ani nie stoi w sklepie', () => {
    for (const id of ORDER) {
      expect(content.heroes.has(id), id).toBe(false);
      expect(unit(id).visual.skin).toBe(id);
      for (const line of content.lines.values()) expect(line.forms.has(id), id).toBe(false);
    }
  });

  it('Axiny mają statystyki ze szkicu autora', () => {
    const sketch = (id: string) => {
      const stats = displayStats(unit(id).base);
      return [stats.maxHp, stats.attack, Math.round(stats.moveSpeed), stats.knockback];
    };
    expect(sketch('axin_1')).toEqual([1000, 100, 400, 150]);
    expect(sketch('axin_2')).toEqual([2000, 90, 400, 300]);
    expect(sketch('axin_3')).toEqual([3000, 300, 200, 200]);
  });

  it('zdolności: krwawienie Axina 2, trucizna Poisonixa, szarża Hornixa, tarcze ze szkicu', () => {
    // „+30” ze szkicu: trafiony traci 30 życia co sekundę przez 10 sekund.
    expect(traitsOf(unit('axin_2').base)).toEqual([
      { key: 'trait.bleed', params: { damage: 30, every: 1, seconds: 10 } },
    ]);
    expect(traitsOf(unit('poisonix').base)).toEqual([
      { key: 'trait.poison', params: { damage: 20, every: 1, seconds: 5 } },
    ]);
    expect(traitsOf(unit('hornix').base)).toEqual([
      { key: 'trait.charge.times', params: { times: 3 } },
    ]);
    expect(traitsOf(unit('defenix').base)).toEqual([
      { key: 'trait.shield', params: { percent: 20 } },
    ]);
    expect(traitsOf(unit('axin_3').base)).toEqual([
      { key: 'trait.shield', params: { percent: 10 } },
    ]);
    expect(traitKeys('assasinix')).toEqual(['trait.targetLast']);
    expect(traitKeys('katanix')).toEqual(['trait.doubleDamage.every']);
    expect(traitKeys('kaisarix')).toEqual(['trait.splash', 'trait.enrage']);
    expect(traitKeys('bowix')).toEqual([]);
    expect(traitKeys('axin_1')).toEqual([]);
  });

  it('strzelcy mają pociski szczepu, a tarcza i druga broń korzystają z drugiej ręki', () => {
    expect(unit('bowix').visual).toMatchObject({ projectileSprite: 'barb', stance: 'bow' });
    expect(unit('assasinix').visual.projectileSprite).toBe('dart');
    expect(unit('poisonix').visual.projectileSprite).toBe('flask');
    expect(unit('defenix').visual.stance).toBe('shield');
    for (const id of ['axin_1', 'axin_2', 'axin_3']) expect(unit(id).visual.stance).toBe('dual');
  });

  it('każda kolejna postać jest mocniejsza: wygrywa pojedynek z poprzednią z obu stron pola', () => {
    for (let i = 1; i < ORDER.length; i++) {
      const stronger = ORDER[i] ?? '';
      const weaker = ORDER[i - 1] ?? '';
      const asPlayer = duel(stronger, weaker);
      expect([asPlayer.outcome, asPlayer.reason], `${stronger} kontra ${weaker}`).toEqual([
        'win',
        'eliminated',
      ]);
      const asEnemy = duel(weaker, stronger);
      expect([asEnemy.outcome, asEnemy.reason], `${weaker} kontra ${stronger}`).toEqual([
        'loss',
        'eliminated',
      ]);
    }
  });

  it('wśród walczących wręcz i wśród strzelców życie rośnie z każdą kolejną postacią', () => {
    for (const kind of ['melee', 'ranged'] as const) {
      const hp = ORDER.filter((id) => unit(id).kind === kind).map((id) => unit(id).base.maxHp);
      expect(hp, kind).toEqual([...hp].sort((a, b) => a - b));
    }
  });
});
