// Faza 1: decyzje. Każda żywa jednostka poza zamachem wybiera cel i akcję na ten tick.
// Decyzja czyta wyłącznie pozycje z początku ticka (`prevX`), więc nie zależy od tego,
// które jednostki zdążyły się już ruszyć.
import type { Battle } from './battle.ts';
import { EVENT_ATTACK_STARTED, pushEvent } from './events.ts';
import type { BattleState } from './state.ts';
import {
  isPlayerUnit,
  SQUAD_UNITS,
  STATUS_ATTACKING,
  STATUS_IDLE,
  STATUS_MOVING,
  TEAM_SIZE,
} from './types.ts';

/** Jednostka żyje, gdy stoi, idzie albo atakuje. */
export function isAlive(status: number): boolean {
  return status >= STATUS_IDLE && status <= STATUS_ATTACKING;
}

/**
 * Najbardziej wysunięta w kierunku `sign` żywa jednostka spośród TEAM_SIZE miejsc od `from`,
 * o ile wyprzedza dotychczasową `best` (-1: nikogo jeszcze nie ma). Przy równej pozycji zostaje
 * wcześniej znaleziona, czyli ta o niższym `unitId`.
 */
function foremost(state: BattleState, from: number, sign: number, best: number): number {
  const { status, x } = state;
  let front = best;
  let frontX = best === -1 ? 0 : (x[best] ?? 0) * sign;
  for (let i = from; i < from + TEAM_SIZE; i++) {
    if (!isAlive(status[i] ?? 0)) continue;
    const position = (x[i] ?? 0) * sign;
    if (front === -1 || position > frontX) {
      front = i;
      frontX = position;
    }
  }
  return front;
}

/**
 * Żywa jednostka drużyny stojąca najbliżej przeciwnika, albo -1. `firstId` to 0 dla gracza
 * (szukamy największego x) albo TEAM_SIZE dla przeciwnika (najmniejszego x). Drużyna to skład
 * i jej przyzwani. Przy równej pozycji wygrywa niższe `unitId`.
 *
 * Funkcja działa dwa razy w każdym ticku, więc pętla po składzie jest wpisana tutaj i taka sama
 * jak przed dodaniem przyzywania; miejsca przyzwanych przegląda `foremost`, wołana tylko w walce
 * z przyzywaczami. Wspólna pętla po obu zakresach albo pętla składu wyniesiona do funkcji
 * spowalniały każdą walkę o kilka procent (pomiar w ARCHITECTURE.md §3.8).
 */
export function frontUnit(state: BattleState, firstId: number): number {
  const { status, x } = state;
  const sign = firstId === 0 ? 1 : -1;
  let front = -1;
  let frontX = 0;
  for (let i = firstId; i < firstId + TEAM_SIZE; i++) {
    if (!isAlive(status[i] ?? 0)) continue;
    const position = (x[i] ?? 0) * sign;
    if (front === -1 || position > frontX) {
      front = i;
      frontX = position;
    }
  }
  if (state.unitSpan === SQUAD_UNITS) return front;
  return foremost(state, firstId + SQUAD_UNITS, sign, front);
}

/**
 * Żywa jednostka drużyny stojąca najdalej od przeciwnika (koniec szyku), albo -1: lustrzane
 * odbicie `frontUnit`. Przy równej pozycji wygrywa niższe `unitId`. To cel jednostek z cechą
 * targetLast; liczony tylko w walkach, w których ktoś ją ma.
 */
export function backUnit(state: BattleState, firstId: number): number {
  const sign = firstId === 0 ? -1 : 1;
  const back = foremost(state, firstId, sign, -1);
  if (state.unitSpan === SQUAD_UNITS) return back;
  return foremost(state, firstId + SQUAD_UNITS, sign, back);
}

/**
 * Najbliższy żywy wróg jednostki albo -1; przy równej odległości niższe `unitId`.
 *
 * Wrogie jednostki nigdy się nie mijają (gwarantuje to walidacja setupu), więc wszyscy
 * przeciwnicy stoją po tej samej stronie jednostki. Najbliższym jest zatem zawsze ten
 * najbardziej wysunięty, ten sam dla całej drużyny, i wystarczy wyznaczyć go raz na tick.
 */
export function nearestEnemy(state: BattleState, unitId: number): number {
  return frontUnit(state, isPlayerUnit(unitId) ? TEAM_SIZE : 0);
}

/** Czy strona jednostki `unitId` ma wolne miejsce na przyzwanego (nikt w nim nie żyje). */
export function hasFreeSummonSlot(state: BattleState, unitId: number): boolean {
  const first = isPlayerUnit(unitId) ? SQUAD_UNITS : SQUAD_UNITS + TEAM_SIZE;
  for (let slot = first; slot < first + TEAM_SIZE; slot++) {
    if (!isAlive(state.status[slot] ?? 0)) return true;
  }
  return false;
}

/**
 * Decyzja żywej jednostki `i`; `enemy` to jej cel z początku ticka albo -1: najbliższy żywy
 * wróg, a dla jednostki z cechą targetLast ostatni w szyku. Zwraca status jednostki na ten tick.
 */
export function decideUnit(battle: Battle, i: number, enemy: number): number {
  const { state, specs } = battle;
  if (state.status[i] === STATUS_ATTACKING) {
    // W trakcie zamachu jednostka nie zmienia celu ani się nie rusza.
    if ((state.swingTick[i] ?? 0) < (specs.swingTicks[i] ?? 0)) return STATUS_ATTACKING;
    state.swingTick[i] = -1;
  }

  state.target[i] = enemy;
  let next = STATUS_IDLE;
  if (enemy !== -1) {
    const distance = Math.abs((state.prevX[enemy] ?? 0) - (state.prevX[i] ?? 0));
    if (distance > (specs.range[i] ?? 0)) {
      next = STATUS_MOVING;
    } else if (
      (state.sinceAttack[i] ?? 0) >= (specs.attackInterval[i] ?? 0) &&
      // Przyzywacz zaczyna zamach tylko wtedy, gdy jego strona ma wolne miejsce; odstęp biegnie
      // dalej, więc przyzwie od razu, gdy miejsce się zwolni.
      !(battle.hasSummons && (specs.summoner[i] ?? 0) !== 0 && !hasFreeSummonSlot(state, i))
    ) {
      next = STATUS_ATTACKING;
      state.swingTick[i] = 0;
      state.sinceAttack[i] = 0;
      pushEvent(battle.events, EVENT_ATTACK_STARTED, i, enemy, 0);
    }
    // W przeciwnym razie cel jest w zasięgu, ale odstęp między atakami jeszcze trwa.
  }
  state.status[i] = next;
  return next;
}
