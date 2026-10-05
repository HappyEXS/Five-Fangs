// Pomocnicze konstruktory wejścia symulacji dla testów (jednostkowych i golden).
// Wartości w jednostkach czytelnych dla człowieka, przeliczane tak samo jak w kompilacji treści.
import {
  ratePerSecondToInterval,
  secondsToTicks,
  unitsPerSecondToStep,
  unitsToSubunits,
} from '../core/units.ts';
import type { Battle } from './battle.ts';
import { stepBattle } from './step.ts';
import {
  type ArenaSpec,
  type BattleSetup,
  OUTCOME_IN_PROGRESS,
  TEAM_SIZE,
  type UnitSpec,
} from './types.ts';

/** Jednostki świata → podjednostki. */
export const u = unitsToSubunits;

export const TEST_ARENA: ArenaSpec = {
  width: u(1000),
  playerSlots: [400, 340, 280, 220, 160].map(u),
  enemySlots: [600, 660, 720, 780, 840].map(u),
  timeLimitTicks: secondsToTicks(90),
};

/** Sloty frontowe 20 jednostek od siebie: jednostki wręcz mają się w zasięgu od pierwszego ticka. */
export const CLOSE_SLOTS: Pick<ArenaSpec, 'playerSlots' | 'enemySlots'> = {
  playerSlots: [500, 440, 380, 320, 260].map(u),
  enemySlots: [520, 580, 640, 700, 760].map(u),
};

/** Wykonuje podaną liczbę ticków. */
export function runTicks(battle: Battle, ticks: number): void {
  for (let i = 0; i < ticks; i++) stepBattle(battle);
}

/** Wykonuje ticki do spełnienia warunku albo końca walki; zwraca liczbę wykonanych. */
export function runUntil(battle: Battle, done: () => boolean, limit = 3000): number {
  let ticks = 0;
  while (!done() && battle.state.outcome === OUTCOME_IN_PROGRESS && ticks < limit) {
    stepBattle(battle);
    ticks++;
  }
  return ticks;
}

/** Zdarzenia ostatniego ticka jako krotki `[typ, a, b, c]`. */
export function lastEvents(battle: Battle): number[][] {
  const { events } = battle;
  const out: number[][] = [];
  for (let i = 0; i < events.count; i++) {
    out.push([events.type[i] ?? 0, events.a[i] ?? 0, events.b[i] ?? 0, events.c[i] ?? 0]);
  }
  return out;
}

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
    enrageHpPercent: 0,
    enrageAttackPercent: 0,
    lifestealPercent: 0,
    splashRadius: 0,
    targetLast: false,
    doubleDamagePercent: 0,
    dodgePercent: 0,
    shieldPercent: 0,
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
