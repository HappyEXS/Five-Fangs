// Reguły rozmieszczenia przeciwników i nagród z decyzji autora gry (ADR 0025), sprawdzane na
// treści gry. Test nie przypina liczb poziomów: pilnuje zasad, które mają przetrwać strojenie.
import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import { goldBefore, levelOrder, runBalance } from './balance.ts';
import { squadForGold, squadLabel } from './reference-plan.ts';
import { loadReference } from './reference-squads.ts';

const content = requireContent();
const { reference } = loadReference(content);
if (reference === null) throw new Error('reference squad');
const levels = levelOrder(content);
const worlds = content.worlds.map((world) =>
  world.levels.map((id) => {
    const level = content.levels.get(id);
    if (level === undefined) throw new Error(id);
    return level;
  }),
);
const akronix = content.enemyTribes.get('akronix')?.members.map((member) => member.unit) ?? [];
const isAkronix = (unit: string): boolean => akronix.includes(unit);

describe('nagrody', () => {
  const total = goldBefore(content).at(-1) ?? 0;
  const worldGold = worlds.map((world) => world.reduce((sum, level) => sum + level.gold, 0));

  it('cała gra daje ok. 60 000 złota: na dziesięciu w pełni rozwiniętych bohaterów', () => {
    expect(total).toBeGreaterThanOrEqual(57_000);
    expect(total).toBeLessThanOrEqual(63_000);
  });

  it('każdy świat daje więcej niż poprzedni, a w świecie nagrody nie maleją', () => {
    for (let world = 1; world < worldGold.length; world++) {
      expect(worldGold[world], `świat ${world + 1}`).toBeGreaterThan(worldGold[world - 1] ?? 0);
    }
    for (const world of worlds) {
      for (let index = 1; index < world.length; index++) {
        expect(world[index]?.gold, world[index]?.id).toBeGreaterThanOrEqual(
          world[index - 1]?.gold ?? 0,
        );
      }
    }
  });

  it('dopóki skład odniesienia ma co kupować, każda nagroda kupuje mu coś nowego', () => {
    const gold = goldBefore(content);
    for (let index = 1; index < levels.length; index++) {
      const before = squadForGold(content, reference, gold[index - 1] ?? 0);
      if (before.maxed) break;
      const after = squadForGold(content, reference, gold[index] ?? 0);
      expect(after.spent, levels[index]?.id).toBeGreaterThan(before.spent);
    }
  });

  it('skład odniesienia kończy rozwój w piątym świecie; szósty daje złoto na drugi skład', () => {
    const gold = goldBefore(content);
    const maxedAt = gold.findIndex((sum) => squadForGold(content, reference, sum).maxed);
    expect(levels[maxedAt]?.world).toBe('world_5');
    expect(squadLabel(squadForGold(content, reference, gold[30] ?? 0))).toBe('5 × C4');
    expect(worldGold[5]).toBeGreaterThan(20_000);
  });

  it('runa życia czeka na trzecim poziomie każdego świata, runa ataku u bossa', () => {
    for (const world of worlds) {
      const runes = world.map((level) =>
        level.rune === null ? null : content.runes.get(level.rune)?.stat,
      );
      expect(runes, world[0]?.world).toEqual([null, null, 'maxHp', null, null, 'attack']);
    }
  });
});

describe('przeciwnicy', () => {
  it('dwa pierwsze poziomy gry mają po dwóch wrogów, pozostałe od trzech do pięciu', () => {
    expect(levels.slice(0, 2).map((level) => level.enemies.length)).toEqual([2, 2]);
    for (const level of levels.slice(2)) {
      expect(level.enemies.length, level.id).toBeGreaterThanOrEqual(3);
      expect(level.enemies.length, level.id).toBeLessThanOrEqual(5);
    }
  });

  it('od trzeciego świata zwykle stoi pięciu wrogów', () => {
    for (const world of worlds.slice(2)) {
      const full = world.filter((level) => level.enemies.length === 5).length;
      expect(full, world[0]?.world).toBeGreaterThanOrEqual(5);
    }
  });

  it('poziomy siły wrogów jednego poziomu różnią się najwyżej o trzy', () => {
    for (const level of levels) {
      const values = level.enemies.map((enemy) => enemy.level);
      expect(Math.max(...values) - Math.min(...values), level.id).toBeLessThanOrEqual(3);
    }
  });

  it('wrogowie stoją od frontu bez dziur', () => {
    for (const level of levels) {
      expect(
        level.enemies.map((enemy) => enemy.slot),
        level.id,
      ).toEqual(level.enemies.map((_, index) => index));
    }
  });
});

describe('Akronix', () => {
  const firstSeen = (unit: string): number =>
    levels.findIndex((level) => level.enemies.some((enemy) => enemy.unit === unit));

  it('pojawiają się w kolejności swojego pocztu, każdy przed następnym', () => {
    const order = akronix.map(firstSeen);
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length);
  });

  it('są w każdym świecie: przy bossie i na co najmniej jednym zwykłym poziomie', () => {
    for (const world of worlds) {
      const withAkronix = world.map((level) => level.enemies.some((e) => isAkronix(e.unit)));
      expect(withAkronix[5], world[5]?.id).toBe(true);
      expect(withAkronix.slice(0, 5).filter(Boolean).length, world[0]?.world).toBeGreaterThan(0);
    }
    // Od drugiego świata Akronix urozmaica co najmniej dwa zwykłe poziomy.
    for (const world of worlds.slice(1)) {
      const regular = world
        .slice(0, 5)
        .filter((level) => level.enemies.some((e) => isAkronix(e.unit)));
      expect(regular.length, world[0]?.world).toBeGreaterThanOrEqual(2);
    }
  });

  it('nie są wszędzie: poza Cytadelą większość wrogów świata to jego własny szczep', () => {
    for (const world of worlds.slice(0, 5)) {
      const enemies = world.flatMap((level) => level.enemies);
      const invaders = enemies.filter((enemy) => isAkronix(enemy.unit)).length;
      expect(invaders * 2, world[0]?.world).toBeLessThan(enemies.length);
    }
    const citadel = (worlds[5] ?? []).flatMap((level) => level.enemies);
    expect(citadel.every((enemy) => isAkronix(enemy.unit))).toBe(true);
  });

  it('Axiny kończą światy 3, 4 i 5, a w finale stają wszyscy trzej', () => {
    const boss = (world: number): string[] =>
      (worlds[world]?.[5]?.enemies ?? []).map((enemy) => enemy.unit);
    expect(boss(2)).toContain('axin_1');
    expect(boss(3)).toContain('axin_2');
    expect(boss(4)).toContain('axin_3');
    expect(boss(5)).toEqual(expect.arrayContaining(['axin_1', 'axin_2', 'axin_3']));
    // Wcześniej żaden Axin się nie pokazuje.
    expect(firstSeen('axin_1')).toBe(17);
  });
});

describe('trudność', () => {
  const reports = runBalance(content, reference);

  it('każdy poziom jest ustawiony zgodnie z regułą: zwykły bez zapasu, boss wymaga run', () => {
    expect(
      reports
        .filter((report) => report.verdict !== 'zgodny')
        .map((r) => `${r.level}: ${r.verdict}`),
    ).toEqual([]);
  });

  it('zwykły poziom: skład odniesienia wygrywa bez run, a skład sprzed nagrody przegrywa', () => {
    for (const report of reports.filter((entry) => !entry.needsRunes)) {
      expect(report.plain.win, report.level).toBe(true);
      expect(report.previous?.win ?? false, report.level).toBe(false);
      expect(report.enoughFrom, report.level).toBe(report.level);
    }
  });

  it('boss i poziomy Cytadeli: bez run przegrana, z runami zdobytymi wcześniej wygrana', () => {
    const hard = reports.filter((entry) => entry.needsRunes);
    expect(hard.map((report) => report.level)).toEqual([
      'w1_l6',
      'w2_l6',
      'w3_l6',
      'w4_l6',
      'w5_l6',
      'w6_l1',
      'w6_l2',
      'w6_l3',
      'w6_l4',
      'w6_l5',
      'w6_l6',
    ]);
    for (const report of hard) {
      expect(report.plain.win, report.level).toBe(false);
      expect(report.runed.win, report.level).toBe(true);
      expect(report.runes, report.level).toBeGreaterThan(0);
    }
  });

  it('wygrana nie wisi na limicie czasu', () => {
    for (const report of reports) {
      const result = report.needsRunes ? report.runed : report.plain;
      expect(result.ticks, report.level).toBeLessThanOrEqual(70 * 30);
    }
  });
});
