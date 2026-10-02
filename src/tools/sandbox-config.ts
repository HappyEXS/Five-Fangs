// Konfiguracja walki w piaskownicy: dowolne jednostki po obu stronach, zapisywana w adresie
// strony, żeby dało się podać komuś link do konkretnej walki.
import { z } from 'zod';
import type { CompiledUnit, UnitVisual } from '../content/compile.ts';
import type { GameContent } from '../content/load.ts';
import { resolveUnitSpec } from '../content/resolve-spec.ts';
import { type BattleSetup, TEAM_SIZE, type UnitSpec, validateSetup } from '../sim/index.ts';

export interface SlotConfig {
  /** Id jednostki (bohater albo wróg). */
  readonly unit: string;
  /** Liczba ulepszeń albo poziom wroga. */
  readonly rank: number;
}

export type TeamConfig = readonly (SlotConfig | null)[];

export interface SandboxConfig {
  readonly player: TeamConfig;
  readonly enemy: TeamConfig;
}

export const DEFAULT_CONFIG: SandboxConfig = {
  player: [
    { unit: 'swordsman_a', rank: 4 },
    { unit: 'swordsman_b', rank: 0 },
    { unit: 'archer_a', rank: 4 },
    { unit: 'archer_b', rank: 0 },
    null,
  ],
  enemy: [
    { unit: 'brute', rank: 3 },
    { unit: 'brute', rank: 3 },
    { unit: 'brute', rank: 1 },
    null,
    null,
  ],
};

const MAX_RANK = 99;

function findUnit(content: GameContent, id: string): CompiledUnit | undefined {
  return content.heroes.get(id) ?? content.enemies.get(id);
}

/** Wszystkie jednostki treści: najpierw bohaterowie, potem wrogowie. */
export function allUnitIds(content: GameContent): string[] {
  return [...content.heroes.keys(), ...content.enemies.keys()];
}

/** Zapis drużyny: `swordsman_a.4,-,archer_a.0`; `-` to pusty slot. */
export function formatTeam(team: TeamConfig): string {
  const parts: string[] = [];
  for (let slot = 0; slot < TEAM_SIZE; slot++) {
    const entry = team[slot] ?? null;
    parts.push(entry === null ? '-' : `${entry.unit}.${entry.rank}`);
  }
  // Puste sloty na końcu nie niosą informacji.
  while (parts.length > 1 && parts[parts.length - 1] === '-') parts.pop();
  return parts.join(',');
}

/** Odczyt drużyny z zapisu. Nieznane jednostki i błędne rangi dają pusty slot. */
export function parseTeam(content: GameContent, text: string): (SlotConfig | null)[] {
  const parts = text.split(',');
  const team: (SlotConfig | null)[] = [];
  for (let slot = 0; slot < TEAM_SIZE; slot++) {
    const [unit = '', rankText = '0'] = (parts[slot] ?? '-').trim().split('.');
    const rank = Number(rankText);
    const valid =
      findUnit(content, unit) !== undefined &&
      Number.isInteger(rank) &&
      rank >= 0 &&
      rank <= MAX_RANK;
    team.push(valid ? { unit, rank } : null);
  }
  return team;
}

/** Konfiguracja z parametrów adresu (`player`, `enemy`) albo domyślna. */
export function configFromQuery(content: GameContent, query: URLSearchParams): SandboxConfig {
  const player = query.get('player');
  const enemy = query.get('enemy');
  return {
    player: player === null ? DEFAULT_CONFIG.player : parseTeam(content, player),
    enemy: enemy === null ? DEFAULT_CONFIG.enemy : parseTeam(content, enemy),
  };
}

export interface SandboxBattle {
  readonly setup: BattleSetup;
  /** Wygląd jednostek indeksowany `unitId`. */
  readonly visuals: (UnitVisual | null)[];
}

/** Wejście symulacji i wygląd jednostek dla konfiguracji. */
export function buildBattle(content: GameContent, config: SandboxConfig): SandboxBattle {
  const visuals: (UnitVisual | null)[] = [];
  const team = (entries: TeamConfig): (UnitSpec | null)[] => {
    const specs: (UnitSpec | null)[] = [];
    for (let slot = 0; slot < TEAM_SIZE; slot++) {
      const entry = entries[slot] ?? null;
      const unit = entry === null ? undefined : findUnit(content, entry.unit);
      if (entry === null || unit === undefined) {
        specs.push(null);
        visuals.push(null);
        continue;
      }
      specs.push(resolveUnitSpec(unit, entry.rank, [], content.progression));
      visuals.push(unit.visual);
    }
    return specs;
  };
  const player = team(config.player);
  const enemy = team(config.enemy);
  return { setup: { arena: content.arena, player, enemy }, visuals };
}

const specSchema = z.strictObject({
  maxHp: z.number(),
  attack: z.number(),
  moveStep: z.number(),
  range: z.number(),
  knockback: z.number(),
  attackInterval: z.number(),
  swingTicks: z.number(),
  hitTick: z.number(),
  projectileStep: z.number(),
  pierce: z.boolean(),
  healAmount: z.number(),
  healInterval: z.number(),
  healTeam: z.boolean(),
});

const setupSchema = z.strictObject({
  arena: z.strictObject({
    width: z.number(),
    playerSlots: z.array(z.number()),
    enemySlots: z.array(z.number()),
    timeLimitTicks: z.number(),
  }),
  player: z.array(specSchema.nullable()),
  enemy: z.array(specSchema.nullable()),
});

/**
 * Walka z gotowego wejścia symulacji zapisanego jako JSON: z raportu „Zgłoś problem” albo
 * z walki golden (`pnpm battle golden:<nazwa> --link`). Wejście nie mówi, jak jednostki
 * wyglądają, więc strzelcy dostają wygląd pierwszego strzelca z treści, a reszta pierwszego
 * wojownika. Zwraca null, gdy JSON nie jest poprawnym wejściem symulacji.
 */
export function battleFromSetupJson(content: GameContent, json: string): SandboxBattle | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = setupSchema.safeParse(data);
  if (!parsed.success || validateSetup(parsed.data).length > 0) return null;

  const units = [...content.heroes.values(), ...content.enemies.values()];
  const melee = units.find((unit) => unit.kind === 'melee')?.visual ?? null;
  const ranged = units.find((unit) => unit.kind === 'ranged')?.visual ?? null;
  const visuals = [...parsed.data.player, ...parsed.data.enemy].map((spec) =>
    spec === null ? null : spec.projectileStep > 0 ? ranged : melee,
  );
  return { setup: parsed.data, visuals };
}
