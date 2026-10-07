// Wczytanie szczepów wrogów ze sprawdzeniem odwołań do jednostek.
import type { CompiledUnit } from './compile.ts';
import type { ContentIssue } from './issues.ts';
import { indexById, parse } from './parse.ts';
import { enemyTribesSchema } from './schema-tribes.ts';

const SOURCE = 'enemy-tribes.json';

export interface TribeMember {
  /** Id jednostki z units/enemies.json. */
  readonly unit: string;
  /** Id stopnia w szczepie; nazwa to tekst `rank.<id>`. */
  readonly rank: string;
}

export interface CompiledEnemyTribe {
  readonly id: string;
  /** Wszystkie postacie szczepu w kolejności siły, od najsłabszej. */
  readonly members: readonly TribeMember[];
}

/**
 * Waliduje i spłaszcza szczepy wrogów. Każda jednostka musi być jednostką specjalną (nie formą
 * bohatera) i należeć najwyżej do jednego szczepu. Zwraca null, gdy dane nie przeszły schematu.
 */
export function loadEnemyTribes(
  data: unknown,
  enemies: ReadonlyMap<string, CompiledUnit>,
  issues: ContentIssue[],
): Map<string, CompiledEnemyTribe> | null {
  const list = parse(SOURCE, enemyTribesSchema, data, issues);
  if (list === null) return null;
  const tribes = new Map<string, CompiledEnemyTribe>();
  const placed = new Set<string>();
  for (const tribe of indexById(SOURCE, list, new Set(), issues).values()) {
    const members: TribeMember[] = [];
    const ranks = new Set<string>();
    for (const { rank, units } of tribe.ranks) {
      if (ranks.has(rank)) {
        issues.push({ source: SOURCE, message: `${tribe.id}: powtórzony stopień "${rank}"` });
        continue;
      }
      ranks.add(rank);
      for (const unit of units) {
        if (!enemies.has(unit)) {
          issues.push({
            source: SOURCE,
            message: `${tribe.id}: "${unit}" nie jest jednostką z units/enemies.json`,
          });
        } else if (placed.has(unit)) {
          issues.push({
            source: SOURCE,
            message: `${tribe.id}: jednostka "${unit}" należy już do szczepu`,
          });
        } else {
          placed.add(unit);
          members.push({ unit, rank });
        }
      }
    }
    tribes.set(tribe.id, { id: tribe.id, members });
  }
  return tribes;
}
