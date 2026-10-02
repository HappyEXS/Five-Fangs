// Pomocnicze konstruktory wejścia symulacji dla testów (jednostkowych i golden).
// Wartości w jednostkach czytelnych dla człowieka, przeliczane tak samo jak w kompilacji treści.
import {
  ratePerSecondToInterval,
  secondsToTicks,
  unitsPerSecondToStep,
  unitsToSubunits,
} from '../core/units.ts';
import { type ArenaSpec, type BattleSetup, TEAM_SIZE, type UnitSpec } from './types.ts';

/** Jednostki świata → podjednostki. */
export const u = unitsToSubunits;

export const TEST_ARENA: ArenaSpec = {
  width: u(1000),
  playerSlots: [400, 340, 280, 220, 160].map(u),
  enemySlots: [600, 660, 720, 780, 840].map(u),
  timeLimitTicks: secondsToTicks(90),
};

/** Wojownik wręcz: zamach 12 ticków z trafieniem w 6., atak co 30 ticków. */
export function melee(overrides: Partial<UnitSpec> = {}): UnitSpec {
  return {
    maxHp: 600,
    attack: 40,
    moveStep: unitsPerSecondToStep(60),
    range: u(30),
    knockback: 0,
    attackInterval: ratePerSecondToInterval(1),
    swingTicks: 12,
    hitTick: 6,
    projectileStep: 0,
    pierce: false,
    healAmount: 0,
    healInterval: 0,
    healTeam: false,
    ...overrides,
  };
}

/** Strzelec: zamach 18 ticków z wystrzałem w 9., atak co 38 ticków, pocisk 400 jedn./s. */
export function ranged(overrides: Partial<UnitSpec> = {}): UnitSpec {
  return melee({
    maxHp: 350,
    attack: 30,
    moveStep: unitsPerSecondToStep(50),
    range: u(220),
    attackInterval: ratePerSecondToInterval(0.8),
    swingTicks: 18,
    hitTick: 9,
    projectileStep: unitsPerSecondToStep(400),
    ...overrides,
  });
}

type Team = readonly (UnitSpec | null)[];

function padTeam(team: Team): (UnitSpec | null)[] {
  const out: (UnitSpec | null)[] = [];
  for (let slot = 0; slot < TEAM_SIZE; slot++) out.push(team[slot] ?? null);
  return out;
}

/** Setup na arenie testowej; brakujące sloty są puste. */
export function setupOf(player: Team, enemy: Team, arena: Partial<ArenaSpec> = {}): BattleSetup {
  return {
    arena: { ...TEST_ARENA, ...arena },
    player: padTeam(player),
    enemy: padTeam(enemy),
  };
}
