// Walka: niezmienne wejście (arena, specyfikacje) i zmienny stan.
import { mulDivCeil, mulDivFloor } from '../core/int.ts';
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
import { type BattleSetup, MAX_UNITS, STATUS_IDLE, TEAM_SIZE, type UnitSpec } from './types.ts';
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
  /** Narastający hash wszystkich zdarzeń walki. */
  eventHash: number;
}

function placeUnit(battle: Battle, unitId: number, spec: UnitSpec, x: number): void {
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

  state.status[unitId] = STATUS_IDLE;
  state.x[unitId] = x;
  state.prevX[unitId] = x;
  state.hp[unitId] = spec.maxHp;
  // Pierwszy atak jest dostępny od razu, bez czekania na pełny odstęp.
  state.sinceAttack[unitId] = spec.attackInterval;
}

/** Tworzy walkę z jednostkami na pozycjach startowych. Rzuca błąd, gdy setup łamie niezmienniki. */
export function createBattle(setup: BattleSetup): Battle {
  const problems = validateSetup(setup);
  if (problems.length > 0) throw new Error(`Invalid battle setup:\n${problems.join('\n')}`);

  const healers: number[] = [];
  let hasTargetLast = false;
  for (let slot = 0; slot < TEAM_SIZE; slot++) {
    if (setup.player[slot]?.targetLast === true || setup.enemy[slot]?.targetLast === true) {
      hasTargetLast = true;
    }
  }
  const battle: Battle = {
    width: setup.arena.width,
    timeLimitTicks: setup.arena.timeLimitTicks,
    specs: createSpecs(),
    state: createState(),
    events: createEventBuffer(),
    pending: createPending(),
    healers,
    hasTargetLast,
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
  for (let unitId = 0; unitId < MAX_UNITS; unitId++) {
    if ((battle.specs.healAmount[unitId] ?? 0) > 0) healers.push(unitId);
  }
  return battle;
}
