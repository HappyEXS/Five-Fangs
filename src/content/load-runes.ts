// Drzewko run (ADR 0026): kilka kierunków, w każdym kolejne runy jednej statystyki, coraz
// mocniejsze. Gracz odblokowuje runy żetonami, zawsze następną w wybranym kierunku. Kompilacja
// nadaje runom id, przelicza premie na jednostki symulacji i sprawdza, że kierunek naprawdę
// rośnie.
import { SUBUNITS_PER_UNIT, TICKS_PER_SECOND, unitsToSubunits } from '../core/units.ts';
import type { ContentIssue } from './issues.ts';
import { indexById } from './parse.ts';
import type { RawRuneTree, RuneStat } from './schema-progression.ts';

export interface Rune {
  /** Id kierunku i numer runy w nim, od 1: `hp_3`. */
  readonly id: string;
  /** Id kierunku drzewka. */
  readonly branch: string;
  /** Miejsce w kierunku, od 0. */
  readonly depth: number;
  readonly stat: RuneStat;
  /** Premia w jednostkach dla gracza: punkty, jednostki świata, jednostki świata na sekundę. */
  readonly value: number;
  /** Ta sama premia w jednostkach symulacji: punkty, podjednostki, podjednostki na tick. */
  readonly bonus: number;
}

export interface RuneBranch {
  readonly id: string;
  readonly stat: RuneStat;
  /** Runy kierunku w kolejności odblokowywania. */
  readonly runes: readonly Rune[];
}

export interface RuneTree {
  readonly branches: readonly RuneBranch[];
  readonly runes: ReadonlyMap<string, Rune>;
}

const SOURCE = 'runes.json';

/** Premia w jednostkach symulacji albo null, gdy wartości nie da się przeliczyć dokładnie. */
function simBonus(stat: RuneStat, value: number): number | null {
  switch (stat) {
    case 'maxHp':
    case 'attack':
      return value;
    case 'knockback':
      return unitsToSubunits(value);
    case 'moveSpeed': {
      // Krok bohatera i krok runy zaokrąglają się osobno, więc suma mogłaby pokazać graczowi
      // „49,9” zamiast „50”. Runa szybkości musi dawać pełny krok na tick.
      const perSecond = value * SUBUNITS_PER_UNIT;
      return perSecond % TICKS_PER_SECOND === 0 ? perSecond / TICKS_PER_SECOND : null;
    }
  }
}

/** Kompiluje drzewko run. Kierunek z błędem jest pomijany, a problem dopisany do `issues`. */
export function compileRuneTree(raw: RawRuneTree, issues: ContentIssue[]): RuneTree {
  const problem = (message: string): void => {
    issues.push({ source: SOURCE, message });
  };
  const branches: RuneBranch[] = [];
  const runes = new Map<string, Rune>();
  const stats = new Set<RuneStat>();
  for (const branch of indexById(SOURCE, raw.branches, new Set(), issues).values()) {
    // Jedna statystyka to jeden kierunek: kolor i nazwa runy mówią graczowi, dokąd należy.
    if (stats.has(branch.stat)) {
      problem(`${branch.id}: statystyka "${branch.stat}" ma już swój kierunek`);
      continue;
    }
    stats.add(branch.stat);
    const list: Rune[] = [];
    let valid = true;
    branch.values.forEach((value, depth) => {
      const previous = branch.values[depth - 1];
      if (previous !== undefined && value <= previous) {
        problem(
          `${branch.id}: runa ${depth + 1} (${value}) musi być mocniejsza od poprzedniej (${previous})`,
        );
        valid = false;
      }
      const bonus = simBonus(branch.stat, value);
      if (bonus === null) {
        const exact = TICKS_PER_SECOND / gcd(SUBUNITS_PER_UNIT, TICKS_PER_SECOND);
        problem(
          `${branch.id}: runa ${depth + 1} (${value}) nie daje pełnego kroku na tick; szybkość musi być wielokrotnością ${exact}`,
        );
        valid = false;
        return;
      }
      list.push({
        id: `${branch.id}_${depth + 1}`,
        branch: branch.id,
        depth,
        stat: branch.stat,
        value,
        bonus,
      });
    });
    if (!valid) continue;
    for (const rune of list) {
      if (runes.has(rune.id)) {
        problem(`powtórzone id runy "${rune.id}"`);
        valid = false;
      }
    }
    if (!valid) continue;
    for (const rune of list) runes.set(rune.id, rune);
    branches.push({ id: branch.id, stat: branch.stat, runes: list });
  }
  return { branches, runes };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
