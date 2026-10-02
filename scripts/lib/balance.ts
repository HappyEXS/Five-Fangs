// Skrypt balansu: dla każdego poziomu rozgrywa walkę składu referencyjnego na każdej randze
// i porównuje najniższą wygrywającą rangę z oczekiwaną. Walka nie ma losowości (ADR 0002),
// więc jedna walka na rangę daje pełną odpowiedź.
import { z } from 'zod';
import type { ContentIssue } from '../../src/content/issues.ts';
import type { GameContent } from '../../src/content/load.ts';
import { levelSetup, type SquadMember } from '../../src/content/resolve-spec.ts';
import { TICKS_PER_SECOND } from '../../src/core/units.ts';
import { type BattleSetup, createBattle, runBattleToEnd, TEAM_SIZE } from '../../src/sim/index.ts';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);

export const referenceSchema = z.strictObject({
  /** Składy referencyjne: linie bohaterów na slotach. Wszyscy członkowie mają tę samą rangę. */
  squads: z.array(
    z.strictObject({
      id,
      members: z
        .array(z.strictObject({ slot: z.number().int().min(0).max(4), line: id }))
        .min(1)
        .max(5),
    }),
  ),
  /** Dla każdego poziomu: skład i ranga, przy której poziom ma być do przejścia. */
  levels: z.record(id, z.strictObject({ squad: id, expectedRank: z.number().int().nonnegative() })),
});

export type Reference = z.infer<typeof referenceSchema>;

/** Liczba rang jednej linii: ulepszenia formy bazowej, potem formy po ewolucji. */
export function rankCount(content: GameContent): number {
  return 2 * (content.progression.maxUpgrades + 1);
}

/** Etykieta rangi: A0..A4 dla formy bazowej, B0..B4 dla formy po ewolucji. */
export function rankLabel(content: GameContent, rank: number): string {
  const perForm = content.progression.maxUpgrades + 1;
  return `${rank < perForm ? 'A' : 'B'}${rank % perForm}`;
}

export function validateReference(content: GameContent, reference: Reference): ContentIssue[] {
  const source = 'balance/reference-squads.json';
  const issues: ContentIssue[] = [];
  const squadIds = new Set<string>();
  for (const squad of reference.squads) {
    if (squadIds.has(squad.id)) issues.push({ source, message: `powtórzone id "${squad.id}"` });
    squadIds.add(squad.id);
    const slots = new Set<number>();
    for (const member of squad.members) {
      if (slots.has(member.slot)) {
        issues.push({ source, message: `${squad.id}: slot ${member.slot} użyty więcej niż raz` });
      }
      slots.add(member.slot);
      if (!content.lines.has(member.line)) {
        issues.push({ source, message: `${squad.id}: nieznana linia "${member.line}"` });
      }
    }
  }
  for (const [levelId, entry] of Object.entries(reference.levels)) {
    if (!content.levels.has(levelId)) {
      issues.push({ source, message: `nieznany poziom "${levelId}"` });
    }
    if (!squadIds.has(entry.squad)) {
      issues.push({ source, message: `${levelId}: nieznany skład "${entry.squad}"` });
    }
    if (entry.expectedRank >= rankCount(content)) {
      issues.push({ source, message: `${levelId}: ranga ${entry.expectedRank} poza zakresem` });
    }
  }
  for (const levelId of content.levels.keys()) {
    if (reference.levels[levelId] === undefined) {
      issues.push({ source, message: `brak składu referencyjnego dla poziomu "${levelId}"` });
    }
  }
  return issues;
}

export interface RankResult {
  readonly win: boolean;
  readonly reason: 'eliminated' | 'mutual' | 'timeout';
  readonly ticks: number;
  /** Procent początkowego HP, który został zwycięskiej stronie (gracza przy wygranej, wrogów przy przegranej). */
  readonly remainingHpPercent: number;
}

export interface LevelReport {
  readonly level: string;
  readonly squad: string;
  readonly expectedRank: number;
  /** Najniższa ranga, na której skład wygrywa, albo null. */
  readonly minWinningRank: number | null;
  readonly verdict: 'zgodny' | 'za łatwy' | 'za trudny';
  /** Wynik dla każdej rangi, indeks = ranga. */
  readonly ranks: readonly RankResult[];
}

function squadAtRank(
  content: GameContent,
  squad: Reference['squads'][number],
  rank: number,
): (SquadMember | null)[] {
  const perForm = content.progression.maxUpgrades + 1;
  const members: (SquadMember | null)[] = [null, null, null, null, null];
  for (const member of squad.members) {
    const formId = content.lines.get(member.line)?.forms[rank < perForm ? 0 : 1];
    const unit = formId === undefined ? undefined : content.heroes.get(formId);
    if (unit === undefined)
      throw new Error(`Reference squad "${squad.id}": bad line "${member.line}"`);
    members[member.slot] = { unit, rank: rank % perForm, runes: [] };
  }
  return members;
}

function totalHp(team: BattleSetup['player']): number {
  return team.reduce((sum, spec) => sum + (spec?.maxHp ?? 0), 0);
}

function fight(setup: BattleSetup): RankResult {
  const result = runBattleToEnd(createBattle(setup));
  const win = result.outcome === 'win';
  const first = win ? 0 : TEAM_SIZE;
  let remaining = 0;
  for (let i = first; i < first + TEAM_SIZE; i++) remaining += Math.max(0, result.finalHp[i] ?? 0);
  const initial = totalHp(win ? setup.player : setup.enemy);
  // Zwycięzca z resztką zdrowia ma pokazać co najmniej 1%, żeby nie wyglądał na martwego.
  const percent = initial === 0 ? 0 : Math.round((remaining / initial) * 100);
  return {
    win,
    reason: result.reason,
    ticks: result.ticks,
    remainingHpPercent: remaining > 0 && percent === 0 ? 1 : percent,
  };
}

/** Raport dla wszystkich poziomów w kolejności światów. Wymaga poprawnych składów referencyjnych. */
export function runBalance(content: GameContent, reference: Reference): LevelReport[] {
  const reports: LevelReport[] = [];
  for (const world of content.worlds) {
    for (const levelId of world.levels) {
      const level = content.levels.get(levelId);
      const entry = reference.levels[levelId];
      const squad = reference.squads.find((s) => s.id === entry?.squad);
      if (level === undefined || entry === undefined || squad === undefined) {
        throw new Error(`No reference squad for level "${levelId}"`);
      }
      const ranks: RankResult[] = [];
      for (let rank = 0; rank < rankCount(content); rank++) {
        ranks.push(fight(levelSetup(content, level, squadAtRank(content, squad, rank))));
      }
      const firstWin = ranks.findIndex((r) => r.win);
      const minWinningRank = firstWin === -1 ? null : firstWin;
      reports.push({
        level: levelId,
        squad: squad.id,
        expectedRank: entry.expectedRank,
        minWinningRank,
        verdict:
          minWinningRank === null || minWinningRank > entry.expectedRank
            ? 'za trudny'
            : minWinningRank < entry.expectedRank
              ? 'za łatwy'
              : 'zgodny',
        ranks,
      });
    }
  }
  return reports;
}

const seconds = (ticks: number): string => `${(ticks / TICKS_PER_SECOND).toFixed(1)} s`;

function outcomeText(result: RankResult): string {
  if (result.win) return 'wygrana';
  return result.reason === 'timeout' ? 'limit czasu' : 'przegrana';
}

/** Raport w Markdown. Bez daty i wersji, żeby różnice między commitami pokazywały tylko zmiany balansu. */
export function formatBalanceReport(content: GameContent, reports: readonly LevelReport[]): string {
  const label = (rank: number | null): string =>
    rank === null ? 'brak' : rankLabel(content, rank);
  const lines: string[] = [
    '# Raport balansu',
    '',
    'Wygenerowany przez `pnpm balance`. Nie edytuj ręcznie.',
    '',
    'Ranga składu referencyjnego: A0–A4 to kolejne ulepszenia formy bazowej, B0–B4 formy po ewolucji; wszyscy członkowie składu mają tę samą rangę, bez run. Walka nie ma losowości, więc każdy wynik to jedna walka.',
    '',
    '## Podsumowanie',
    '',
    '| Poziom | Skład | Ranga oczekiwana | Najniższa wygrywająca | Ocena | Przy oczekiwanej | Czas | Zostało HP |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const report of reports) {
    const expected = report.ranks[report.expectedRank];
    lines.push(
      `| ${report.level} | ${report.squad} | ${label(report.expectedRank)} | ${label(report.minWinningRank)} | ${report.verdict} | ${expected === undefined ? '' : outcomeText(expected)} | ${expected === undefined ? '' : seconds(expected.ticks)} | ${expected === undefined ? '' : `${expected.remainingHpPercent}%`} |`,
    );
  }

  const rankHeaders = reports[0]?.ranks.map((_, rank) => label(rank)) ?? [];
  lines.push(
    '',
    '## Wynik na każdej randze',
    '',
    'W: wygrana, P: przegrana, T: limit czasu. Procent to HP, które zostało zwycięskiej stronie.',
    '',
    `| Poziom | ${rankHeaders.join(' | ')} |`,
    `|---|${rankHeaders.map(() => '---').join('|')}|`,
  );
  for (const report of reports) {
    const cells = report.ranks.map((r) => {
      const mark = r.win ? 'W' : r.reason === 'timeout' ? 'T' : 'P';
      return `${mark} ${r.remainingHpPercent}%`;
    });
    lines.push(`| ${report.level} | ${cells.join(' | ')} |`);
  }
  return `${lines.join('\n')}\n`;
}
