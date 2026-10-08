// Kolejka trafień. Ciosy wręcz i pociski dopisują tu swoje skutki; HP i pozycję odrzuconych
// zmienia dopiero faza rozstrzygnięcia, dla wszystkich jednostek naraz.
import { mulDivFloor } from '../core/int.ts';
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import { afflict } from './dot.ts';
import { EVENT_DAMAGED, EVENT_DODGED, pushEvent } from './events.ts';
import { SQUAD_UNITS } from './types.ts';

/** Próg licznika stałego rytmu: procenty cech liczą się na sto ataków albo trafień. */
const RHYTHM = 100;

/**
 * Obrażenia kolejnego ataku jednostki: z premią szału, gdy jej HP jest poniżej progu, z premią
 * szarży, gdy to jej pierwszy atak w walce, i podwojone, gdy wypada na to rytm cechy
 * `doubleDamage`. Wołane raz na atak (cios, który doszedł celu, albo wystrzał), bo zużywa
 * szarżę i przesuwa licznik rytmu tej jednostki.
 * HP zmienia się tylko w rozstrzygnięciu ticka, a licznik należy do samej jednostki, więc wynik
 * nie zależy od kolejności jednostek.
 */
export function nextAttackDamage(battle: Battle, unitId: number): number {
  const { specs, state } = battle;
  let damage =
    (state.hp[unitId] ?? 0) < (specs.enrageHp[unitId] ?? 0)
      ? (specs.enragedAttack[unitId] ?? 0)
      : (specs.attack[unitId] ?? 0);
  if (battle.hasCharge) {
    const bonus = state.chargeBonus[unitId] ?? 0;
    if (bonus !== 0) {
      state.chargeBonus[unitId] = 0;
      damage += mulDivFloor(damage, bonus, 100);
    }
  }
  if (!battle.hasDoubleDamage) return damage;
  const percent = specs.doubleDamagePercent[unitId] ?? 0;
  if (percent === 0) return damage;
  const charge = (state.doubleCharge[unitId] ?? 0) + percent;
  if (charge < RHYTHM) {
    state.doubleCharge[unitId] = charge;
    return damage;
  }
  state.doubleCharge[unitId] = charge - RHYTHM;
  return damage * 2;
}

/**
 * Dopisuje trafienie do kolejki. `knockback` to odrzut źródła (dla pocisku: strzelca z chwili
 * wystrzału); trafiony jest odpychany o różnicę ponad własny odrzut, nigdy przyciągany.
 *
 * Cechy trafionego: unik (stały rytm) znosi trafienie w całości, razem z odrzutem, kradzieżą
 * życia i efektem obrażeń w czasie; tarcza zmniejsza obrażenia o swój procent (zaokrąglenie w dół). Trafienia jednego
 * ticka przychodzą w stałej kolejności (jednostki po `unitId`, pociski po kolei wystrzelenia),
 * więc to, które z nich wypada na unik, jest zawsze takie samo.
 */
export function queueHit(
  battle: Battle,
  source: number,
  target: number,
  rawDamage: number,
  knockback: number,
): void {
  const { state, pending, specs } = battle;
  let damage = rawDamage;
  if (battle.hasGuards) {
    const dodge = specs.dodgePercent[target] ?? 0;
    if (dodge !== 0) {
      const charge = (state.dodgeCharge[target] ?? 0) + dodge;
      if (charge >= RHYTHM) {
        state.dodgeCharge[target] = charge - RHYTHM;
        pushEvent(battle.events, EVENT_DODGED, target, source, 0);
        return;
      }
      state.dodgeCharge[target] = charge;
    }
    const shield = specs.shieldPercent[target] ?? 0;
    if (shield !== 0) damage = mulDivFloor(rawDamage, RHYTHM - shield, RHYTHM);
  }
  pending.damage[target] = (pending.damage[target] ?? 0) + damage;
  const push = knockback - (battle.specs.knockback[target] ?? 0);
  if (push > 0) pending.knockback[target] = (pending.knockback[target] ?? 0) + push;
  // Obrażenia przyzwanych liczą się w wyniku walki ich przyzywaczowi: miejsce przyzwanych
  // zajmują po kolei różne jednostki, a gracz wystawił do walki przyzywacza.
  const credited = source < SQUAD_UNITS ? source : (state.summonedBy[source] ?? source);
  state.damageDealt[credited] = (state.damageDealt[credited] ?? 0) + damage;
  pushEvent(battle.events, EVENT_DAMAGED, target, damage, source);
  if (battle.hasDot) afflict(battle, source, target);

  // Kradzież życia: leczenie trafia do tej samej kolejki, więc może uratować źródło przed
  // śmiercią w tym samym ticku. Liczy się od obrażeń ciosu (po tarczy celu), nie od HP, które
  // cel jeszcze miał.
  // Martwy strzelec nie leczy się z pocisków, które jeszcze lecą: kolejka martwych jest pusta.
  const steal = battle.specs.lifesteal[source] ?? 0;
  if (steal > 0 && isAlive(state.status[source] ?? 0)) {
    const heal = mulDivFloor(damage, steal, 100);
    pending.heal[source] = (pending.heal[source] ?? 0) + heal;
    state.healingDone[source] = (state.healingDone[source] ?? 0) + heal;
  }
}
