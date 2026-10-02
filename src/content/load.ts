// Wczytanie treści: walidacja schematem, sprawdzenie odwołań i kompilacja do struktur runtime.
import type { ArenaSpec } from '../sim/types.ts';
import { type CompiledUnit, compileArena, compileUnit } from './compile.ts';
import arenaJson from './data/arena.json' with { type: 'json' };
import attacksJson from './data/attacks.json' with { type: 'json' };
import world1LevelsJson from './data/levels/world_1.json' with { type: 'json' };
import linesJson from './data/lines.json' with { type: 'json' };
import progressionJson from './data/progression.json' with { type: 'json' };
import humanoidRigJson from './data/rigs/humanoid.json' with { type: 'json' };
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
import { loadRigs } from './load-rigs.ts';
import { indexById, parse } from './parse.ts';
import {
  arenaSchema,
  attackTypesSchema,
  type RawAttackType,
  type RawUnit,
  unitsSchema,
} from './schema.ts';
import type { RawRig } from './schema-rig.ts';

/** Surowe dane treści przed walidacją; klucz = plik względem src/content/data. */
export interface RawContent extends RawProgression {
  readonly 'arena.json': unknown;
  readonly 'attacks.json': unknown;
  readonly 'units/heroes.json': unknown;
  readonly 'units/enemies.json': unknown;
  /** Zawartość plików rigs/<id>.json. */
  readonly rigs: Readonly<Record<string, unknown>>;
}

export const rawContent: RawContent = {
  'arena.json': arenaJson,
  'attacks.json': attacksJson,
  'units/heroes.json': heroesJson,
  'units/enemies.json': enemiesJson,
  rigs: { humanoid: humanoidRigJson },
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
  /** Rigi z klipami w postaci surowej; do tablic typowanych kompiluje je renderer. */
  readonly rigs: ReadonlyMap<string, RawRig>;
}

export interface ContentResult {
  /** Skompilowana treść albo null, gdy dane nie przeszły schematów. */
  readonly content: GameContent | null;
  readonly issues: readonly ContentIssue[];
}

/** Sprawdza, czy rig jednostki ma klip i postawę jej typu ataku i czy trafienie wypada w tym samym momencie. */
function animationIssues(
  unit: RawUnit,
  attack: RawAttackType,
  rigs: ReadonlyMap<string, RawRig>,
): string[] {
  const rig = rigs.get(unit.rig);
  if (rig === undefined) return [`${unit.id}: nieznany rig "${unit.rig}"`];
  const problems: string[] = [];
  const clip = rig.clips[attack.clip];
  if (clip === undefined) {
    problems.push(`${unit.id}: rig "${rig.id}" nie ma klipu "${attack.clip}" ataku "${attack.id}"`);
  } else if (clip.markers.hit !== attack.hitFraction) {
    // Symulacja jest źródłem prawdy o czasie; animacja musi pokazywać trafienie w tym samym momencie.
    problems.push(
      `${unit.id}: znacznik hit klipu "${attack.clip}" (${clip.markers.hit ?? 'brak'}) różni się od hitFraction ataku "${attack.id}" (${attack.hitFraction})`,
    );
  }
  if (rig.stances[attack.stance] === undefined) {
    problems.push(`${unit.id}: rig "${rig.id}" nie ma postawy "${attack.stance}"`);
  }
  return problems;
}

function compileUnits(
  source: string,
  units: ReadonlyMap<string, RawUnit>,
  attacks: ReadonlyMap<string, RawAttackType>,
  rigs: ReadonlyMap<string, RawRig>,
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
    if (traitTypes.includes('splash') && hasProjectile) {
      issues.push({ source, message: `${unit.id}: cecha "splash" wymaga ataku wręcz` });
      continue;
    }
    for (const message of animationIssues(unit, attack, rigs)) issues.push({ source, message });
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
  const rigs = loadRigs(raw.rigs, issues);
  if (
    arena === null ||
    attackList === null ||
    heroList === null ||
    enemyList === null ||
    rigs === null
  ) {
    return { content: null, issues };
  }

  const attacks = indexById('attacks.json', attackList, new Set(), issues);
  // Bohaterowie i wrogowie dzielą przestrzeń id: poziomy i UI odwołują się do jednostek po samym id.
  const unitIds = new Set<string>();
  const heroes = compileUnits(
    'units/heroes.json',
    indexById('units/heroes.json', heroList, unitIds, issues),
    attacks,
    rigs,
    issues,
  );
  const enemies = compileUnits(
    'units/enemies.json',
    indexById('units/enemies.json', enemyList, unitIds, issues),
    attacks,
    rigs,
    issues,
  );

  const progression = loadProgression(raw, heroes, enemies, issues);
  if (progression === null) return { content: null, issues };

  return {
    content: { arena: compileArena(arena), attacks, heroes, enemies, rigs, ...progression },
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
