import { describe, expect, it } from 'vitest';
import { loadContent, type RawContent, rawContent } from '../../src/content/load.ts';
import { contentSimIssues } from './content-sim-checks.ts';

const unit = {
  id: 'swordsman',
  kind: 'melee',
  maxHp: 600,
  attack: 40,
  moveSpeed: 60,
  attackSpeed: 1,
  range: 30,
  knockback: 15,
  attackType: 'slash',
  skin: 'swordsman_a',
};

function issuesFor(overrides: Partial<RawContent>): string[] {
  const { content, issues } = loadContent({ ...rawContent, ...overrides });
  if (content === null) throw new Error(`content did not load: ${JSON.stringify(issues)}`);
  return contentSimIssues(content).map((i) => `${i.source}: ${i.message}`);
}

describe('contentSimIssues', () => {
  it('treść gry spełnia niezmienniki symulacji', () => {
    expect(issuesFor({})).toEqual([]);
  });

  it('odrzuca odstęp ataków krótszy niż zamach', () => {
    // 5 ataków/s to odstęp 6 ticków, a zamach "slash" trwa 12.
    const issues = issuesFor({ 'units/heroes.json': [{ ...unit, attackSpeed: 5 }] });
    expect(issues).toEqual([
      'units/heroes.json: swordsman: attackInterval nie może być krótszy niż swingTicks',
    ]);
  });

  it('odrzuca jednostkę tak szybką, że mogłaby minąć wroga', () => {
    // 1000 jednostek/s to ponad 33 jednostki na tick, przy zasięgu wręcz 30.
    const issues = issuesFor({
      'units/heroes.json': [{ ...unit, id: 'archer', moveSpeed: 1000 }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('mogłyby się minąć');
    expect(issues[0]).toContain('"archer"');
  });

  it('odrzuca skład, który przepełniłby pulę pocisków', () => {
    const slowArrow = {
      id: 'shoot',
      swingDuration: 0.1,
      hitFraction: 0.5,
      clip: 'shoot',
      stance: 'bow',
      projectile: { speed: 10, sprite: 'arrow' },
    };
    const spammer = { ...unit, id: 'archer', kind: 'ranged', attackSpeed: 10, attackType: 'shoot' };
    const issues = issuesFor({
      'attacks.json': [
        slowArrow,
        { id: 'slash', swingDuration: 0.4, hitFraction: 0.5, clip: 'slash', stance: 'sword' },
      ],
      'units/heroes.json': [spammer],
      'units/enemies.json': [],
    });
    expect(issues.at(-1)).toContain('pocisków w locie');
  });

  it('jednostka celująca w koniec szyku musi sięgać całego pola', () => {
    const spitter = {
      ...unit,
      id: 'spitter',
      kind: 'ranged',
      attackSpeed: 0.8,
      attackType: 'shoot',
      traits: [{ type: 'targetLast' }],
    };
    expect(issuesFor({ 'units/heroes.json': [{ ...spitter, range: 1000 }] })).toEqual([]);
    expect(issuesFor({ 'units/heroes.json': [{ ...spitter, range: 400 }] })).toEqual([
      'units/heroes.json: spitter: cecha "targetLast" wymaga zasięgu na całe pole (range ≥ szerokość areny)',
    ]);
  });

  it('jednostka bez ruchu musi sięgać całego pola', () => {
    const rooted = { ...unit, id: 'rooted', kind: 'ranged', moveSpeed: 0, attackType: 'shoot' };
    expect(issuesFor({ 'units/heroes.json': [{ ...rooted, range: 1000 }] })).toEqual([]);
    expect(issuesFor({ 'units/heroes.json': [{ ...rooted, range: 400 }] })).toEqual([
      'units/heroes.json: rooted: jednostka bez ruchu (moveSpeed 0) wymaga zasięgu na całe pole (range ≥ szerokość areny)',
    ]);
  });

  it('jednostki przyzywane podlegają tym samym regułom co pozostałe', () => {
    const sprout = { ...unit, id: 'sprout', skin: 'sprout' };
    const tree = { ...unit, id: 'tree', kind: 'summoner', attack: 0, summon: 'sprout' };
    const ok = issuesFor({ 'units/heroes.json': [tree], 'units/summons.json': [sprout] });
    expect(ok).toEqual([]);
    // Zbyt szybki przyzywany mógłby minąć wroga.
    const fast = issuesFor({
      'units/heroes.json': [tree],
      'units/summons.json': [{ ...sprout, moveSpeed: 1000 }],
    });
    expect(fast.join('\n')).toContain('mogłyby się minąć');
    expect(fast.join('\n')).toContain('"sprout"');
    // Przyzywany z odstępem ataków krótszym niż zamach.
    const hasty = issuesFor({
      'units/heroes.json': [tree],
      'units/summons.json': [{ ...sprout, attackSpeed: 5 }],
    });
    expect(hasty).toContain(
      'units/summons.json: sprout: attackInterval nie może być krótszy niż swingTicks',
    );
  });

  it('sprawdza arenę', () => {
    const issues = issuesFor({
      'arena.json': {
        width: 1000,
        playerSlots: [700, 340, 280, 220, 160],
        enemySlots: [600, 660, 720, 780, 840],
        timeLimit: 90,
      },
    });
    expect(issues).toEqual([
      'arena.json: arena: wszystkie sloty gracza muszą leżeć na lewo od slotów przeciwnika',
    ]);
  });
});
