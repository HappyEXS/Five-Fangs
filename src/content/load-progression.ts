// Wczytanie danych progresji: linie bohaterów, runy, światy i poziomy, ze sprawdzeniem odwołań.
import type { CompiledUnit } from './compile.ts';
import type { ContentIssue } from './issues.ts';
import { type CompiledLine, checkTierCosts, compileLine } from './load-lines.ts';
import { indexById, parse } from './parse.ts';
import {
  type BackdropId,
  levelsSchema,
  linesSchema,
  type Progression,
  progressionSchema,
  type RawWorld,
  type Rune,
  runesSchema,
  worldsSchema,
} from './schema-progression.ts';

export type { CompiledForm, CompiledLine } from './load-lines.ts';

export interface LevelEnemy {
  readonly slot: number;
  readonly unit: string;
  readonly level: number;
}

export interface CompiledLevel {
  readonly id: string;
  readonly world: string;
  /** Kolejność w świecie, od 0. */
  readonly index: number;
  readonly enemies: readonly LevelEnemy[];
  readonly gold: number;
  /** Runa za pierwsze przejście albo null. */
  readonly rune: string | null;
}

export interface CompiledWorld {
  readonly id: string;
  /** Tło sceny tego świata. */
  readonly backdrop: BackdropId;
  /** Id poziomów w kolejności odblokowywania. */
  readonly levels: readonly string[];
}

export interface ProgressionContent {
  readonly progression: Progression;
  readonly lines: ReadonlyMap<string, CompiledLine>;
  readonly runes: ReadonlyMap<string, Rune>;
  readonly worlds: readonly CompiledWorld[];
  readonly levels: ReadonlyMap<string, CompiledLevel>;
}

export interface RawProgression {
  readonly 'progression.json': unknown;
  readonly 'lines.json': unknown;
  readonly 'runes.json': unknown;
  readonly 'worlds.json': unknown;
  /** Zawartość plików levels/<id świata>.json. */
  readonly levels: Readonly<Record<string, unknown>>;
}

function loadLevels(
  raw: RawProgression,
  worldList: ReadonlyMap<string, RawWorld>,
  progression: Progression,
  heroes: ReadonlyMap<string, CompiledUnit>,
  enemies: ReadonlyMap<string, CompiledUnit>,
  runes: ReadonlyMap<string, Rune>,
  issues: ContentIssue[],
): { worlds: CompiledWorld[]; levels: Map<string, CompiledLevel> } {
  const worlds: CompiledWorld[] = [];
  const levels = new Map<string, CompiledLevel>();

  const worldIds = [...worldList.keys()];
  for (const file of Object.keys(raw.levels)) {
    if (!worldIds.includes(file)) {
      issues.push({ source: `levels/${file}.json`, message: 'plik poziomów nieznanego świata' });
    }
  }

  for (const world of worldIds) {
    const source = `levels/${world}.json`;
    const data = raw.levels[world];
    if (data === undefined) {
      issues.push({ source: 'worlds.json', message: `${world}: brak pliku ${source}` });
      continue;
    }
    const list = parse(source, levelsSchema, data, issues);
    if (list === null) continue;
    if (list.length !== progression.levelsPerWorld) {
      issues.push({
        source,
        message: `świat ma ${list.length} poziomów, wymagane ${progression.levelsPerWorld}`,
      });
    }

    const order: string[] = [];
    list.forEach((level, index) => {
      if (levels.has(level.id)) {
        issues.push({ source, message: `powtórzone id "${level.id}"` });
        return;
      }
      const slots = new Set<number>();
      for (const enemy of level.enemies) {
        if (slots.has(enemy.slot)) {
          issues.push({ source, message: `${level.id}: slot ${enemy.slot} użyty więcej niż raz` });
        }
        slots.add(enemy.slot);
        // Wrogiem może być forma bohatera albo jednostka specjalna z units/enemies.json.
        if (!enemies.has(enemy.unit) && !heroes.has(enemy.unit)) {
          issues.push({ source, message: `${level.id}: nieznana jednostka "${enemy.unit}"` });
        }
      }
      const rune = level.rewards.rune ?? null;
      if (rune !== null && !runes.has(rune)) {
        issues.push({ source, message: `${level.id}: nieznana runa "${rune}"` });
      }
      order.push(level.id);
      levels.set(level.id, {
        id: level.id,
        world,
        index,
        enemies: level.enemies,
        gold: level.rewards.gold,
        rune,
      });
    });
    worlds.push({ id: world, backdrop: worldList.get(world)?.backdrop ?? 'castle', levels: order });
  }
  return { worlds, levels };
}

/** Waliduje i kompiluje dane progresji. Zwraca null, gdy któryś plik nie przeszedł schematu. */
export function loadProgression(
  raw: RawProgression,
  heroes: ReadonlyMap<string, CompiledUnit>,
  enemies: ReadonlyMap<string, CompiledUnit>,
  issues: ContentIssue[],
): ProgressionContent | null {
  const progression = parse('progression.json', progressionSchema, raw['progression.json'], issues);
  const lineList = parse('lines.json', linesSchema, raw['lines.json'], issues);
  const runeList = parse('runes.json', runesSchema, raw['runes.json'], issues);
  const worldList = parse('worlds.json', worldsSchema, raw['worlds.json'], issues);
  if (progression === null || lineList === null || runeList === null || worldList === null) {
    return null;
  }

  checkTierCosts(progression, issues);
  const runes = indexById('runes.json', runeList, new Set(), issues);
  const worldsById = indexById('worlds.json', worldList, new Set(), issues);
  const { worlds, levels } = loadLevels(
    raw,
    worldsById,
    progression,
    heroes,
    enemies,
    runes,
    issues,
  );

  const lines = new Map<string, CompiledLine>();
  const usedForms = new Set<string>();
  for (const line of indexById('lines.json', lineList, new Set(), issues).values()) {
    const compiled = compileLine(line, heroes, progression, usedForms, issues);
    if (compiled !== null) lines.set(line.id, compiled);
  }

  return { progression, lines, runes, worlds, levels };
}
