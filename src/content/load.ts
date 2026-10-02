// Wczytanie treści: walidacja schematem, sprawdzenie odwołań i kompilacja do struktur runtime.
import type { ArenaSpec } from '../sim/types.ts';
import { type CompiledUnit, compileArena, compileUnit } from './compile.ts';
import arenaJson from './data/arena.json' with { type: 'json' };
import attacksJson from './data/attacks.json' with { type: 'json' };
import world1LevelsJson from './data/levels/world_1.json' with { type: 'json' };
import linesJson from './data/lines.json' with { type: 'json' };
import progressionJson from './data/progression.json' with { type: 'json' };
import runesJson from './data/runes.json' with { type: 'json' };
import enemiesJson from './data/units/enemies.json' with { type: 'json' };
import heroesJson from './data/units/heroes.json' with { type: 'json' };
import worldsJson from './data/worlds.json' with { type: 'json' };
import type { ContentIssue } from './issues.ts';
import {
  loadProgression,
  type ProgressionContent,
  type RawProgression,
} from './load-progression.ts';
import { indexById, parse } from './parse.ts';
import {
  arenaSchema,
  attackTypesSchema,
  type RawAttackType,
  type RawUnit,
  unitsSchema,
} from './schema.ts';

/** Surowe dane treści przed walidacją; klucz = plik względem src/content/data. */
export interface RawContent extends RawProgression {
  readonly 'arena.json': unknown;
  readonly 'attacks.json': unknown;
  readonly 'units/heroes.json': unknown;
  readonly 'units/enemies.json': unknown;
}

export const rawContent: RawContent = {
  'arena.json': arenaJson,
  'attacks.json': attacksJson,
  'units/heroes.json': heroesJson,
  'units/enemies.json': enemiesJson,
  'progression.json': progressionJson,
  'lines.json': linesJson,
  'runes.json': runesJson,
  'worlds.json': worldsJson,
  levels: { world_1: world1LevelsJson },
};

export interface GameContent extends ProgressionContent {
  readonly arena: ArenaSpec;
  readonly attacks: ReadonlyMap<string, RawAttackType>;
  readonly heroes: ReadonlyMap<string, CompiledUnit>;
  readonly enemies: ReadonlyMap<string, CompiledUnit>;
}

export interface ContentResult {
  /** Skompilowana treść albo null, gdy dane nie przeszły schematów. */
  readonly content: GameContent | null;
  readonly issues: readonly ContentIssue[];
}

function compileUnits(
  source: string,
  units: ReadonlyMap<string, RawUnit>,
  attacks: ReadonlyMap<string, RawAttackType>,
  issues: ContentIssue[],
): Map<string, CompiledUnit> {
  const compiled = new Map<string, CompiledUnit>();
  for (const unit of units.values()) {
    const attack = attacks.get(unit.attackType);
    if (attack === undefined) {
      issues.push({
        source,
        message: `${unit.id}: nieznany typ ataku "${unit.attackType}"`,
      });
      continue;
    }
    const hasProjectile = attack.projectile !== undefined;
    if ((unit.kind === 'ranged') !== hasProjectile) {
      issues.push({
        source,
        message: `${unit.id}: kind "${unit.kind}" nie pasuje do typu ataku "${attack.id}" (pocisk: ${hasProjectile ? 'tak' : 'nie'})`,
      });
      continue;
    }
    const traitTypes = unit.traits.map((trait) => trait.type);
    const repeated = traitTypes.find((type, index) => traitTypes.indexOf(type) !== index);
    if (repeated !== undefined) {
      issues.push({ source, message: `${unit.id}: cecha "${repeated}" występuje więcej niż raz` });
      continue;
    }
    if (traitTypes.includes('pierce') && !hasProjectile) {
      issues.push({ source, message: `${unit.id}: cecha "pierce" wymaga ataku z pociskiem` });
      continue;
    }
    compiled.set(unit.id, compileUnit(unit, attack));
  }
  return compiled;
}

/** Waliduje i kompiluje treść. Nie rzuca błędów; problemy zwraca na liście. */
export function loadContent(raw: RawContent = rawContent): ContentResult {
  const issues: ContentIssue[] = [];

  const arena = parse('arena.json', arenaSchema, raw['arena.json'], issues);
  const attackList = parse('attacks.json', attackTypesSchema, raw['attacks.json'], issues);
  const heroList = parse('units/heroes.json', unitsSchema, raw['units/heroes.json'], issues);
  const enemyList = parse('units/enemies.json', unitsSchema, raw['units/enemies.json'], issues);
  if (arena === null || attackList === null || heroList === null || enemyList === null) {
    return { content: null, issues };
  }

  const attacks = indexById('attacks.json', attackList, new Set(), issues);
  // Bohaterowie i wrogowie dzielą przestrzeń id: poziomy i UI odwołują się do jednostek po samym id.
  const unitIds = new Set<string>();
  const heroes = compileUnits(
    'units/heroes.json',
    indexById('units/heroes.json', heroList, unitIds, issues),
    attacks,
    issues,
  );
  const enemies = compileUnits(
    'units/enemies.json',
    indexById('units/enemies.json', enemyList, unitIds, issues),
    attacks,
    issues,
  );

  const progression = loadProgression(raw, heroes, enemies, issues);
  if (progression === null) return { content: null, issues };

  return {
    content: { arena: compileArena(arena), attacks, heroes, enemies, ...progression },
    issues,
  };
}

/** Treść gry dla kodu wykonywanego. Rzuca błąd, gdy dane są niepoprawne (CI wyłapuje to wcześniej). */
export function requireContent(raw: RawContent = rawContent): GameContent {
  const { content, issues } = loadContent(raw);
  if (content === null || issues.length > 0) {
    const lines = issues.map((issue) => `${issue.source}: ${issue.message}`);
    throw new Error(`Invalid game content:\n${lines.join('\n')}`);
  }
  return content;
}
