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

/** Wygląd jednostki: wszystko, czego renderer potrzebuje poza stanem symulacji. */
export interface UnitVisual {
  readonly rig: string;
  /** Skórka w atlasie: sprite'y `<skin>/<część>`. */
  readonly skin: string;
  /** Mnożnik wielkości względem skali rigu. */
  readonly scale: number;
  /** Klip ataku i postawa w rigu. */
  readonly attackClip: string;
  readonly stance: string;
  /** Sprite pocisku (`fx/<nazwa>`) albo null dla ataku wręcz. */
  readonly projectileSprite: string | null;
}

export interface CompiledUnit {
  readonly id: string;
  readonly kind: 'melee' | 'ranged';
  readonly attackType: string;
  /** Specyfikacja bez ulepszeń i run. */
  readonly base: UnitSpec;
  readonly visual: UnitVisual;
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
  // Cechy są spłaszczane do pól specyfikacji; symulacja nie interpretuje list ani napisów.
  let pierce = false;
  let healAmount = 0;
  let healInterval = 0;
  let healTeam = false;
  let enrageHpPercent = 0;
  let enrageAttackPercent = 0;
  for (const trait of raw.traits) {
    switch (trait.type) {
      case 'pierce':
        pierce = true;
        break;
      case 'periodicHeal':
        healAmount = trait.amount;
        healInterval = Math.max(1, secondsToTicks(trait.interval));
        healTeam = trait.target === 'team';
        break;
      case 'enrage':
        enrageHpPercent = trait.hpBelow;
        enrageAttackPercent = trait.attackBonus;
        break;
    }
  }

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
      pierce,
      healAmount,
      healInterval,
      healTeam,
      enrageHpPercent,
      enrageAttackPercent,
    },
    visual: {
      rig: raw.rig,
      skin: raw.skin,
      scale: raw.scale,
      attackClip: attack.clip,
      stance: attack.stance,
      projectileSprite: attack.projectile === undefined ? null : attack.projectile.sprite,
    },
  };
}
