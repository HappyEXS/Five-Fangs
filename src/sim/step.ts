// Jeden tick symulacji (docs/ARCHITECTURE.md §3.4).
//
// Logiczna kolejność faz: decyzje → ruch → ataki → pociski → cechy okresowe → rozstrzygnięcie
// → śmierci. Decyzja, ruch i atak czytają wyłącznie pozycje z początku ticka i nie zmieniają
// HP ani tego, kto żyje, więc dla jednej jednostki można je wykonać od razu po sobie, zanim
// zdecyduje następna: wynik jest taki sam jak przy trzech osobnych przejściach, a tick ma
// mniej pętli. To samo dotyczy rozstrzygnięcia i śmierci.
import { hashInt32 } from '../core/hash.ts';
import { progressAttack } from './attack.ts';
import type { Battle } from './battle.ts';
import { backUnit, decideUnit, frontUnit, isAlive } from './decide.ts';
import { clearEvents } from './events.ts';
import { hashEvents } from './hash.ts';
import { moveUnit } from './move.ts';
import { moveProjectiles } from './projectiles.ts';
import { resolveAndFinish } from './resolve.ts';
import { applyPeriodicHeals } from './traits.ts';
import {
  isPlayerUnit,
  OUTCOME_IN_PROGRESS,
  STATUS_ATTACKING,
  STATUS_MOVING,
  TEAM_SIZE,
} from './types.ts';

/** Wykonuje jeden tick. Po zakończeniu walki nic nie robi. */
export function stepBattle(battle: Battle): void {
  const { state } = battle;
  if (state.outcome !== OUTCOME_IN_PROGRESS) return;
  const { status, x, prevX, projX, projPrevX, unitSpan } = state;
  const { targetLast } = battle.specs;

  // Faza 0: zapamiętanie pozycji z początku ticka i wyczyszczenie zdarzeń.
  // Pętle zamiast TypedArray.set(): przy 10–20 elementach wywołanie wbudowane kosztuje więcej.
  clearEvents(battle.events);
  for (let i = 0; i < unitSpan; i++) prevX[i] = x[i] ?? 0;
  for (let p = 0; p < state.projCount; p++) projPrevX[p] = projX[p] ?? 0;

  // Fazy 1–3: decyzja, ruch i postęp ataku każdej żywej jednostki.
  const frontPlayer = frontUnit(state, 0);
  const frontEnemy = frontUnit(state, TEAM_SIZE);
  // Koniec szyku liczymy tylko w walkach, w których ktoś w niego celuje (cecha targetLast);
  // pozostałe walki nie czytają nawet flagi jednostki.
  const aimsLast = battle.hasTargetLast;
  const backPlayer = aimsLast ? backUnit(state, 0) : -1;
  const backEnemy = aimsLast ? backUnit(state, TEAM_SIZE) : -1;
  for (let i = 0; i < unitSpan; i++) {
    if (!isAlive(status[i] ?? 0)) continue;
    const player = isPlayerUnit(i);
    let enemy = player ? frontEnemy : frontPlayer;
    if (aimsLast && (targetLast[i] ?? 0) !== 0) enemy = player ? backEnemy : backPlayer;
    const action = decideUnit(battle, i, enemy);
    if (action === STATUS_MOVING) moveUnit(battle, i);
    else if (action === STATUS_ATTACKING) progressAttack(battle, i);
  }

  // Faza 4: pociski, także te wystrzelone przed chwilą.
  moveProjectiles(battle);

  // Faza 5: cechy okresowe.
  if (battle.healers.length > 0) applyPeriodicHeals(battle);

  // Fazy 6–7: jednoczesne rozstrzygnięcie, śmierci i warunek końca.
  resolveAndFinish(battle);

  // Hash logu obejmuje numer ticka, więc różni się także wtedy, gdy te same zdarzenia
  // zaszły w innym momencie. Ticki bez zdarzeń nie wnoszą nic i są pomijane.
  if (battle.events.count > 0) {
    battle.eventHash = hashEvents(hashInt32(battle.eventHash, state.tick), battle.events);
  }
}
