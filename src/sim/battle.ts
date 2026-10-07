// Walka: niezmienne wejście (arena, specyfikacje) i zmienny stan.
import { mulDivCeil, mulDivFloor } from '../core/int.ts';
import { clearDots } from './dot.ts';
import { createEventBuffer, type EventBuffer } from './events.ts';
import { EVENT_HASH_SEED } from './hash.ts';
import {
  type BattleState,
  createPending,
  createSpecs,
  createState,
  type Pending,
  type UnitSpecs,
} from './state.ts';
import {
  type BattleSetup,
  MAX_UNITS,
  SQUAD_UNITS,
  STATUS_IDLE,
  TEAM_SIZE,
  type UnitSpec,
} from './types.ts';
import { validateSetup } from './validate-setup.ts';

export interface Battle {
  /** Szerokość pola w podjednostkach. */
  readonly width: number;
  readonly timeLimitTicks: number;
  readonly specs: UnitSpecs;
  /** Tylko do odczytu dla renderera i UI. */
  readonly state: BattleState;
  /** Zdarzenia ostatniego ticka. */
  readonly events: EventBuffer;
  readonly pending: Pending;
  /**
   * `unitId` jednostek z leczeniem okresowym, rosnąco. Większość walk nie ma żadnej,
   * a wtedy faza cech nie kosztuje nic.
   */
  readonly healers: readonly number[];
  /** Czy którakolwiek jednostka celuje w ostatniego wroga; bez nich tick nie szuka końca szyku. */
  readonly hasTargetLast: boolean;
  /**
   * Czy którakolwiek jednostka ma podwójne obrażenia w rytmie albo unik lub tarczę. W walkach
   * bez tych cech atak i trafienie nie czytają ich pól ani liczników.
   */
  readonly hasDoubleDamage: boolean;
  readonly hasGuards: boolean;
  /**
   * Czy którakolwiek jednostka nakłada obrażenia w czasie albo ma szarżę (ADR 0021). Bez nich
   * walka nie ma tablic tych cech i żadna faza ticka do nich nie zagląda.
   */
  readonly hasDot: boolean;
  readonly hasCharge: boolean;
  /**
   * Czy w walce jest przyzywacz (ADR 0020). Bez nich walka ma tylko jednostki składów
   * i żadna faza ticka nie zagląda do miejsc przyzwanych.
   */
  readonly hasSummons: boolean;
  /** `unitId` przyzywaczy, rosnąco: w tej kolejności zajmują wolne miejsca w jednym ticku. */
  readonly summoners: readonly number[];
  /** Specyfikacja jednostki przyzywanej przez jednostkę składu o danym `unitId`; null dla reszty. */
  readonly summonSpecs: readonly (UnitSpec | null)[];
  /** Narastający hash wszystkich zdarzeń walki. */
  eventHash: number;
}

/**
 * Stawia jednostkę o danej specyfikacji w miejscu `unitId`: przy tworzeniu walki dla składów,
 * w trakcie walki dla przyzwanych. Zeruje cały stan miejsca, więc nic nie zostaje po poprzedniku.
 */
export function placeUnit(battle: Battle, unitId: number, spec: UnitSpec, x: number): void {
  const { specs, state } = battle;
  specs.maxHp[unitId] = spec.maxHp;
  specs.attack[unitId] = spec.attack;
  specs.moveStep[unitId] = spec.moveStep;
  specs.range[unitId] = spec.range;
  specs.knockback[unitId] = spec.knockback;
  specs.attackInterval[unitId] = spec.attackInterval;
  specs.swingTicks[unitId] = spec.swingTicks;
  specs.hitTick[unitId] = spec.hitTick;
  specs.projectileStep[unitId] = spec.projectileStep;
  specs.pierce[unitId] = spec.pierce ? 1 : 0;
  specs.healAmount[unitId] = spec.healAmount;
  specs.healInterval[unitId] = spec.healInterval;
  specs.healTeam[unitId] = spec.healTeam ? 1 : 0;
  // Próg i obrażenia szału liczymy raz: w gorącej pętli zostaje jedno porównanie.
  // `hp < ceil(maxHp × próg / 100)` to dla całkowitego hp to samo co `hp × 100 < maxHp × próg`.
  specs.enrageHp[unitId] = mulDivCeil(spec.maxHp, spec.enrageHpPercent, 100);
  specs.enragedAttack[unitId] =
    spec.attack + mulDivFloor(spec.attack, spec.enrageAttackPercent, 100);
  specs.lifesteal[unitId] = spec.lifestealPercent;
  specs.splashRadius[unitId] = spec.splashRadius;
  specs.targetLast[unitId] = spec.targetLast ? 1 : 0;
  specs.doubleDamagePercent[unitId] = spec.doubleDamagePercent;
  specs.dodgePercent[unitId] = spec.dodgePercent;
  specs.shieldPercent[unitId] = spec.shieldPercent;
  specs.summoner[unitId] = spec.summon === null ? 0 : 1;
  if (battle.hasDot) {
    specs.dotDamage[unitId] = spec.dotDamage;
    specs.dotInterval[unitId] = spec.dotInterval;
    specs.dotTicks[unitId] = spec.dotTicks;
    specs.dotKind[unitId] = spec.dotKind;
    // Efekty poprzednika z tego miejsca (przyzwanego, który zginął) nie przechodzą na następcę.
    clearDots(state, unitId);
  }
  if (battle.hasCharge) state.chargeBonus[unitId] = spec.chargePercent;

  state.status[unitId] = STATUS_IDLE;
  state.x[unitId] = x;
  state.prevX[unitId] = x;
  state.hp[unitId] = spec.maxHp;
  state.target[unitId] = -1;
  state.swingTick[unitId] = -1;
  // Pierwszy atak jest dostępny od razu, bez czekania na pełny odstęp.
  state.sinceAttack[unitId] = spec.attackInterval;
  state.traitTimer[unitId] = 0;
  state.doubleCharge[unitId] = 0;
  state.dodgeCharge[unitId] = 0;
}

/** Tworzy walkę z jednostkami na pozycjach startowych. Rzuca błąd, gdy setup łamie niezmienniki. */
export function createBattle(setup: BattleSetup): Battle {
  const problems = validateSetup(setup);
  if (problems.length > 0) throw new Error(`Invalid battle setup:\n${problems.join('\n')}`);

  const healers: number[] = [];
  const summoners: number[] = [];
  const summonSpecs: (UnitSpec | null)[] = [];
  let hasTargetLast = false;
  let hasDoubleDamage = false;
  let hasGuards = false;
  let hasDot = false;
  let hasCharge = false;
  // Leczący przyzwani: leczenie okresowe musi wtedy zaglądać do miejsc przyzwanych tej strony.
  let healingPlayerSummons = false;
  let healingEnemySummons = false;
  for (let unitId = 0; unitId < SQUAD_UNITS; unitId++) {
    const spec =
      (unitId < TEAM_SIZE ? setup.player[unitId] : setup.enemy[unitId - TEAM_SIZE]) ?? null;
    const summon = spec === null ? null : spec.summon;
    summonSpecs.push(summon);
    if (spec === null) continue;
    if (spec.targetLast) hasTargetLast = true;
    if (spec.doubleDamagePercent > 0) hasDoubleDamage = true;
    if (spec.dodgePercent > 0 || spec.shieldPercent > 0) hasGuards = true;
    if (spec.dotDamage > 0) hasDot = true;
    if (spec.chargePercent > 0) hasCharge = true;
    if (summon === null) continue;
    // Cechy przyzwanych liczą się tak samo jak cechy składu: mogą pojawić się w walce.
    if (summon.targetLast) hasTargetLast = true;
    if (summon.doubleDamagePercent > 0) hasDoubleDamage = true;
    if (summon.dodgePercent > 0 || summon.shieldPercent > 0) hasGuards = true;
    if (summon.dotDamage > 0) hasDot = true;
    if (summon.chargePercent > 0) hasCharge = true;
    summoners.push(unitId);
    if (summon.healAmount > 0) {
      if (unitId < TEAM_SIZE) healingPlayerSummons = true;
      else healingEnemySummons = true;
    }
  }
  const hasSummons = summoners.length > 0;
  const unitSpan = hasSummons ? MAX_UNITS : SQUAD_UNITS;
  const battle: Battle = {
    width: setup.arena.width,
    timeLimitTicks: setup.arena.timeLimitTicks,
    specs: createSpecs(unitSpan, hasDot),
    state: createState(unitSpan, { dot: hasDot, charge: hasCharge }),
    events: createEventBuffer(),
    pending: createPending(unitSpan),
    healers,
    hasTargetLast,
    hasDoubleDamage,
    hasGuards,
    hasDot,
    hasCharge,
    hasSummons,
    summoners,
    summonSpecs,
    eventHash: EVENT_HASH_SEED,
  };
  for (let slot = 0; slot < TEAM_SIZE; slot++) {
    const player = setup.player[slot];
    if (player != null) placeUnit(battle, slot, player, setup.arena.playerSlots[slot] ?? 0);
    const enemy = setup.enemy[slot];
    if (enemy != null) {
      placeUnit(battle, TEAM_SIZE + slot, enemy, setup.arena.enemySlots[slot] ?? 0);
    }
  }
  for (let unitId = 0; unitId < SQUAD_UNITS; unitId++) {
    if ((battle.specs.healAmount[unitId] ?? 0) > 0) healers.push(unitId);
  }
  if (healingPlayerSummons) {
    for (let unitId = SQUAD_UNITS; unitId < SQUAD_UNITS + TEAM_SIZE; unitId++) healers.push(unitId);
  }
  if (healingEnemySummons) {
    for (let unitId = SQUAD_UNITS + TEAM_SIZE; unitId < MAX_UNITS; unitId++) healers.push(unitId);
  }
  return battle;
}
