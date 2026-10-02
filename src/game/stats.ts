// Statystyki jednostki w postaci dla gracza. Liczone ze specyfikacji symulacji (ticki,
// podjednostki), więc gracz widzi wartości efektywne po zaokrągleniu do ticków
// (docs/GAME_DESIGN.md §3), a nie surowe liczby z danych.
import { subunitsToUnits, TICKS_PER_SECOND } from '../core/units.ts';
import type { UnitSpec } from '../sim/types.ts';

// UI nie importuje z symulacji; typ specyfikacji dostaje stąd.
export type { UnitSpec };

export interface DisplayStats {
  readonly maxHp: number;
  readonly attack: number;
  /** Ataki na sekundę. */
  readonly attackRate: number;
  /** Jednostki świata. */
  readonly range: number;
  /** Jednostki świata na sekundę. */
  readonly moveSpeed: number;
  /** Jednostki świata. */
  readonly knockback: number;
  /** Obrażenia na sekundę przy ciągłym ataku jednego celu. */
  readonly damagePerSecond: number;
}

export function displayStats(spec: UnitSpec): DisplayStats {
  const attackRate = TICKS_PER_SECOND / spec.attackInterval;
  return {
    maxHp: spec.maxHp,
    attack: spec.attack,
    attackRate,
    range: subunitsToUnits(spec.range),
    moveSpeed: subunitsToUnits(spec.moveStep * TICKS_PER_SECOND),
    knockback: subunitsToUnits(spec.knockback),
    damagePerSecond: spec.attack * attackRate,
  };
}

export type TraitView =
  | { readonly type: 'pierce' }
  | {
      readonly type: 'heal';
      readonly team: boolean;
      readonly amount: number;
      /** Odstęp leczenia w sekundach. */
      readonly seconds: number;
    };

/** Cechy pasywne jednostki odczytane ze specyfikacji symulacji. */
export function traitsOf(spec: UnitSpec): TraitView[] {
  const traits: TraitView[] = [];
  if (spec.pierce) traits.push({ type: 'pierce' });
  if (spec.healAmount > 0) {
    traits.push({
      type: 'heal',
      team: spec.healTeam,
      amount: spec.healAmount,
      seconds: spec.healInterval / TICKS_PER_SECOND,
    });
  }
  return traits;
}

/** Czas walki `m:ss` dla liczby ticków. */
export function formatBattleTime(ticks: number): string {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
