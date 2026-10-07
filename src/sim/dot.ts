// Obrażenia w czasie (ADR 0021): krwawienie i trucizna. Trafienie jednostki z tą cechą nakłada
// na trafionego efekt, który tyka w fazie cech okresowych i dopisuje obrażenia do tej samej
// kolejki co ciosy, więc HP zmienia się dalej tylko w rozstrzygnięciu ticka.
//
// Jednostka ma najwyżej jeden efekt każdego rodzaju. Kolejne trafienie nie sumuje efektów:
// odnawia liczbę tyknięć, a rytm tyknięć biegnie dalej bez zmian, więc częste trafienia ani
// nie przyspieszają obrażeń, ani ich nie wstrzymują.
import { mulDivFloor } from '../core/int.ts';
import type { Battle } from './battle.ts';
import { EVENT_AFFLICTED, EVENT_DAMAGED, pushEvent } from './events.ts';
import type { BattleState } from './state.ts';
import { DOT_KINDS, SQUAD_UNITS } from './types.ts';

/**
 * Nakłada na `target` efekt jednostki `source` po trafieniu, które doszło celu (unik znosi
 * trafienie razem z efektem). Tarcza trafionego zmniejsza obrażenia efektu tak jak obrażenia
 * ciosu; liczymy to raz, przy nałożeniu.
 *
 * Gdy trafiony ma już efekt tego rodzaju: słabsze trafienie niczego nie zmienia, równe albo
 * silniejsze przejmuje efekt (obrażenia, odstęp, źródło) i odnawia liczbę tyknięć. Trafienia
 * jednego ticka przychodzą w stałej kolejności, więc przy równej sile efekt należy do ostatniego
 * z nich.
 */
export function afflict(battle: Battle, source: number, target: number): void {
  const { specs, state } = battle;
  const base = specs.dotDamage[source] ?? 0;
  if (base === 0) return;
  const shield = specs.shieldPercent[target] ?? 0;
  const damage = shield === 0 ? base : mulDivFloor(base, 100 - shield, 100);
  if (damage === 0) return;

  const kind = specs.dotKind[source] ?? 0;
  const k = kind * state.unitSpan + target;
  const interval = specs.dotInterval[source] ?? 1;
  if ((state.dotLeft[k] ?? 0) === 0) {
    // Nowy efekt: pierwsze tyknięcie pełny odstęp po trafieniu.
    state.dotNext[k] = state.tick + interval;
    pushEvent(battle.events, EVENT_AFFLICTED, target, kind, source);
  } else if (damage < (state.dotDamage[k] ?? 0)) {
    return;
  }
  state.dotLeft[k] = specs.dotTicks[source] ?? 0;
  state.dotDamage[k] = damage;
  state.dotInterval[k] = interval;
  state.dotSource[k] = source;
}

/**
 * Faza 5: tyknięcia efektów. Obrażenia trafiają do kolejki, bez odrzutu, uniku i kradzieży
 * życia: to nie jest trafienie. W wyniku walki liczą się jednostce, która nałożyła efekt,
 * także gdy już nie żyje.
 *
 * Efekty mają tylko żywe jednostki: śmierć i postawienie nowej jednostki w miejscu czyszczą je
 * (`clearDots`), a nałożyć efekt można tylko trafieniem w żywą jednostkę.
 */
export function tickDots(battle: Battle): void {
  const { state, pending } = battle;
  const { dotLeft, dotNext, unitSpan, tick } = state;
  for (let k = 0; k < dotLeft.length; k++) {
    const left = dotLeft[k] ?? 0;
    if (left === 0 || dotNext[k] !== tick) continue;
    dotLeft[k] = left - 1;
    dotNext[k] = tick + (state.dotInterval[k] ?? 1);

    const unit = k % unitSpan;
    const damage = state.dotDamage[k] ?? 0;
    const source = state.dotSource[k] ?? 0;
    pending.damage[unit] = (pending.damage[unit] ?? 0) + damage;
    // Tak jak przy trafieniach: obrażenia przyzwanych liczą się ich przyzywaczowi.
    const credited = source < SQUAD_UNITS ? source : (state.summonedBy[source] ?? source);
    state.damageDealt[credited] = (state.damageDealt[credited] ?? 0) + damage;
    pushEvent(battle.events, EVENT_DAMAGED, unit, damage, source);
  }
}

/** Zdejmuje z jednostki wszystkie efekty: przy śmierci i gdy w jej miejscu staje nowa jednostka. */
export function clearDots(state: BattleState, unit: number): void {
  for (let kind = 0; kind < DOT_KINDS; kind++) state.dotLeft[kind * state.unitSpan + unit] = 0;
}
