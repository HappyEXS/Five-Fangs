// Skrypt balansu poziomów (ADR 0025). Miarą jest złoto: przed każdym poziomem gracz zdobył
// określoną sumę nagród, a skład odniesienia (reference-plan.ts) pokazuje, co za nią ma. Poziom
// jest dobrze ustawiony, gdy ten skład wygrywa, a skład sprzed poprzedniej nagrody już nie.
// Bossowie i poziomy po zamknięciu rozwoju składu wymagają dodatkowo run zdobytych wcześniej.
// Walka nie ma losowości (ADR 0002), więc jedna walka daje pełną odpowiedź.
import type { GameContent } from '../../src/content/load.ts';
import type { CompiledLevel } from '../../src/content/load-progression.ts';
import { levelSetup, type SquadMember } from '../../src/content/resolve-spec.ts';
import type { Rune } from '../../src/content/schema-progression.ts';
import { TICKS_PER_SECOND } from '../../src/core/units.ts';
import { type BattleSetup, createBattle, runBattleToEnd, TEAM_SIZE } from '../../src/sim/index.ts';
import { type PlannedSquad, type Reference, squadForGold, squadLabel } from './reference-plan.ts';

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
  /** Liczba run zdobytych przed tym poziomem. */
  readonly runes: number;
  /** Poziom wymaga run: boss albo poziom po tym, jak skład kupił już wszystko. */
  readonly needsRunes: boolean;
  /** Skład odniesienia bez run. */
  readonly plain: FightResult;
  /** Skład odniesienia z runami zdobytymi wcześniej. */
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

/** Runy zdobyte przed poziomem o indeksie `index` w kolejności gry. */
export function earnedRunes(content: GameContent, index: number): Rune[] {
  const runes: Rune[] = [];
  for (const level of levelOrder(content).slice(0, index)) {
    const rune = level.rune === null ? undefined : content.runes.get(level.rune);
    if (rune !== undefined) runes.push(rune);
  }
  return runes;
}

/**
 * Rozdaje runy składowi odniesienia: runy życia od najmocniejszej idą po kolei od frontu, runy
 * ataku od tyłu; pełny bohater jest pomijany, a nadmiarowe runy zostają niewłożone. Zwraca runy
 * per bohater, w kolejności `squad.members`.
 */
export function assignRunes(
  squad: PlannedSquad,
  runes: readonly Rune[],
  runeSlots: number,
): Rune[][] {
  const given: Rune[][] = squad.members.map(() => []);
  const bySlot = squad.members.map((member, index) => ({ index, slot: member.slot }));
  const frontFirst = [...bySlot].sort((a, b) => a.slot - b.slot).map((entry) => entry.index);
  const deal = (stat: Rune['stat'], order: readonly number[]): void => {
    const sorted = runes.filter((rune) => rune.stat === stat).sort((a, b) => b.value - a.value);
    let cursor = 0;
    for (const rune of sorted) {
      let tries = 0;
      while (
        tries < order.length &&
        (given[order[cursor % order.length] ?? 0]?.length ?? 0) >= runeSlots
      ) {
        cursor++;
        tries++;
      }
      if (tries === order.length) return;
      given[order[cursor % order.length] ?? 0]?.push(rune);
      cursor++;
    }
  };
  deal('maxHp', frontFirst);
  deal('attack', [...frontFirst].reverse());
  return given;
}

function totalHp(team: BattleSetup['player']): number {
  return team.reduce((sum, spec) => sum + (spec?.maxHp ?? 0), 0);
}

/** Walka składu odniesienia z poziomem; `runes` to runy do rozdania składowi. */
export function fightLevel(
  content: GameContent,
  level: CompiledLevel,
  squad: PlannedSquad,
  runes: readonly Rune[],
): FightResult {
  const given = assignRunes(squad, runes, content.progression.runeSlots);
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
    const runes = earnedRunes(content, index);
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

function resultText(result: FightResult | null): string {
  if (result === null) return '';
  const mark = result.win ? 'wygrana' : result.reason === 'timeout' ? 'limit czasu' : 'przegrana';
  return `${mark} ${(result.ticks / TICKS_PER_SECOND).toFixed(0)} s, ${result.remainingHpPercent}%`;
}

/** Raport w Markdown. Bez daty i wersji, żeby różnice między commitami pokazywały tylko zmiany balansu. */
export function formatBalanceReport(content: GameContent, reports: readonly LevelReport[]): string {
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
    'Ocena zwykłego poziomu: skład odniesienia bez run wygrywa, a skład sprzed poprzedniej nagrody przegrywa. Ocena bossa i poziomów po zamknięciu rozwoju składu: bez run przegrana, z runami zdobytymi wcześniej wygrana.',
    '',
    '| Poziom | Złoto przed | Skład | Runy | Bez run | Z runami | Skład sprzed nagrody | Bez run wystarcza złoto od | Ocena |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const report of reports) {
    lines.push(
      `| ${report.level}${report.boss ? ' (boss)' : ''} | ${report.goldBefore} | ${report.squad} | ${report.runes}${report.needsRunes ? ' (wymagane)' : ''} | ${resultText(report.plain)} | ${resultText(report.runed)} | ${resultText(report.previous)} | ${report.enoughFrom ?? 'nigdy'} | ${report.verdict} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}
