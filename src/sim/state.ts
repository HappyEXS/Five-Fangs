// Stan walki w tablicach całkowitoliczbowych (ADR 0002). Indeks tablic jednostek to `unitId`.
//
// Konwencja odczytu: `tablica[i] ?? 0`. Przy noUncheckedIndexedAccess każdy odczyt ma typ
// `number | undefined`; `?? 0` odpowiada temu, co tablica typowana i tak zapisałaby
// dla `undefined`, i nie kosztuje nic w zoptymalizowanym kodzie.
import { int32Arrays } from '../core/int-arrays.ts';
import { MAX_PROJECTILES, OUTCOME_IN_PROGRESS, REASON_NONE, SQUAD_UNITS } from './types.ts';

export interface BattleState {
  /**
   * Liczba miejsc jednostek w tej walce i zarazem długość tablic jednostek: SQUAD_UNITS bez
   * przyzywaczy, MAX_UNITS z nimi. Walka bez przyzywaczy nie płaci za miejsca, których nie użyje.
   */
  readonly unitSpan: number;
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
  /**
   * Liczniki stałego rytmu: przy każdym ataku (trafieniu) rosną o procent cechy, a po
   * przekroczeniu 100 atak jest podwójny (trafienie jest unikane) i licznik spada o 100.
   */
  readonly doubleCharge: Int32Array;
  readonly dodgeCharge: Int32Array;
  /** `unitId` przyzywacza jednostki stojącej w miejscu przyzwanych; -1 dla pozostałych miejsc. */
  readonly summonedBy: Int32Array;
  /**
   * Numer miejsca (0..TEAM_SIZE-1), od którego strona szuka wolnego przy następnym przyzwaniu:
   * indeks 0 dla gracza, 1 dla przeciwnika. Kolejka okrężna, więc najdłużej puste miejsce
   * wraca do użycia jako ostatnie.
   */
  readonly summonCursor: Int32Array;

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

export function createState(unitSpan: number = SQUAD_UNITS): BattleState {
  // Liczby tablic poniżej muszą pokrywać pola stanu; za mała rzuca błąd przy tworzeniu walki.
  const units = int32Arrays(unitSpan, 14);
  const projectiles = int32Arrays(MAX_PROJECTILES, 10);
  return {
    unitSpan,
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
    doubleCharge: units(),
    dodgeCharge: units(),
    summonedBy: units().fill(-1),
    summonCursor: new Int32Array(2),
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

/**
 * Specyfikacje jednostek rozłożone na tablice; indeks = `unitId`. Dla jednostek składów stałe
 * przez całą walkę; miejsce przyzwanych dostaje specyfikację przy każdym przyzwaniu.
 */
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
  readonly doubleDamagePercent: Int32Array;
  readonly dodgePercent: Int32Array;
  readonly shieldPercent: Int32Array;
  /** 1, gdy jednostka przyzywa zamiast atakować. */
  readonly summoner: Int32Array;
}

export function createSpecs(unitSpan: number = SQUAD_UNITS): UnitSpecs {
  const units = int32Arrays(unitSpan, 22);
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
    doubleDamagePercent: units(),
    dodgePercent: units(),
    shieldPercent: units(),
    summoner: units(),
  };
}

/** Kolejka zmian z bieżącego ticka, nakładana jednocześnie w fazie rozstrzygnięcia. */
export interface Pending {
  readonly damage: Int32Array;
  readonly heal: Int32Array;
  readonly knockback: Int32Array;
  /** 1 dla przyzywacza, którego zamach doszedł w tym ticku do chwili przyzwania. */
  readonly summon: Int32Array;
}

export function createPending(unitSpan: number = SQUAD_UNITS): Pending {
  const units = int32Arrays(unitSpan, 4);
  return { damage: units(), heal: units(), knockback: units(), summon: units() };
}
