import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import type { Rune } from '../../src/content/schema-progression.ts';
import {
  assignRunes,
  earnedRunes,
  fightLevel,
  formatBalanceReport,
  goldBefore,
  levelOrder,
  runBalance,
} from './balance.ts';
import {
  purchaseOrder,
  type Reference,
  rankLabel,
  squadForGold,
  squadLabel,
  validateReference,
} from './reference-plan.ts';
import { loadReference } from './reference-squads.ts';

const content = requireContent();
const loaded = loadReference(content);
const reference: Reference = loaded.reference ?? { squad: [] };

const messages = (candidate: Reference) =>
  validateReference(content, candidate).map((issue) => issue.message);

describe('skład odniesienia gry', () => {
  it('jest poprawny: bohaterowie startowi, potem trzej kupieni, każdy na swoim slocie', () => {
    expect(loaded.issues).toEqual([]);
    expect(reference.squad.map((member) => member.line)).toEqual([
      'swordsman',
      'archer',
      'robots',
      'beasts',
      'immortals',
    ]);
    expect(new Set(reference.squad.map((member) => member.slot)).size).toBe(5);
  });

  it('błąd schematu zwraca problem zamiast składu', () => {
    const broken = loadReference(content, { squad: 'oops' });
    expect(broken.reference).toBeNull();
    expect(broken.issues.length).toBeGreaterThan(0);
  });

  it('odrzuca powtórzony slot, nieznaną linię, złą kolejność i drogę spoza drzewa', () => {
    expect(
      messages({
        squad: [
          { slot: 0, line: 'swordsman' },
          { slot: 0, line: 'archer' },
        ],
      }),
    ).toEqual(['slot 0 użyty więcej niż raz']);
    expect(
      messages({
        squad: [
          { slot: 0, line: 'swordsman' },
          { slot: 1, line: 'archer' },
          { slot: 2, line: 'smoki' },
        ],
      }),
    ).toEqual(['nieznana linia "smoki"']);
    expect(
      messages({
        squad: [
          { slot: 0, line: 'beasts' },
          { slot: 1, line: 'archer' },
        ],
      }),
    ).toEqual(['bohater 1 składu musi być linią startową "swordsman" (jest "beasts")']);
    expect(messages({ squad: [{ slot: 0, line: 'swordsman' }] })).toEqual([
      'skład musi zawierać wszystkie linie startowe',
    ]);
    expect(
      messages({
        squad: [
          { slot: 0, line: 'swordsman' },
          { slot: 1, line: 'archer' },
          { slot: 2, line: 'beasts', via: ['tuskovator'] },
        ],
      }),
    ).toEqual(['beasts: forma "tuskovator" nie powstaje z "monstrosity"']);
  });
});

describe('plan zakupów', () => {
  const steps = purchaseOrder(content, reference);

  it('najpierw trzej brakujący bohaterowie, potem równy rozwój całej piątki', () => {
    expect(steps.slice(0, 3).map((step) => [step.kind, step.cost])).toEqual([
      ['buy', 200],
      ['buy', 200],
      ['buy', 200],
    ]);
    // Po zakupach: po jednym ulepszeniu każdemu, cztery razy, a potem ewolucja każdego.
    expect(steps.slice(3, 8).map((step) => [step.member, step.kind, step.cost])).toEqual([
      [0, 'upgrade', 50],
      [1, 'upgrade', 50],
      [2, 'upgrade', 50],
      [3, 'upgrade', 50],
      [4, 'upgrade', 50],
    ]);
    expect(steps.slice(23, 28).map((step) => [step.kind, step.cost])).toEqual(
      Array.from({ length: 5 }, () => ['evolve', 400]),
    );
    // Trzech kupionych bohaterów i pięć pełnych dróg rozwoju.
    expect(steps.reduce((sum, step) => sum + step.cost, 0)).toBe(600 + 5 * 6200);
  });

  it('skład za daną sumę złota: kupuje po kolei i staje na pierwszym kroku, na który nie stać', () => {
    expect(squadLabel(squadForGold(content, reference, 0))).toBe('2 × A0');
    expect(squadLabel(squadForGold(content, reference, 199))).toBe('2 × A0');
    expect(squadForGold(content, reference, 200).members.map((member) => member.line)).toEqual([
      'swordsman',
      'archer',
      'robots',
    ]);
    expect(squadLabel(squadForGold(content, reference, 600))).toBe('5 × A0');
    // 50 złota ponad pięciu bohaterów to jedno ulepszenie pierwszego z nich (slot 0).
    const partial = squadForGold(content, reference, 650);
    expect(squadLabel(partial)).toBe('A1 A0 A0 A0 A0');
    expect(partial.spent).toBe(650);
    expect(squadLabel(squadForGold(content, reference, 1600))).toBe('5 × A4');
    expect(squadLabel(squadForGold(content, reference, 3600))).toBe('5 × B0');
  });

  it('idzie drogą ewolucji podaną w składzie, a bez niej główną drogą linii', () => {
    const full = squadForGold(content, reference, 100_000);
    expect(full.maxed).toBe(true);
    expect(full.spent).toBe(31_600);
    expect(Object.fromEntries(full.members.map((member) => [member.line, member.form]))).toEqual({
      swordsman: 'swordsman_b2',
      archer: 'archer_b2',
      robots: 'thermobot',
      beasts: 'tuskovator',
      immortals: 'polaris',
    });
    expect(full.members.map(rankLabel)).toEqual(['C4', 'C4', 'C4', 'C4', 'C4']);
    expect(squadForGold(content, reference, 31_599).maxed).toBe(false);
  });
});

describe('runy składu odniesienia', () => {
  const rune = (id: string): Rune => {
    const found = content.runes.get(id);
    if (found === undefined) throw new Error(id);
    return found;
  };

  it('zdobyte runy to nagrody wcześniejszych poziomów, w kolejności gry', () => {
    expect(earnedRunes(content, 0)).toEqual([]);
    expect(earnedRunes(content, 2)).toEqual([]);
    // Pierwsza runa jest nagrodą trzeciego poziomu.
    expect(earnedRunes(content, 3).map((entry) => entry.id)).toEqual(['rune_hp_100']);
    expect(earnedRunes(content, 36)).toHaveLength(12);
  });

  it('życie idzie od frontu, atak od tyłu, najmocniejsze pierwsze; nadmiar zostaje', () => {
    const squad = squadForGold(content, reference, 600);
    const bySlot = (given: Rune[][]) =>
      Object.fromEntries(
        squad.members.map((member, index) => [member.slot, given[index]?.map((r) => r.id)]),
      );
    const some = [rune('rune_hp_100'), rune('rune_attack_10'), rune('rune_hp_200')];
    expect(bySlot(assignRunes(squad, some, 2))).toEqual({
      0: ['rune_hp_200'],
      1: ['rune_hp_100'],
      2: [],
      3: [],
      4: ['rune_attack_10'],
    });
    // Jedenaście run na dziesięć gniazd: każdy bohater ma dwie, najsłabsza zostaje.
    const many = [
      ...Array.from({ length: 6 }, () => rune('rune_hp_100')),
      ...Array.from({ length: 5 }, () => rune('rune_attack_10')),
    ];
    const given = assignRunes(squad, many, 2);
    expect(given.every((list) => list.length === 2)).toBe(true);
    // Dwóch bohaterów nie dostaje więcej, niż mają gniazd.
    const duo = squadForGold(content, reference, 0);
    expect(assignRunes(duo, many, 2).map((list) => list.length)).toEqual([2, 2]);
  });
});

describe('runBalance', () => {
  const reports = runBalance(content, reference);
  const levels = levelOrder(content);

  it('raportuje każdy poziom w kolejności gry, ze złotem zdobytym wcześniej', () => {
    expect(reports.map((report) => report.level)).toEqual(levels.map((level) => level.id));
    const gold = goldBefore(content);
    expect(gold).toHaveLength(37);
    expect(reports.map((report) => report.goldBefore)).toEqual(gold.slice(0, 36));
    expect(reports[0]).toMatchObject({ goldBefore: 0, squad: '2 × A0', previous: null });
  });

  it('boss to ostatni poziom świata i zawsze wymaga run; zwykły poziom dopiero po komplecie składu', () => {
    expect(reports.filter((report) => report.boss).map((report) => report.level)).toEqual(
      content.worlds.map((world) => world.levels.at(-1)),
    );
    for (const report of reports) {
      if (report.boss) expect(report.needsRunes, report.level).toBe(true);
    }
    const index = reports.findIndex((report) => !report.boss && report.needsRunes);
    // Zwykły poziom wymaga run dopiero wtedy, gdy już skład sprzed nagrody kupił wszystko.
    expect(squadForGold(content, reference, reports[index - 1]?.goldBefore ?? 0).maxed).toBe(true);
  });

  it('wynik bez run i z runami pochodzi z tej samej walki co ręczne wywołanie', () => {
    const level = levels[5];
    const report = reports[5];
    if (level === undefined || report === undefined) throw new Error('no level');
    const squad = squadForGold(content, reference, report.goldBefore);
    expect(fightLevel(content, level, squad, [])).toEqual(report.plain);
    expect(fightLevel(content, level, squad, earnedRunes(content, 5))).toEqual(report.runed);
  });

  it('jest deterministyczny', () => {
    expect(runBalance(content, reference)).toEqual(reports);
  });

  it('raport Markdown ma wiersz na poziom, bez daty', () => {
    const text = formatBalanceReport(content, reports);
    expect(text).toContain('# Raport balansu poziomów');
    expect(text).toContain('| w1_l1 | 0 | 2 × A0 |');
    expect(text).toContain('w6_l6 (boss)');
    expect(text.split('\n').filter((line) => line.startsWith('| w')).length).toBe(36);
    expect(text).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});
