import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import { fightLevel, formatBalanceReport, goldBefore, levelOrder, runBalance } from './balance.ts';
import {
  purchaseOrder,
  type Reference,
  rankLabel,
  squadForGold,
  squadLabel,
  validateReference,
} from './reference-plan.ts';
import { runesForTokens, tokensBefore } from './reference-runes.ts';
import { loadReference } from './reference-squads.ts';
import { runePaths, runPaths } from './rune-paths.ts';

const content = requireContent();
const loaded = loadReference(content);
const reference: Reference = loaded.reference ?? { squad: [], runes: ['hp'] };

/** Problemy składu; plan run, o ile test go nie podaje, jest taki jak w grze. */
const messages = (candidate: Pick<Reference, 'squad'> & Partial<Reference>) =>
  validateReference(content, { runes: ['hp', 'attack'], ...candidate }).map(
    (issue) => issue.message,
  );

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
    // Żetony run idą na zmianę w życie i atak.
    expect(reference.runes).toEqual(['hp', 'attack']);
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

  it('odrzuca plan run z kierunkiem, którego nie ma w drzewku', () => {
    const squad = reference.squad;
    expect(messages({ squad, runes: ['hp', 'magia'] })).toEqual([
      'nieznany kierunek drzewka run "magia"',
    ]);
    // Skład bez planu run nie przechodzi schematu.
    expect(loadReference(content, { squad }).reference).toBeNull();
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
    // Przed bossem pierwszego świata gracz ma dwa żetony: runę życia i runę ataku.
    const runes = runesForTokens(content, [reference.runes], tokensBefore(levels, 5));
    expect(runes.map((rune) => rune.id)).toEqual(['hp_1', 'attack_1']);
    expect(report.runes).toBe(2);
    expect(fightLevel(content, level, squad, runes)).toEqual(report.runed);
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
    expect(text).not.toContain('Inne drogi');
  });

  it('raport z tabelą dróg dopisuje wiersz na każdy poziom wymagający run', () => {
    const rows = runPaths(content, reference, reports);
    const columns = runePaths(content, reference).map((path) => path.id);
    const text = formatBalanceReport(content, reports, { columns, rows });
    expect(text).toContain('## Inne drogi przez drzewko run');
    expect(text).toContain(
      '| Poziom | Żetony | reference | hp | attack | knockback | speed | all |',
    );
    const table = text.slice(text.indexOf('## Inne drogi'));
    expect(table.split('\n').filter((line) => line.startsWith('| w')).length).toBe(rows.length);
    // Droga w odrzut albo szybkość podaje, komu runy poszły.
    expect(table).toMatch(/\((od frontu|od tyłu|walczącym wręcz|strzelcom)\) \|/);
  });
});
