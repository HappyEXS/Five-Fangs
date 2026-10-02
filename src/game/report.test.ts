import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { levelSetup } from '../content/resolve-spec.ts';
import { newSave, squadMembers } from './progress.ts';
import { buildReport } from './report.ts';
import { displayStats, formatBattleTime, traitsOf } from './stats.ts';

const content = requireContent();
const save = newSave(content, '0.1.0', 'pl');
const version = { version: '0.1.0', commit: 'abcdef1234567', builtAt: '2026-10-02T10:00:00Z' };

describe('buildReport', () => {
  const base = {
    version,
    userAgent: 'TestBrowser/1.0',
    language: 'pl',
    screen: '1280x720 @1',
    scene: 'result',
    save,
    now: new Date('2026-10-02T12:00:00Z'),
  };

  it('zawiera wersję gry, przeglądarkę i stan zapisu', () => {
    const report = buildReport({ ...base, errors: [], lastBattle: null });
    expect(report).toContain('version: 0.1.0 (abcdef1), built 2026-10-02T10:00:00Z');
    expect(report).toContain('browser: TestBrowser/1.0');
    expect(report).toContain('time: 2026-10-02T12:00:00.000Z');
    expect(report).toContain('squad: [1,2,null,null,null]');
    expect(report).toContain('"line":"swordsman"');
    expect(report).toContain('errors (0):\n  none');
    expect(report).toContain('last battle setup:\n  none');
  });

  it('zawiera ostatnie błędy z kontekstem i początkiem stosu', () => {
    const report = buildReport({
      ...base,
      lastBattle: null,
      errors: [
        {
          at: '2026-10-02T11:59:00.000Z',
          kind: 'load',
          message: 'Error: boom',
          stack: 'Error: boom\n    at a\n    at b',
          context: 'atlas:units',
        },
      ],
    });
    expect(report).toContain('errors (1):');
    expect(report).toContain('[2026-10-02T11:59:00.000Z] load: Error: boom');
    expect(report).toContain('context: atlas:units');
    expect(report).toContain('    at a');
  });

  it('zawiera wejście symulacji ostatniej walki, z którego da się ją odtworzyć', () => {
    const level = content.levels.get('w1_l1');
    if (level === undefined) throw new Error('missing level');
    const setup = levelSetup(content, level, squadMembers(content, save));
    const report = buildReport({ ...base, errors: [], lastBattle: setup });
    const json = report.slice(
      report.indexOf('last battle setup:\n') + 'last battle setup:\n'.length,
    );
    expect(JSON.parse(json)).toEqual(setup);
  });
});

describe('statystyki dla gracza', () => {
  it('przelicza ticki i podjednostki na wartości z danych', () => {
    const archer = content.heroes.get('archer_a');
    if (archer === undefined) throw new Error('missing unit');
    const stats = displayStats(archer.base);
    expect(stats.maxHp).toBe(350);
    expect(stats.attack).toBe(30);
    expect(stats.range).toBe(220);
    expect(stats.knockback).toBe(0);
    // 0,8 ataku na sekundę to odstęp 38 ticków, czyli efektywnie 30/38.
    expect(stats.attackRate).toBeCloseTo(30 / 38, 6);
    expect(stats.damagePerSecond).toBeCloseTo((30 * 30) / 38, 6);
    expect(stats.moveSpeed).toBeCloseTo(50, 0);
  });

  it('odczytuje cechy pasywne ze specyfikacji', () => {
    const sniper = content.heroes.get('archer_b');
    const sword = content.heroes.get('swordsman_a');
    if (sniper === undefined || sword === undefined) throw new Error('missing unit');
    expect(traitsOf(sniper.base)).toEqual([{ key: 'trait.pierce', params: {} }]);
    expect(traitsOf(sword.base)).toEqual([]);
    expect(traitsOf({ ...sword.base, healAmount: 20, healInterval: 45, healTeam: true })).toEqual([
      { key: 'trait.heal.team', params: { amount: 20, seconds: 1.5 } },
    ]);
  });

  it('opisuje cios obszarowy, kradzież życia i szał jednostek z treści gry', () => {
    const knight = content.heroes.get('swordsman_b');
    const raider = content.enemies.get('raider');
    const boss = content.enemies.get('chieftain');
    if (knight === undefined || raider === undefined || boss === undefined) {
      throw new Error('missing unit');
    }
    expect(traitsOf(knight.base)).toEqual([{ key: 'trait.splash', params: { radius: 45 } }]);
    expect(traitsOf(raider.base)).toEqual([{ key: 'trait.lifesteal', params: { percent: 35 } }]);
    expect(traitsOf(boss.base)).toEqual([
      { key: 'trait.splash', params: { radius: 40 } },
      { key: 'trait.enrage', params: { hp: 50, bonus: 60 } },
    ]);
  });

  it('formatuje czas walki', () => {
    expect(formatBattleTime(0)).toBe('0:00');
    expect(formatBattleTime(29)).toBe('0:00');
    expect(formatBattleTime(420)).toBe('0:14');
    expect(formatBattleTime(2700)).toBe('1:30');
  });
});
