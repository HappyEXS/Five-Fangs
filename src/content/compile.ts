// Kompilacja treści: jedyne miejsce konwersji sekund i jednostek świata na ticki i podjednostki
// (ADR 0002). Wzory opisuje docs/ARCHITECTURE.md §4.3.
import { clampInt } from '../core/int.ts';
import {
  ratePerSecondToInterval,
  secondsToTicks,
  unitsPerSecondToStep,
  unitsToSubunits,
} from '../core/units.ts';
import type { ArenaSpec, UnitSpec } from '../sim/types.ts';
import type { RawArena, RawAttackType, RawUnit } from './schema.ts';

export interface CompiledUnit {
  readonly id: string;
  readonly kind: 'melee' | 'ranged';
  readonly attackType: string;
  /** Specyfikacja bez ulepszeń i run. */
  readonly base: UnitSpec;
}

export function compileArena(raw: RawArena): ArenaSpec {
  return {
    width: unitsToSubunits(raw.width),
    playerSlots: raw.playerSlots.map(unitsToSubunits),
    enemySlots: raw.enemySlots.map(unitsToSubunits),
    timeLimitTicks: secondsToTicks(raw.timeLimit),
  };
}

/** Długość zamachu w tickach; co najmniej 2, żeby trafienie wypadało przed końcem zamachu. */
export function swingTicksOf(attack: RawAttackType): number {
  return Math.max(2, secondsToTicks(attack.swingDuration));
}

/** Tick trafienia: 1..swingTicks-1. */
export function hitTickOf(attack: RawAttackType): number {
  const swingTicks = swingTicksOf(attack);
  return clampInt(Math.round(attack.hitFraction * swingTicks), 1, swingTicks - 1);
}

export function compileUnit(raw: RawUnit, attack: RawAttackType): CompiledUnit {
  return {
    id: raw.id,
    kind: raw.kind,
    attackType: attack.id,
    base: {
      maxHp: raw.maxHp,
      attack: raw.attack,
      moveStep: unitsPerSecondToStep(raw.moveSpeed),
      range: unitsToSubunits(raw.range),
      knockback: unitsToSubunits(raw.knockback),
      attackInterval: ratePerSecondToInterval(raw.attackSpeed),
      swingTicks: swingTicksOf(attack),
      hitTick: hitTickOf(attack),
      projectileStep:
        attack.projectile === undefined ? 0 : unitsPerSecondToStep(attack.projectile.speed),
      pierce: false,
      healAmount: 0,
      healInterval: 0,
      healTeam: false,
    },
  };
}
