import { describe, expect, it } from 'vitest';
import { loadContent, rawContent, requireContent } from '../content/load.ts';
import { applyVictory, equipRune, freeRunes, levelOrder, newSave } from './progress.ts';
import { earnedTokens, nextRune, runeTokens, runeTreeView, unlockRune } from './runes.ts';
import type { Save } from './save-schema.ts';

const content = requireContent();
const fresh = (): Save => newSave(content, '0.0.0', 'pl');

/** Zapis po wygraniu pierwszych `count` poziomów gry. */
function clearedFirst(count: number): Save {
  let save = fresh();
  for (const level of levelOrder(content).slice(0, count)) {
    const result = applyVictory(content, save, level, 500);
    if (result === null) throw new Error(`cannot clear ${level}`);
    save = result.save;
  }
  return save;
}

/** Odblokowuje runy po kolei; każda musi się udać. */
function unlocked(save: Save, runes: readonly string[]): Save {
  let next = save;
  for (const rune of runes) {
    const result = unlockRune(content, next, rune);
    if (result === null) throw new Error(`cannot unlock ${rune}`);
    next = result;
  }
  return next;
}

const branch = (id: string) => {
  const found = content.runeTree.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`no branch ${id}`);
  return found;
};

describe('żetony run', () => {
  it('nowa gra nie ma żetonów; żeton wpada za pierwsze przejście poziomu, który go daje', () => {
    expect(runeTokens(content, fresh())).toBe(0);
    // W świecie pierwszym żeton dają poziomy drugi i piąty.
    expect([1, 2, 4, 5, 6].map((count) => earnedTokens(content, clearedFirst(count)))).toEqual([
      0, 1, 1, 2, 2,
    ]);
  });

  it('powtórne przejście poziomu nie daje drugiego żetonu', () => {
    const save = clearedFirst(2);
    const again = applyVictory(content, save, 'w1_l2', 300);
    expect(again && runeTokens(content, again.save)).toBe(1);
  });

  it('do wydania jest tyle żetonów, ile zdobyto, minus posiadane runy', () => {
    const save = clearedFirst(5);
    expect(runeTokens(content, save)).toBe(2);
    const one = unlocked(save, ['hp_1']);
    expect(runeTokens(content, one)).toBe(1);
    expect(runeTokens(content, unlocked(one, ['attack_1']))).toBe(0);
    // Runa, której nie ma w treści gry, nie kosztowała żetonu tej gry.
    expect(runeTokens(content, { ...save, runes: ['rune_dawna'] })).toBe(2);
    // Zapis z większą liczbą run, niż dał postęp, nie ma ujemnych żetonów.
    expect(runeTokens(content, { ...fresh(), runes: ['hp_1'] })).toBe(0);
  });

  it('cała gra daje mniej żetonów, niż drzewko ma run: gracz wybiera kierunki', () => {
    const all = clearedFirst(levelOrder(content).length);
    expect(earnedTokens(content, all)).toBeGreaterThan(0);
    expect(earnedTokens(content, all)).toBeLessThan(content.runes.size);
  });
});

describe('unlockRune', () => {
  it('wydaje żeton na pierwszą runę wybranego kierunku', () => {
    const save = clearedFirst(2);
    const next = unlockRune(content, save, 'knockback_1');
    expect(next?.runes).toEqual(['knockback_1']);
    expect(next && runeTokens(content, next)).toBe(0);
    // Odblokowana runa jest wolnym przedmiotem: da się ją włożyć bohaterowi.
    expect(next && freeRunes(next)).toEqual(['knockback_1']);
    expect(next && equipRune(content, next, 1, 0, 'knockback_1')).not.toBeNull();
  });

  it('kierunek odblokowuje się po kolei: dalszej runy nie da się wziąć przed poprzednią', () => {
    const save = clearedFirst(5);
    expect(unlockRune(content, save, 'hp_2')).toBeNull();
    expect(unlockRune(content, save, 'hp_6')).toBeNull();
    const first = unlocked(save, ['hp_1']);
    expect(unlockRune(content, first, 'hp_3')).toBeNull();
    expect(unlockRune(content, first, 'hp_2')?.runes).toEqual(['hp_1', 'hp_2']);
    // Inny kierunek zaczyna się od swojej pierwszej runy, niezależnie od pozostałych.
    expect(unlockRune(content, first, 'speed_1')?.runes).toEqual(['hp_1', 'speed_1']);
  });

  it('odmawia bez żetonu, dla runy już posiadanej i dla runy spoza drzewka', () => {
    expect(unlockRune(content, fresh(), 'hp_1')).toBeNull();
    const spent = unlocked(clearedFirst(2), ['hp_1']);
    expect(unlockRune(content, spent, 'attack_1')).toBeNull();
    const save = unlocked(clearedFirst(5), ['hp_1']);
    expect(unlockRune(content, save, 'hp_1')).toBeNull();
    expect(unlockRune(content, save, 'rune_dawna')).toBeNull();
    expect(unlockRune(content, save, '')).toBeNull();
  });

  it('po przejściu całego kierunku nie ma w nim już nic do wzięcia', () => {
    const hp = branch('hp');
    const all = clearedFirst(levelOrder(content).length);
    const full = unlocked(
      all,
      hp.runes.map((rune) => rune.id),
    );
    expect(nextRune(full, hp)).toBeNull();
    expect(nextRune(full, branch('attack'))?.id).toBe('attack_1');
    for (const rune of hp.runes) expect(unlockRune(content, full, rune.id)).toBeNull();
  });

  it('luka w kierunku (zapis poprawiony ręcznie) daje się uzupełnić', () => {
    const save = { ...clearedFirst(5), runes: ['hp_2'] };
    expect(nextRune(save, branch('hp'))?.id).toBe('hp_1');
    expect(unlockRune(content, save, 'hp_3')).toBeNull();
    expect(unlockRune(content, save, 'hp_1')?.runes).toEqual(['hp_2', 'hp_1']);
  });
});

describe('runeTreeView', () => {
  it('na początku każdy kierunek ma pierwszą runę jako następną, resztę zamkniętą', () => {
    const view = runeTreeView(content, fresh());
    expect(view.tokens).toBe(0);
    expect(view.branches.map((entry) => entry.branch.id)).toEqual(
      content.runeTree.map((entry) => entry.id),
    );
    for (const { nodes } of view.branches) {
      expect(nodes.map((node) => node.state)).toEqual([
        'next',
        ...nodes.slice(1).map(() => 'locked'),
      ]);
    }
  });

  it('pokazuje, co gracz ma, co może wziąć i co czeka dalej', () => {
    const save = unlocked(clearedFirst(11), ['attack_1', 'attack_2', 'speed_1']);
    const view = runeTreeView(content, save);
    // Jedenaście poziomów to świat pierwszy i pięć poziomów drugiego: cztery żetony.
    expect(view.tokens).toBe(1);
    const states = Object.fromEntries(
      view.branches.map(({ branch: entry, nodes }) => [
        entry.id,
        nodes.map((node) => node.state).slice(0, 4),
      ]),
    );
    expect(states).toEqual({
      hp: ['next', 'locked', 'locked', 'locked'],
      attack: ['owned', 'owned', 'next', 'locked'],
      knockback: ['next', 'locked', 'locked', 'locked'],
      speed: ['owned', 'next', 'locked', 'locked'],
    });
  });
});

describe('zmiana treści gry', () => {
  it('poziom, który przestał dawać żeton, nie zabiera runy, ale nie daje już nowej', () => {
    // Ta sama gra bez żetonu za drugi poziom: gracz z runą za tamten żeton ma zero do wydania.
    const levels = (rawContent.levels.world_1 as { id: string; rewards: object }[]).map((level) =>
      level.id === 'w1_l2' ? { ...level, rewards: { gold: 1 } } : level,
    );
    const changed = loadContent({
      ...rawContent,
      levels: { ...rawContent.levels, world_1: levels },
    }).content;
    if (changed === null) throw new Error('content');
    const save = unlocked(clearedFirst(2), ['hp_1']);
    expect(earnedTokens(changed, save)).toBe(0);
    expect(runeTokens(changed, save)).toBe(0);
    expect(save.runes).toEqual(['hp_1']);
  });
});
