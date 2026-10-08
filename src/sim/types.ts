// Wejście symulacji i stałe kodujące stan. Wszystkie wartości są liczbami całkowitymi:
// czas w tickach, odległości w podjednostkach (ADR 0002). Symulacja nie zna treści gry;
// gotowe specyfikacje przygotowuje kompilacja treści.

export const TEAM_SIZE = 5;
/** Jednostki składów obu stron: `unitId` 0..9. Tyle jednostek ma walka bez przyzywaczy. */
export const SQUAD_UNITS = TEAM_SIZE * 2;
/**
 * Wszystkie miejsca jednostek: składy i miejsca jednostek przyzwanych (ADR 0020), po TEAM_SIZE
 * na stronę. Przyzwani gracza zajmują `unitId` 10..14, przeciwnika 15..19.
 */
export const MAX_UNITS = SQUAD_UNITS * 2;
export const MAX_PROJECTILES = 64;

/**
 * Drużyna gracza zajmuje `unitId` 0..4 (indeks = slot), przeciwnik 5..9; dalej w tym samym
 * układzie leżą miejsca przyzwanych. Dzięki temu jednostki składów mają te same `unitId`
 * w każdej walce, z przyzywaczami i bez.
 *
 * Pętla po drużynie zaczynającej się od `first` (0 albo TEAM_SIZE) ma postać:
 *
 *   for (let base = first; base < first + unitSpan; base += SQUAD_UNITS)
 *     for (let i = base; i < base + TEAM_SIZE; i++) …
 *
 * W walce bez przyzywaczy (`unitSpan` = SQUAD_UNITS) pętla zewnętrzna wykonuje się raz i zostaje
 * sam skład; z przyzywaczami drugi obrót obejmuje miejsca przyzwanych. Kolejność jest rosnąca
 * po `unitId`, więc remisy dalej wygrywa niższe id. Dwie funkcje wołane w każdym ticku
 * (`frontUnit` i ruch pocisków) mają zamiast niej pętlę składu o stałych granicach i osobną
 * funkcję dla przyzwanych: tam zagnieżdżona pętla mierzalnie spowalniała każdą walkę.
 */
export const TEAM_PLAYER = 0;
export const TEAM_ENEMY = 1;

export const STATUS_EMPTY = 0;
export const STATUS_IDLE = 1;
export const STATUS_MOVING = 2;
export const STATUS_ATTACKING = 3;
export const STATUS_DEAD = 4;

/** Tryb pocisku: trafia pierwszego wroga na drodze. */
export const PROJECTILE_FIRST = 0;
/** Trafia każdego wroga, którego minie (cecha pierce). */
export const PROJECTILE_PIERCE = 1;
/** Trafia tylko jednostkę, w którą celował strzelec (cecha targetLast). */
export const PROJECTILE_AIMED = 2;

/** Rodzaje obrażeń w czasie (ADR 0021). Jednostka może mieć naraz po jednym efekcie każdego. */
export const DOT_BLEED = 0;
export const DOT_POISON = 1;
export const DOT_KINDS = 2;

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
  /**
   * Cios obszarowy: promień w podjednostkach wokół celu ciosu wręcz, w którym obrywają także
   * pozostali wrogowie; 0 oznacza brak cechy. Tylko dla ataku wręcz.
   */
  readonly splashRadius: number;
  /**
   * Celuje w żywego wroga stojącego na końcu szyku przeciwnika zamiast w najbliższego, a jej
   * pocisk mija pozostałych i trafia tylko ten cel. Tylko dla ataku z pociskiem; zasięg musi
   * obejmować całe pole, bo jednostka nie może iść do celu przez wrogów stojących bliżej.
   */
  readonly targetLast: boolean;
  /**
   * Podwójne obrażenia w stałym rytmie (bez losu): tyle na każde 100 ataków jest podwójnych,
   * równo rozłożonych; 50 to co drugi atak, 20 co piąty. 0 oznacza brak cechy.
   */
  readonly doubleDamagePercent: number;
  /**
   * Unik w stałym rytmie: tylu na każde 100 trafień jednostka unika w całości (bez obrażeń
   * i odrzutu). 0 oznacza brak cechy.
   */
  readonly dodgePercent: number;
  /**
   * Tarcza: o tyle procent mniejsze są obrażenia każdego trafienia i każdego efektu obrażeń
   * w czasie nałożonego na jednostkę. 0 oznacza brak cechy.
   */
  readonly shieldPercent: number;
  /**
   * Obrażenia w czasie (krwawienie, trucizna; ADR 0021): każde trafienie tej jednostki nakłada
   * na trafionego efekt, który co `dotInterval` ticków zabiera `dotDamage` życia. Wartość
   * jednego tyknięcia; 0 oznacza brak cechy.
   */
  readonly dotDamage: number;
  /** Obrażenia w czasie: odstęp tyknięć w tickach. */
  readonly dotInterval: number;
  /** Obrażenia w czasie: ile razy efekt tyka po ostatnim trafieniu. */
  readonly dotTicks: number;
  /** Obrażenia w czasie: rodzaj efektu, `DOT_BLEED` albo `DOT_POISON`. */
  readonly dotKind: number;
  /**
   * Szarża: o tyle procent większe są obrażenia pierwszego ataku jednostki w walce (200 to cios
   * potrójny). 0 oznacza brak cechy.
   */
  readonly chargePercent: number;
  /**
   * Przyzywacz: zamiast atakować, w ticku trafienia każdego zamachu stawia w swoim miejscu
   * jednostkę o tej specyfikacji, o ile jego strona ma wolne miejsce (najwyżej TEAM_SIZE żywych
   * przyzwanych naraz). Przyzwana jednostka sama nie może przyzywać. null oznacza zwykłą jednostkę.
   */
  readonly summon: UnitSpec | null;
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

/** Czy jednostka (ze składu albo przyzwana) należy do gracza. */
export function isPlayerUnit(unitId: number): boolean {
  return unitId < TEAM_SIZE || (unitId >= SQUAD_UNITS && unitId < SQUAD_UNITS + TEAM_SIZE);
}

/** Drużyna jednostki o danym `unitId`. */
export function teamOf(unitId: number): number {
  return isPlayerUnit(unitId) ? TEAM_PLAYER : TEAM_ENEMY;
}

/** Kierunek „do przodu” drużyny na osi pola: gracz idzie w prawo, przeciwnik w lewo. */
export function forwardOf(team: number): number {
  return team === TEAM_PLAYER ? 1 : -1;
}
