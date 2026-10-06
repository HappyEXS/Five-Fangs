// Przyzywanie (ADR 0020). Przyzywacz zamiast atakować dopisuje w ticku trafienia swojego
// zamachu prośbę o jednostkę; jednostki stają na polu w rozstrzygnięciu ticka, razem
// z obrażeniami i leczeniem, więc nikt nie działa w ticku, w którym się pojawił.
//
// Każda strona ma TEAM_SIZE miejsc na przyzwanych, wspólnych dla wszystkich jej przyzywaczy.
// Miejsce jest wolne, gdy nikt w nim nie stał albo jego jednostka zginęła.
import { type Battle, placeUnit } from './battle.ts';
import { isAlive } from './decide.ts';
import { EVENT_SUMMONED, pushEvent } from './events.ts';
import type { BattleState } from './state.ts';
import { PROJECTILE_AIMED, SQUAD_UNITS, TEAM_SIZE } from './types.ts';

/**
 * Usuwa odwołania do jednostki, która wcześniej stała w tym miejscu: zamach wymierzony
 * w poprzednika chybia, pocisk wycelowany w niego nie trafia nikogo, a przebijający, który
 * poprzednika już trafił, może trafić nową jednostkę.
 */
function forgetPrevious(state: BattleState, slot: number): void {
  const { target, projHitMask, projMode, projTarget } = state;
  for (let i = 0; i < state.unitSpan; i++) {
    if (target[i] === slot) target[i] = -1;
  }
  const bit = 1 << slot;
  for (let p = 0; p < state.projCount; p++) {
    projHitMask[p] = (projHitMask[p] ?? 0) & ~bit;
    if (projMode[p] === PROJECTILE_AIMED && projTarget[p] === slot) projTarget[p] = -1;
  }
}

/**
 * Stawia na polu jednostki, o które w tym ticku poprosili przyzywacze strony zaczynającej się
 * od `teamFirst` (0 albo TEAM_SIZE). Zwraca liczbę postawionych. Przyzywacze są obsługiwani
 * po `unitId`; każdy bierze najbliższe wolne miejsce od znacznika kolejki okrężnej, a gdy
 * wolnego nie ma, jego przyzwanie przepada.
 */
export function spawnSummons(battle: Battle, teamFirst: number): number {
  const { state, pending, summoners } = battle;
  const side = teamFirst === 0 ? 0 : 1;
  const first = SQUAD_UNITS + teamFirst;
  let spawned = 0;
  for (let s = 0; s < summoners.length; s++) {
    const summoner = summoners[s] ?? 0;
    if (summoner < teamFirst || summoner >= teamFirst + TEAM_SIZE) continue;
    if ((pending.summon[summoner] ?? 0) === 0) continue;
    pending.summon[summoner] = 0;
    const spec = battle.summonSpecs[summoner];
    if (spec == null) continue;

    let cursor = state.summonCursor[side] ?? 0;
    for (let tried = 0; tried < TEAM_SIZE; tried++) {
      const slot = first + cursor;
      cursor = cursor + 1 === TEAM_SIZE ? 0 : cursor + 1;
      if (isAlive(state.status[slot] ?? 0)) continue;
      // Przyzwanie doszło do skutku w chwili trafienia zamachu, więc jednostka staje tam, gdzie
      // przyzywacz jest po odrzucie z tego ticka, także gdy sam w nim zginął.
      const x = state.x[summoner] ?? 0;
      forgetPrevious(state, slot);
      placeUnit(battle, slot, spec, x);
      state.summonedBy[slot] = summoner;
      state.summonCursor[side] = cursor;
      pushEvent(battle.events, EVENT_SUMMONED, slot, summoner, x);
      spawned++;
      break;
    }
  }
  return spawned;
}
