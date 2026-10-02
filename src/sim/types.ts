// Wejście symulacji i stałe kodujące stan. Wszystkie wartości są liczbami całkowitymi:
// czas w tickach, odległości w podjednostkach (ADR 0002). Symulacja nie zna treści gry;
// gotowe specyfikacje przygotowuje kompilacja treści.

export const TEAM_SIZE = 5;
export const MAX_UNITS = TEAM_SIZE * 2;
export const MAX_PROJECTILES = 64;

/** Drużyna gracza zajmuje `unitId` 0..4 (indeks = slot), przeciwnik 5..9. */
export const TEAM_PLAYER = 0;
export const TEAM_ENEMY = 1;

export const STATUS_EMPTY = 0;
export const STATUS_IDLE = 1;
export const STATUS_MOVING = 2;
export const STATUS_ATTACKING = 3;
export const STATUS_DEAD = 4;

export const OUTCOME_IN_PROGRESS = 0;
export const OUTCOME_WIN = 1;
export const OUTCOME_LOSS = 2;

export const REASON_NONE = 0;
/** Jedna strona straciła wszystkie jednostki. */
export const REASON_ELIMINATED = 1;
/** Obie strony zginęły w tym samym ticku. */
export const REASON_MUTUAL = 2;
export const REASON_TIMEOUT = 3;

export interface UnitSpec {
  readonly maxHp: number;
  readonly attack: number;
  /** Krok ruchu: podjednostki na tick. */
  readonly moveStep: number;
  /** Zasięg rozpoczęcia ataku w podjednostkach. */
  readonly range: number;
  /** Siła odrzutu i zarazem opór przed odrzutem, w podjednostkach. */
  readonly knockback: number;
  /** Ticki między początkami kolejnych ataków; co najmniej `swingTicks`. */
  readonly attackInterval: number;
  /** Długość zamachu w tickach; co najmniej 2. */
  readonly swingTicks: number;
  /** Tick zamachu, w którym następuje trafienie albo wystrzał: 1..swingTicks-1. */
  readonly hitTick: number;
  /** Krok pocisku w podjednostkach na tick; 0 oznacza atak wręcz. */
  readonly projectileStep: number;
  /** Pociski trafiają każdego wroga na drodze zamiast pierwszego. */
  readonly pierce: boolean;
  /** Leczenie okresowe: wartość jednego leczenia; 0 oznacza brak cechy. */
  readonly healAmount: number;
  /** Leczenie okresowe: odstęp w tickach. */
  readonly healInterval: number;
  /** Leczenie okresowe obejmuje wszystkich żywych sojuszników zamiast samej jednostki. */
  readonly healTeam: boolean;
  /** Szał: próg w procentach maxHp, poniżej którego ataki zadają więcej; 0 oznacza brak cechy. */
  readonly enrageHpPercent: number;
  /** Szał: o ile procent `attack` rosną obrażenia poniżej progu (zaokrąglenie w dół). */
  readonly enrageAttackPercent: number;
  /** Kradzież życia: procent zadanych obrażeń, o który jednostka się leczy; 0 oznacza brak cechy. */
  readonly lifestealPercent: number;
}

export interface ArenaSpec {
  /** Szerokość pola walki w podjednostkach; pozycje mieszczą się w 0..width. */
  readonly width: number;
  /** Pozycje startowe slotów gracza; indeks = slot, slot 0 najbliżej środka. */
  readonly playerSlots: readonly number[];
  readonly enemySlots: readonly number[];
  /** Po tylu tickach bez rozstrzygnięcia gracz przegrywa. */
  readonly timeLimitTicks: number;
}

export interface BattleSetup {
  readonly arena: ArenaSpec;
  /** Jednostki gracza per slot; null to pusty slot. */
  readonly player: readonly (UnitSpec | null)[];
  readonly enemy: readonly (UnitSpec | null)[];
}

/** Drużyna jednostki o danym `unitId`. */
export function teamOf(unitId: number): number {
  return unitId < TEAM_SIZE ? TEAM_PLAYER : TEAM_ENEMY;
}

/** Kierunek „do przodu” drużyny na osi pola: gracz idzie w prawo, przeciwnik w lewo. */
export function forwardOf(team: number): number {
  return team === TEAM_PLAYER ? 1 : -1;
}
