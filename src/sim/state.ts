// Stan walki w tablicach całkowitoliczbowych (ADR 0002). Indeks tablic jednostek to `unitId`.
//
// Konwencja odczytu: `tablica[i] ?? 0`. Przy noUncheckedIndexedAccess każdy odczyt ma typ
// `number | undefined`; `?? 0` odpowiada temu, co tablica typowana i tak zapisałaby
// dla `undefined`, i nie kosztuje nic w zoptymalizowanym kodzie.
import { MAX_PROJECTILES, MAX_UNITS, OUTCOME_IN_PROGRESS, REASON_NONE } from './types.ts';

export interface BattleState {
  /** Liczba wykonanych ticków. */
  tick: number;
  outcome: number;
  reason: number;

  // Jednostki
  readonly status: Int32Array;
  readonly x: Int32Array;
  /** Pozycja z początku bieżącego ticka: test trafienia pocisków i interpolacja w rendererze. */
  readonly prevX: Int32Array;
  readonly hp: Int32Array;
  /** `unitId` celu albo -1. */
  readonly target: Int32Array;
  /** Ticki od początku trwającego zamachu albo -1 poza atakiem. */
  readonly swingTick: Int32Array;
  /** Ticki od początku ostatniego ataku. */
  readonly sinceAttack: Int32Array;
  /** Ticki od ostatniego zadziałania cechy okresowej. */
  readonly traitTimer: Int32Array;

  // Pociski: aktywne zajmują indeksy 0..projCount-1, w kolejności wystrzelenia.
  projCount: number;
  /** Id następnego pocisku; rośnie przez całą walkę, więc renderer może śledzić pociski. */
  nextProjId: number;
  readonly projId: Int32Array;
  readonly projX: Int32Array;
  readonly projPrevX: Int32Array;
  /** Krok na tick ze znakiem kierunku. */
  readonly projStep: Int32Array;
  readonly projOwner: Int32Array;
  readonly projDamage: Int32Array;
  readonly projKnockback: Int32Array;
  /** Tryb trafiania: `PROJECTILE_FIRST`, `PROJECTILE_PIERCE` albo `PROJECTILE_AIMED`. */
  readonly projMode: Int32Array;
  /** Bity `unitId` jednostek już trafionych przez pocisk przebijający. */
  readonly projHitMask: Int32Array;
  /** `unitId` jedynej jednostki, którą może trafić pocisk wycelowany; dla pozostałych -1. */
  readonly projTarget: Int32Array;

  // Statystyki do wyniku walki
  readonly damageDealt: Int32Array;
  readonly damageTaken: Int32Array;
  readonly healingDone: Int32Array;
}

export function createState(): BattleState {
  const units = (): Int32Array => new Int32Array(MAX_UNITS);
  const projectiles = (): Int32Array => new Int32Array(MAX_PROJECTILES);
  return {
    tick: 0,
    outcome: OUTCOME_IN_PROGRESS,
    reason: REASON_NONE,
    status: units(),
    x: units(),
    prevX: units(),
    hp: units(),
    target: units().fill(-1),
    swingTick: units().fill(-1),
    sinceAttack: units(),
    traitTimer: units(),
    projCount: 0,
    nextProjId: 0,
    projId: projectiles(),
    projX: projectiles(),
    projPrevX: projectiles(),
    projStep: projectiles(),
    projOwner: projectiles(),
    projDamage: projectiles(),
    projKnockback: projectiles(),
    projMode: projectiles(),
    projHitMask: projectiles(),
    projTarget: projectiles().fill(-1),
    damageDealt: units(),
    damageTaken: units(),
    healingDone: units(),
  };
}

/** Specyfikacje jednostek rozłożone na tablice; indeks = `unitId`. Stałe przez całą walkę. */
export interface UnitSpecs {
  readonly maxHp: Int32Array;
  readonly attack: Int32Array;
  readonly moveStep: Int32Array;
  readonly range: Int32Array;
  readonly knockback: Int32Array;
  readonly attackInterval: Int32Array;
  readonly swingTicks: Int32Array;
  readonly hitTick: Int32Array;
  readonly projectileStep: Int32Array;
  readonly pierce: Int32Array;
  readonly healAmount: Int32Array;
  readonly healInterval: Int32Array;
  readonly healTeam: Int32Array;
  /** Szał: jednostka jest w szale, gdy `hp < enrageHp`; 0 oznacza brak cechy. */
  readonly enrageHp: Int32Array;
  /** Obrażenia ataku w szale; bez cechy równe `attack`. */
  readonly enragedAttack: Int32Array;
  /** Kradzież życia w procentach zadanych obrażeń. */
  readonly lifesteal: Int32Array;
  /** Promień ciosu obszarowego w podjednostkach. */
  readonly splashRadius: Int32Array;
  /** 1, gdy jednostka celuje w ostatniego wroga w szyku. */
  readonly targetLast: Int32Array;
}

export function createSpecs(): UnitSpecs {
  const units = (): Int32Array => new Int32Array(MAX_UNITS);
  return {
    maxHp: units(),
    attack: units(),
    moveStep: units(),
    range: units(),
    knockback: units(),
    attackInterval: units(),
    swingTicks: units(),
    hitTick: units(),
    projectileStep: units(),
    pierce: units(),
    healAmount: units(),
    healInterval: units(),
    healTeam: units(),
    enrageHp: units(),
    enragedAttack: units(),
    lifesteal: units(),
    splashRadius: units(),
    targetLast: units(),
  };
}

/** Kolejka zmian z bieżącego ticka, nakładana jednocześnie w fazie rozstrzygnięcia. */
export interface Pending {
  readonly damage: Int32Array;
  readonly heal: Int32Array;
  readonly knockback: Int32Array;
}

export function createPending(): Pending {
  return {
    damage: new Int32Array(MAX_UNITS),
    heal: new Int32Array(MAX_UNITS),
    knockback: new Int32Array(MAX_UNITS),
  };
}
