// Statystyki jednostki w postaci dla gracza. Liczone ze specyfikacji symulacji (ticki,
// podjednostki), więc gracz widzi wartości efektywne po zaokrągleniu do ticków
// (docs/GAME_DESIGN.md §3), a nie surowe liczby z danych.
import type { MessageKey } from '../content/i18n/index.ts';
import type { MessageParams } from '../core/i18n.ts';
import { subunitsToUnits, TICKS_PER_SECOND } from '../core/units.ts';
import { TEAM_SIZE, type UnitSpec } from '../sim/types.ts';

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

/** Opis cechy dla gracza: klucz tekstu i wartości do podstawienia. */
export interface TraitView {
  readonly key: MessageKey;
  readonly params: MessageParams;
}

function tenths(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Cechy pasywne jednostki odczytane ze specyfikacji symulacji, w stałej kolejności. */
export function traitsOf(spec: UnitSpec): TraitView[] {
  const traits: TraitView[] = [];
  if (spec.summon !== null) {
    // Przyzywacz nie atakuje, więc to pierwsze, co gracz powinien o nim przeczytać.
    traits.push({
      key: 'trait.summon',
      params: {
        seconds: tenths(spec.attackInterval / TICKS_PER_SECOND),
        hp: spec.summon.maxHp,
        attack: spec.summon.attack,
        limit: TEAM_SIZE,
      },
    });
  }
  if (spec.pierce) traits.push({ key: 'trait.pierce', params: {} });
  if (spec.targetLast) traits.push({ key: 'trait.targetLast', params: {} });
  if (spec.splashRadius > 0) {
    traits.push({ key: 'trait.splash', params: { radius: subunitsToUnits(spec.splashRadius) } });
  }
  if (spec.healAmount > 0) {
    traits.push({
      key: spec.healTeam ? 'trait.heal.team' : 'trait.heal.self',
      params: { amount: spec.healAmount, seconds: tenths(spec.healInterval / TICKS_PER_SECOND) },
    });
  }
  if (spec.doubleDamagePercent > 0) {
    // Gdy rytm jest równy („co drugi”, „co piąty”), mówimy to wprost.
    const percent = spec.doubleDamagePercent;
    traits.push(
      100 % percent === 0 && percent < 100
        ? { key: 'trait.doubleDamage.every', params: { every: 100 / percent } }
        : { key: 'trait.doubleDamage', params: { percent } },
    );
  }
  if (spec.dodgePercent > 0) {
    traits.push({ key: 'trait.dodge', params: { percent: spec.dodgePercent } });
  }
  if (spec.shieldPercent > 0) {
    traits.push({ key: 'trait.shield', params: { percent: spec.shieldPercent } });
  }
  if (spec.lifestealPercent > 0) {
    traits.push({ key: 'trait.lifesteal', params: { percent: spec.lifestealPercent } });
  }
  if (spec.enrageHpPercent > 0) {
    traits.push({
      key: 'trait.enrage',
      params: { hp: spec.enrageHpPercent, bonus: spec.enrageAttackPercent },
    });
  }
  return traits;
}

/** Czas walki `m:ss` dla liczby ticków. */
export function formatBattleTime(ticks: number): string {
  const seconds = Math.floor(ticks / TICKS_PER_SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
