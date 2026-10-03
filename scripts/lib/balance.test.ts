import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import {
  formatBalanceReport,
  type Reference,
  rankCount,
  rankLabel,
  runBalance,
  validateReference,
} from './balance.ts';
import { loadReference } from './reference-squads.ts';

const content = requireContent();

const starter = {
  id: 'starter',
  members: [
    { slot: 0, line: 'swordsman' },
    { slot: 1, line: 'archer' },
  ],
};

/** Składy referencyjne dla wszystkich poziomów gry z tą samą rangą oczekiwaną. */
function referenceWith(expectedRank: number): Reference {
  const levels: Reference['levels'] = {};
  for (const id of content.levels.keys()) levels[id] = { squad: 'starter', expectedRank };
  return { squads: [starter], levels };
}

const messages = (reference: Reference) =>
  validateReference(content, reference).map((i) => i.message);

describe('rangi', () => {
  it('po pięć rang na każdy stopień głównej drogi ewolucji: A forma bazowa, B i C ewolucje', () => {
    expect(rankCount(content)).toBe(15);
    expect([0, 4, 5, 9, 10, 14].map((rank) => rankLabel(content, rank))).toEqual([
      'A0',
      'A4',
      'B0',
      'B4',
      'C0',
      'C4',
    ]);
  });
});

describe('składy referencyjne gry', () => {
  it('są poprawne i obejmują każdy poziom', () => {
    const { reference, issues } = loadReference(content);
    expect(issues).toEqual([]);
    expect(Object.keys(reference?.levels ?? {}).sort()).toEqual([...content.levels.keys()].sort());
  });

  it('błąd schematu zwraca problem zamiast składów', () => {
    const { reference, issues } = loadReference(content, { squads: 'oops' });
    expect(reference).toBeNull();
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe('validateReference', () => {
  it('wykrywa nieznaną linię, powtórzony slot i powtórzone id składu', () => {
    const bad = referenceWith(0);
    bad.squads = [
      starter,
      {
        id: 'starter',
        members: [
          { slot: 0, line: 'ghost' },
          { slot: 0, line: 'archer' },
        ],
      },
    ];
    expect(messages(bad)).toEqual([
      'powtórzone id "starter"',
      'starter: nieznana linia "ghost"',
      'starter: slot 0 użyty więcej niż raz',
    ]);
  });

  it('wykrywa nieznany poziom, nieznany skład, rangę poza zakresem i brakujący poziom', () => {
    const bad = referenceWith(0);
    delete bad.levels.w1_l6;
    bad.levels.w9_l9 = { squad: 'starter', expectedRank: 0 };
    bad.levels.w1_l1 = { squad: 'elite', expectedRank: 15 };
    expect(messages(bad).sort()).toEqual(
      [
        'nieznany poziom "w9_l9"',
        'w1_l1: nieznany skład "elite"',
        'w1_l1: ranga 15 poza zakresem',
        'brak składu referencyjnego dla poziomu "w1_l6"',
      ].sort(),
    );
  });
});

describe('runBalance', () => {
  const reports = runBalance(content, referenceWith(4));

  it('rozgrywa każdy poziom na każdej randze, w kolejności światów', () => {
    expect(reports.map((r) => r.level)).toEqual(content.worlds.flatMap((w) => w.levels));
    for (const report of reports) expect(report.ranks).toHaveLength(15);
  });

  it('najniższa wygrywająca ranga to pierwsza wygrana na liście', () => {
    for (const report of reports) {
      const first = report.ranks.findIndex((r) => r.win);
      expect(report.minWinningRank).toBe(first === -1 ? null : first);
    }
  });

  it('ocenia poziom względem rangi oczekiwanej', () => {
    for (const report of reports) {
      const min = report.minWinningRank;
      const expected = min === null || min > 4 ? 'za trudny' : min < 4 ? 'za łatwy' : 'zgodny';
      expect(report.verdict).toBe(expected);
    }
    // Pierwszy poziom testowy da się przejść bez ulepszeń, ostatni dopiero po ewolucji.
    expect(reports[0]?.verdict).toBe('za łatwy');
    expect(reports.at(-1)?.verdict).toBe('za trudny');
  });

  it('procent pozostałego HP mieści się w 0..100, a zwycięzca ma co najmniej 1', () => {
    for (const result of reports.flatMap((r) => r.ranks)) {
      expect(result.remainingHpPercent).toBeGreaterThanOrEqual(result.win ? 1 : 0);
      expect(result.remainingHpPercent).toBeLessThanOrEqual(100);
      expect(result.ticks).toBeGreaterThan(0);
    }
  });

  it('jest powtarzalny', () => {
    expect(runBalance(content, referenceWith(4))).toEqual(reports);
  });

  it('rzuca błąd, gdy poziom nie ma składu', () => {
    const missing = referenceWith(0);
    delete missing.levels.w1_l1;
    expect(() => runBalance(content, missing)).toThrow(/w1_l1/);
  });
});

describe('formatBalanceReport', () => {
  it('zawiera wiersz podsumowania i wiersz rang dla każdego poziomu', () => {
    const reports = runBalance(content, referenceWith(4));
    const text = formatBalanceReport(content, reports);
    expect(text).toContain('# Raport balansu');
    expect(text).toContain('| Poziom | A0 | A1 | A2 | A3 | A4 | B0 | B1 | B2 | B3 | B4 |');
    for (const report of reports) {
      expect(
        text.split('\n').filter((line) => line.startsWith(`| ${report.level} |`)),
      ).toHaveLength(2);
    }
    expect(text).toMatch(/\| w1_l1 \| starter \| A4 \| A0 \| za łatwy \| wygrana \|/);
    expect(text.endsWith('\n')).toBe(true);
    // Bez daty ani wersji: raport ma się zmieniać tylko razem z balansem.
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
