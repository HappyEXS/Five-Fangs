// Pomiar balansu bohaterów (ADR 0024): pojedynki form tego samego stopnia, wartość formy
// w drużynie i walki drużyn szczepów. Wszystko liczy symulacja, bez ulepszeń i run, z obu stron
// pola, więc wynik zależy tylko od liczb w treści gry.
import type { GameContent } from '../../src/content/load.ts';
import { resolveUnitSpec } from '../../src/content/resolve-spec.ts';
import { type BattleResult, createBattle, runBattleToEnd } from '../../src/sim/index.ts';

/** Szczepy ludzi: z decyzji autora słabsze od szczepów ze szkiców. */
export const HUMAN_TRIBES: readonly string[] = ['swordsman', 'archer'];

/**
 * Drużyny pokazowe: cztery formy końcowe szczepu i jedna forma pierwszej ewolucji, od frontu.
 * `humans` to mieszana drużyna obu szczepów ludzi, taka, jaką gracz składa na początku gry.
 */
export const TRIBE_SQUADS: Readonly<Record<string, readonly string[]>> = {
  swordsman: ['guard_b', 'pavise_guard', 'swordsman_b2', 'berserker', 'swordsman_b'],
  archer: ['inquisitor', 'archer_b2', 'archer_b', 'hunter', 'cleric_b'],
  humans: ['guard_b', 'swordsman_b2', 'berserker', 'archer_b2', 'cleric_b'],
  beasts: ['tuskovator', 'ironbeak', 'reaper', 'spiker', 'ignitix'],
  immortals: ['enigmatix', 'xartix', 'guardian_of_hell', 'ultimus', 'polaris'],
  plants: ['oak_warrior', 'trunk', 'toxic_ivy', 'ice_ivy', 'mother_tree'],
  robots: ['titan_bot', 'ax_bot', 'whirl_bot', 'thermobot', 'egzo_bot'],
};
/** Drużyny ludzi i drużyny szczepów ze szkiców, w kolejności raportu. */
export const HUMAN_SQUADS: readonly string[] = ['swordsman', 'archer', 'humans'];
export const SKETCH_SQUADS: readonly string[] = ['beasts', 'immortals', 'plants', 'robots'];

/**
 * Trójki ludzi do pomiaru wartości w drużynie, po jednej na stopień: front, środek i tył.
 * Mierzona forma staje na środku zamiast formy środkowej.
 */
const REFERENCE_TRIOS: readonly (readonly [front: string, mid: string, back: string])[] = [
  ['swordsman_a', 'swordsman_a', 'archer_a'],
  ['guard_a', 'swordsman_b', 'archer_b'],
  ['guard_b', 'swordsman_b2', 'archer_b2'],
];

export type Squad = readonly string[];

/** Walka dwóch drużyn bohaterów: `player` po lewej, `enemy` po prawej, wszyscy z `upgrades`. */
export function squadBattle(
  content: GameContent,
  player: Squad,
  enemy: Squad,
  upgrades = 0,
): BattleResult {
  const side = (squad: Squad) => {
    const slots: (ReturnType<typeof resolveUnitSpec> | null)[] = squad.map((id) => {
      const unit = content.heroes.get(id);
      if (unit === undefined) throw new Error(`Unknown hero: ${id}`);
      return resolveUnitSpec(unit, upgrades, [], content.progression);
    });
    while (slots.length < content.arena.playerSlots.length) slots.push(null);
    return slots;
  };
  return runBattleToEnd(
    createBattle({ arena: content.arena, player: side(player), enemy: side(enemy) }),
  );
}

/**
 * Wynik pary z obu stron pola: 1, gdy `a` wygrywa jako gracz i jako przeciwnik, -1, gdy obie
 * walki przegrywa, 0 przy podziale. Limit czasu to przegrana gracza, więc dwie drużyny, które
 * nie umieją się przebić, dzielą wynik.
 */
export function versus(content: GameContent, a: Squad, b: Squad, upgrades = 0): -1 | 0 | 1 {
  const first = squadBattle(content, a, b, upgrades).outcome;
  const second = squadBattle(content, b, a, upgrades).outcome;
  if (first === 'win' && second === 'loss') return 1;
  if (first === 'loss' && second === 'win') return -1;
  return 0;
}

export interface FormRow {
  readonly unit: string;
  readonly tribe: string;
  readonly tier: number;
  /** Pojedynki z pozostałymi formami tego samego stopnia. */
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  /** Wartość w drużynie, patrz `teamValue`. */
  readonly teamValue: number;
}

/** Procent życia, który został drużynie na koniec walki. */
function remaining(
  content: GameContent,
  result: BattleResult,
  firstId: number,
  squad: Squad,
): number {
  let left = 0;
  let total = 0;
  squad.forEach((id, index) => {
    total += content.heroes.get(id)?.base.maxHp ?? 0;
    left += Math.max(0, result.finalHp[firstId + index] ?? 0);
  });
  return total === 0 ? 0 : (100 * left) / total;
}

/**
 * Wartość formy w drużynie: forma staje między tarczownikiem a strzelcem ludzi swojego stopnia
 * przeciw trójce ludzi tego stopnia. Wynik to różnica pozostałego życia obu stron w procentach,
 * średnia z obu stron pola: 0 ma forma środkowa trójki, więcej znaczy, że drużyna z mierzoną
 * formą wygrywa wyraźniej. Pojedynek nie pokazuje wartości leczenia ani strzelania zza pleców.
 */
export function teamValue(content: GameContent, unit: string, tier: number): number {
  const trio = REFERENCE_TRIOS[tier];
  if (trio === undefined) return 0;
  const [front, mid, back] = trio;
  const mine: Squad = [front, unit, back];
  const theirs: Squad = [front, mid, back];
  const enemyFrom = content.arena.playerSlots.length;
  const asPlayer = squadBattle(content, mine, theirs);
  const asEnemy = squadBattle(content, theirs, mine);
  const margin =
    remaining(content, asPlayer, 0, mine) -
    remaining(content, asPlayer, enemyFrom, theirs) +
    remaining(content, asEnemy, enemyFrom, mine) -
    remaining(content, asEnemy, 0, theirs);
  return Math.round(margin / 2);
}

/** Wiersz każdej formy bohatera, od formy bazowej, w kolejności szczepów z treści. */
export function formRows(content: GameContent): FormRow[] {
  const forms: { unit: string; tribe: string; tier: number }[] = [];
  for (const line of content.lines.values()) {
    for (const form of line.forms.values()) {
      forms.push({ unit: form.unit, tribe: line.id, tier: form.tier });
    }
  }
  return forms.map((form) => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (const other of forms) {
      if (other.tier !== form.tier || other.unit === form.unit) continue;
      const score = versus(content, [form.unit], [other.unit]);
      if (score > 0) wins++;
      else if (score < 0) losses++;
      else draws++;
    }
    return { ...form, wins, draws, losses, teamValue: teamValue(content, form.unit, form.tier) };
  });
}

/** Średni bilans pojedynków (wygrane minus przegrane) form szczepu na danym stopniu. */
export function tribeBalance(rows: readonly FormRow[], tribe: string, tier: number): number {
  const own = rows.filter((row) => row.tribe === tribe && row.tier === tier);
  if (own.length === 0) return 0;
  return own.reduce((sum, row) => sum + row.wins - row.losses, 0) / own.length;
}

export interface SquadCell {
  readonly outcome: 'win' | 'loss';
  readonly reason: BattleResult['reason'];
  readonly seconds: number;
}

/** Walka każdej drużyny pokazowej z każdą inną; wiersz gra po stronie gracza. */
export function squadMatrix(
  content: GameContent,
  upgrades: number,
): Record<string, Record<string, SquadCell>> {
  const matrix: Record<string, Record<string, SquadCell>> = {};
  for (const [a, squadA] of Object.entries(TRIBE_SQUADS)) {
    const row: Record<string, SquadCell> = {};
    for (const [b, squadB] of Object.entries(TRIBE_SQUADS)) {
      if (a === b) continue;
      const result = squadBattle(content, squadA, squadB, upgrades);
      row[b] = {
        outcome: result.outcome,
        reason: result.reason,
        seconds: Math.round(result.ticks / 30),
      };
    }
    matrix[a] = row;
  }
  return matrix;
}

const TIER_NAMES = ['Formy bazowe', 'Pierwsza ewolucja', 'Druga ewolucja'];

function cellText(cell: SquadCell | undefined): string {
  if (cell === undefined) return '·';
  const mark =
    cell.reason === 'timeout' ? 'limit' : cell.outcome === 'win' ? 'wygrana' : 'przegrana';
  return `${mark} ${cell.seconds} s`;
}

export interface ReportNames {
  /** Nazwa jednostki dla czytelnika raportu. */
  unit(id: string): string;
  /** Nazwa szczepu albo drużyny pokazowej. */
  tribe(id: string): string;
}

/** Raport Markdown; bez daty, żeby diff między commitami pokazywał tylko zmiany balansu. */
export function formatHeroReport(content: GameContent, names: ReportNames): string {
  const rows = formRows(content);
  const lines: string[] = [
    '# Balans bohaterów',
    '',
    'Wygenerowany przez `pnpm balance:heroes` (ADR 0024). Walki bez ulepszeń i run, każda para z obu stron pola.',
    '',
    '## Pojedynki form tego samego stopnia',
    '',
    '„W drużynie” to różnica pozostałego życia, gdy forma staje w trójce ludzi swojego stopnia przeciw takiej samej trójce (0 = forma ludzi z tej trójki).',
  ];
  for (const [tier, title] of TIER_NAMES.entries()) {
    const own = rows.filter((row) => row.tier === tier);
    if (own.length === 0) continue;
    own.sort((x, y) => y.wins - y.losses - (x.wins - x.losses) || y.teamValue - x.teamValue);
    lines.push(
      '',
      `### ${title}`,
      '',
      '| Forma | Szczep | Wygrane | Remisy | Przegrane | W drużynie |',
      '|---|---|---|---|---|---|',
    );
    for (const row of own) {
      lines.push(
        `| ${names.unit(row.unit)} | ${names.tribe(row.tribe)} | ${row.wins} | ${row.draws} | ${row.losses} | ${row.teamValue > 0 ? '+' : ''}${row.teamValue} |`,
      );
    }
    const tribes = [...new Set(own.map((row) => row.tribe))];
    lines.push(
      '',
      `Średni bilans (wygrane minus przegrane): ${tribes.map((tribe) => `${names.tribe(tribe)} ${tribeBalance(rows, tribe, tier).toFixed(1)}`).join(', ')}.`,
    );
  }
  const squads = Object.keys(TRIBE_SQUADS);
  for (const upgrades of [0, content.progression.maxUpgrades]) {
    const matrix = squadMatrix(content, upgrades);
    lines.push(
      '',
      `## Drużyny szczepów 5 na 5, ulepszenia: ${upgrades}`,
      '',
      'Wiersz gra po stronie gracza; „limit” to koniec czasu, czyli przegrana gracza.',
      '',
      `| Gracz \\ Przeciwnik | ${squads.map(names.tribe).join(' | ')} |`,
      `|---|${squads.map(() => '---').join('|')}|`,
    );
    for (const a of squads) {
      lines.push(
        `| ${names.tribe(a)} | ${squads.map((b) => cellText(matrix[a]?.[b])).join(' | ')} |`,
      );
    }
  }
  lines.push(
    '',
    '## Drużyny pokazowe',
    '',
    ...Object.entries(TRIBE_SQUADS).map(
      ([tribe, squad]) => `- ${names.tribe(tribe)}: ${squad.map(names.unit).join(', ')}`,
    ),
    '',
  );
  return lines.join('\n');
}
