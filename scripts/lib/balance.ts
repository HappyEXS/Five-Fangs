// Skrypt balansu poziomów (ADR 0025). Miarą jest złoto: przed każdym poziomem gracz zdobył
// określoną sumę nagród, a skład odniesienia (reference-plan.ts) pokazuje, co za nią ma. Poziom
// jest dobrze ustawiony, gdy ten skład wygrywa, a skład sprzed poprzedniej nagrody już nie.
// Bossowie i poziomy po zamknięciu rozwoju składu wymagają dodatkowo run: tych, które skład
// odniesienia odblokował w drzewku za żetony zdobyte wcześniej (reference-runes.ts, ADR 0026).
// Walka nie ma losowości (ADR 0002), więc jedna walka daje pełną odpowiedź.
import type { GameContent } from '../../src/content/load.ts';
import type { CompiledLevel, Rune } from '../../src/content/load-progression.ts';
import { levelSetup, type SquadMember } from '../../src/content/resolve-spec.ts';
import type { RuneStat } from '../../src/content/schema-progression.ts';
import { TICKS_PER_SECOND } from '../../src/core/units.ts';
import { type BattleSetup, createBattle, runBattleToEnd, TEAM_SIZE } from '../../src/sim/index.ts';
import { type PlannedSquad, type Reference, squadForGold, squadLabel } from './reference-plan.ts';
import { assignRunes, type Holders, runesForTokens, tokensBefore } from './reference-runes.ts';

export interface FightResult {
  readonly win: boolean;
  readonly reason: 'eliminated' | 'mutual' | 'timeout';
  readonly ticks: number;
  /** Procent początkowego życia, który został zwycięskiej stronie. */
  readonly remainingHpPercent: number;
}

export type Verdict = 'zgodny' | 'za łatwy' | 'za trudny';

export interface LevelReport {
  readonly level: string;
  /** Ostatni poziom świata. */
  readonly boss: boolean;
  /** Złoto z pierwszych przejść wszystkich wcześniejszych poziomów. */
  readonly goldBefore: number;
  /** Skład odniesienia przed tym poziomem, np. „5 × B2”. */
  readonly squad: string;
  /** Liczba run odblokowanych przed tym poziomem: tyle, ile żetonów gracz zdobył wcześniej. */
  readonly runes: number;
  /** Poziom wymaga run: boss albo poziom po tym, jak skład kupił już wszystko. */
  readonly needsRunes: boolean;
  /** Skład odniesienia bez run. */
  readonly plain: FightResult;
  /** Skład odniesienia z runami odblokowanymi wcześniej według jego planu. */
  readonly runed: FightResult;
  /** Skład sprzed poprzedniej nagrody, bez run; null na pierwszym poziomie gry. */
  readonly previous: FightResult | null;
  /** Najwcześniejszy poziom, przed którym złota wystarcza na wygraną bez run; null, gdy nigdy. */
  readonly enoughFrom: string | null;
  readonly verdict: Verdict;
}

/** Poziomy w kolejności gry. */
export function levelOrder(content: GameContent): CompiledLevel[] {
  const order: CompiledLevel[] = [];
  for (const world of content.worlds) {
    for (const levelId of world.levels) {
      const level = content.levels.get(levelId);
      if (level !== undefined) order.push(level);
    }
  }
  return order;
}

/** Złoto z pierwszych przejść zdobyte przed każdym poziomem; ostatni element to suma całej gry. */
export function goldBefore(content: GameContent): number[] {
  const sums = [0];
  for (const level of levelOrder(content)) sums.push((sums[sums.length - 1] ?? 0) + level.gold);
  return sums;
}

function totalHp(team: BattleSetup['player']): number {
  return team.reduce((sum, spec) => sum + (spec?.maxHp ?? 0), 0);
}

/**
 * Walka składu odniesienia z poziomem; `runes` to runy do rozdania składowi, `holders` zmienia,
 * komu idą runy danej statystyki (domyślnie rozdanie składu odniesienia).
 */
export function fightLevel(
  content: GameContent,
  level: CompiledLevel,
  squad: PlannedSquad,
  runes: readonly Rune[],
  holders: Partial<Record<RuneStat, Holders>> = {},
): FightResult {
  const given = assignRunes(content, squad, runes, holders);
  const members: (SquadMember | null)[] = Array.from({ length: TEAM_SIZE }, () => null);
  squad.members.forEach((member, index) => {
    const unit = content.heroes.get(member.form);
    if (unit === undefined) throw new Error(`Reference squad: unknown form "${member.form}"`);
    members[member.slot] = { unit, rank: member.upgrades, runes: given[index] ?? [] };
  });
  const setup = levelSetup(content, level, members);
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

function verdictOf(
  needsRunes: boolean,
  plain: FightResult,
  runed: FightResult,
  previous: FightResult | null,
): Verdict {
  if (needsRunes) {
    if (plain.win) return 'za łatwy';
    return runed.win ? 'zgodny' : 'za trudny';
  }
  if (!plain.win) return 'za trudny';
  return previous?.win === true ? 'za łatwy' : 'zgodny';
}

/** Raport dla wszystkich poziomów w kolejności gry. Wymaga poprawnego składu odniesienia. */
export function runBalance(content: GameContent, reference: Reference): LevelReport[] {
  const levels = levelOrder(content);
  const gold = goldBefore(content);
  const squads = gold.map((sum) => squadForGold(content, reference, sum));
  return levels.map((level, index) => {
    const squad = squads[index];
    if (squad === undefined) throw new Error(`No budget for level "${level.id}"`);
    const boss =
      level.index === (content.worlds.find((w) => w.id === level.world)?.levels.length ?? 0) - 1;
    const earlier = index === 0 ? undefined : squads[index - 1];
    const needsRunes = boss || earlier?.maxed === true;
    const runes = runesForTokens(content, [reference.runes], tokensBefore(levels, index));
    const plain = fightLevel(content, level, squad, []);
    const runed = fightLevel(content, level, squad, runes);
    const previous = earlier === undefined ? null : fightLevel(content, level, earlier, []);
    const enough = squads.findIndex((candidate) => fightLevel(content, level, candidate, []).win);
    return {
      level: level.id,
      boss,
      goldBefore: gold[index] ?? 0,
      squad: squadLabel(squad),
      runes: runes.length,
      needsRunes,
      plain,
      runed,
      previous,
      enoughFrom: enough === -1 ? null : (levels[enough]?.id ?? 'po grze'),
      verdict: verdictOf(needsRunes, plain, runed, previous),
    };
  });
}

export function resultText(result: FightResult | null): string {
  if (result === null) return '';
  const mark = result.win ? 'wygrana' : result.reason === 'timeout' ? 'limit czasu' : 'przegrana';
  return `${mark} ${(result.ticks / TICKS_PER_SECOND).toFixed(0)} s, ${result.remainingHpPercent}%`;
}

/** Tabela innych dróg przez drzewko run: nagłówki kolumn i wiersz na poziom wymagający run. */
export interface PathTable {
  readonly columns: readonly string[];
  readonly rows: readonly {
    readonly level: string;
    readonly tokens: number;
    readonly results: readonly (FightResult & { readonly holders: Holders | null })[];
  }[];
}

const HOLDER_NAMES: Readonly<Record<Holders, string>> = {
  front: 'od frontu',
  back: 'od tyłu',
  melee: 'walczącym wręcz',
  ranged: 'strzelcom',
};

/**
 * Raport w Markdown. Bez daty i wersji, żeby różnice między commitami pokazywały tylko zmiany
 * balansu. `paths` dopisuje porównanie dróg przez drzewko run (rune-paths.ts).
 */
export function formatBalanceReport(
  content: GameContent,
  reports: readonly LevelReport[],
  paths?: PathTable,
): string {
  const total = goldBefore(content).at(-1) ?? 0;
  const lines: string[] = [
    '# Raport balansu poziomów',
    '',
    'Wygenerowany przez `pnpm balance` (ADR 0025). Nie edytuj ręcznie.',
    '',
    `Złoto z pierwszych przejść całej gry: ${total}.`,
    '',
    'Skład odniesienia wydaje całe złoto zdobyte przed poziomem: najpierw kupuje brakujących bohaterów, potem rozwija wszystkich równo. Rangi w kolumnie „Skład” idą od frontu: litera to stopień formy na głównej drodze ewolucji (A forma bazowa, B pierwsza ewolucja, C druga), cyfra to liczba ulepszeń. Procent przy wyniku to życie, które zostało zwycięskiej stronie.',
    '',
    'Ocena zwykłego poziomu: skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody przegrywa. Ocena bossa i poziomów po zamknięciu rozwoju składu: bez run przegrana, z runami wygrana. Runy składu odniesienia to te, które odblokował w drzewku za żetony zdobyte wcześniej (ADR 0026); kolumna „Runy” podaje ich liczbę.',
    '',
    '| Poziom | Złoto przed | Skład | Runy | Bez run | Z runami | Skład sprzed nagrody | Bez run wystarcza złoto od | Ocena |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const report of reports) {
    lines.push(
      `| ${report.level}${report.boss ? ' (boss)' : ''} | ${report.goldBefore} | ${report.squad} | ${report.runes}${report.needsRunes ? ' (wymagane)' : ''} | ${resultText(report.plain)} | ${resultText(report.runed)} | ${resultText(report.previous)} | ${report.enoughFrom ?? 'nigdy'} | ${report.verdict} |`,
    );
  }
  if (paths !== undefined) {
    lines.push(
      '',
      '## Inne drogi przez drzewko run',
      '',
      'Ten sam skład na poziomach, które wymagają run, gdy żetony wyda inaczej niż plan odniesienia. „Najpierw” znaczy: cały kierunek do końca, potem plan odniesienia. Poziomy są strojone tylko do planu odniesienia; pozostałe kolumny pokazują, ile warte są inne wybory. Runy odrzutu i szybkości jednym bohaterom pomagają, innym szkodzą, a przekłada się je za darmo, więc te kolumny podają najlepsze z czterech rozdań i w nawiasie, komu runy poszły.',
      '',
      `| Poziom | Żetony | ${paths.columns.join(' | ')} |`,
      `|---|---|${paths.columns.map(() => '---').join('|')}|`,
    );
    for (const row of paths.rows) {
      lines.push(
        `| ${row.level} | ${row.tokens} | ${row.results
          .map((result) =>
            result.holders === null
              ? resultText(result)
              : `${resultText(result)} (${HOLDER_NAMES[result.holders]})`,
          )
          .join(' | ')} |`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}
