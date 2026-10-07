// Sprawdzenie niezmienników, na których opiera się symulacja. Wołane przy tworzeniu walki
// oraz przez walidator treści dla każdego poziomu. Zwraca listę problemów; pusta = poprawne.
import { type BattleSetup, DOT_KINDS, MAX_PROJECTILES, TEAM_SIZE, type UnitSpec } from './types.ts';

const INTEGER_FIELDS = [
  'maxHp',
  'attack',
  'moveStep',
  'range',
  'knockback',
  'attackInterval',
  'swingTicks',
  'hitTick',
  'projectileStep',
  'healAmount',
  'healInterval',
  'enrageHpPercent',
  'enrageAttackPercent',
  'lifestealPercent',
  'splashRadius',
  'doubleDamagePercent',
  'dodgePercent',
  'shieldPercent',
] as const;

/**
 * Pola cech, których prawie żadna jednostka nie ma (ADR 0021). Walidacja biegnie przy każdym
 * tworzeniu walki, więc sprawdzamy je tylko u jednostki, która taką cechę ma: bez niej symulacja
 * tych pól nie czyta.
 */
const RARE_FIELDS = ['dotDamage', 'dotInterval', 'dotTicks', 'dotKind', 'chargePercent'] as const;

/** Problemy pojedynczej specyfikacji jednostki, niezależne od składu i areny. */
export function validateUnitSpec(label: string, spec: UnitSpec): string[] {
  const problems: string[] = [];
  for (const field of INTEGER_FIELDS) {
    const value = spec[field];
    if (!Number.isInteger(value) || value < 0) {
      problems.push(`${label}: ${field} musi być nieujemną liczbą całkowitą (jest ${value})`);
    }
  }
  if (spec.dotDamage !== 0 || spec.chargePercent !== 0) {
    for (const field of RARE_FIELDS) {
      const value = spec[field];
      if (!Number.isInteger(value) || value < 0) {
        problems.push(`${label}: ${field} musi być nieujemną liczbą całkowitą (jest ${value})`);
      }
    }
  }
  if (problems.length > 0) return problems;

  if (spec.maxHp < 1) problems.push(`${label}: maxHp musi być co najmniej 1`);
  if (spec.range < 1) problems.push(`${label}: range musi być co najmniej 1`);
  if (spec.swingTicks < 2) problems.push(`${label}: swingTicks musi być co najmniej 2`);
  if (spec.hitTick < 1 || spec.hitTick >= spec.swingTicks) {
    problems.push(`${label}: hitTick musi być w przedziale 1..swingTicks-1`);
  }
  if (spec.attackInterval < spec.swingTicks) {
    problems.push(`${label}: attackInterval nie może być krótszy niż swingTicks`);
  }
  if (spec.pierce && spec.projectileStep === 0) {
    problems.push(`${label}: pierce wymaga ataku z pociskiem`);
  }
  if (spec.healAmount > 0 && spec.healInterval < 1) {
    problems.push(`${label}: healInterval musi być co najmniej 1, gdy healAmount > 0`);
  }
  if (spec.enrageHpPercent > 99) {
    problems.push(`${label}: enrageHpPercent musi być w przedziale 0..99`);
  }
  if (spec.enrageHpPercent > 0 !== spec.enrageAttackPercent > 0) {
    problems.push(
      `${label}: enrageHpPercent i enrageAttackPercent muszą być oba zerowe albo oba dodatnie`,
    );
  }
  if (spec.splashRadius > 0 && spec.projectileStep > 0) {
    problems.push(`${label}: splashRadius wymaga ataku wręcz`);
  }
  if (spec.lifestealPercent > 100) {
    problems.push(`${label}: lifestealPercent musi być w przedziale 0..100`);
  }
  if (spec.doubleDamagePercent > 100) {
    problems.push(`${label}: doubleDamagePercent musi być w przedziale 0..100`);
  }
  // Unik albo tarcza 100% dawałyby jednostkę, której nie da się zabić.
  if (spec.dodgePercent > 99) problems.push(`${label}: dodgePercent musi być w przedziale 0..99`);
  if (spec.shieldPercent > 99) {
    problems.push(`${label}: shieldPercent musi być w przedziale 0..99`);
  }
  if (spec.dotDamage > 0) {
    if (spec.dotInterval < 1 || spec.dotTicks < 1) {
      problems.push(`${label}: dotInterval i dotTicks muszą być co najmniej 1, gdy dotDamage > 0`);
    }
    if (spec.dotKind >= DOT_KINDS) {
      problems.push(`${label}: dotKind musi być w przedziale 0..${DOT_KINDS - 1}`);
    }
  }
  if (spec.targetLast && spec.projectileStep === 0) {
    problems.push(`${label}: targetLast wymaga ataku z pociskiem`);
  }
  if (spec.targetLast && spec.pierce) {
    problems.push(`${label}: targetLast nie łączy się z pierce`);
  }
  if (spec.summon !== null) {
    // Przyzywacz nie atakuje: jego zamach kończy się przyzwaniem, więc nie ma pocisku.
    if (spec.projectileStep > 0) {
      problems.push(`${label}: przyzywacz nie może mieć ataku z pociskiem`);
    }
    if (spec.summon.summon !== null) {
      problems.push(`${label}, przyzwany: przyzwana jednostka nie może przyzywać`);
    } else {
      problems.push(...validateUnitSpec(`${label}, przyzwany`, spec.summon));
    }
  }
  return problems;
}

function slotProblems(label: string, slots: readonly number[], width: number): string[] {
  const problems: string[] = [];
  if (slots.length !== TEAM_SIZE) {
    problems.push(`${label}: musi być dokładnie ${TEAM_SIZE} slotów (jest ${slots.length})`);
  }
  for (const x of slots) {
    if (!Number.isInteger(x) || x < 0 || x > width) {
      problems.push(`${label}: pozycja ${x} poza polem 0..${width}`);
    }
  }
  return problems;
}

export function validateSetup(setup: BattleSetup): string[] {
  const { arena } = setup;
  const problems: string[] = [];

  if (!Number.isInteger(arena.width) || arena.width < 1) {
    problems.push('arena: width musi być dodatnią liczbą całkowitą');
  }
  if (!Number.isInteger(arena.timeLimitTicks) || arena.timeLimitTicks < 1) {
    problems.push('arena: timeLimitTicks musi być dodatnią liczbą całkowitą');
  }
  problems.push(...slotProblems('arena.playerSlots', arena.playerSlots, arena.width));
  problems.push(...slotProblems('arena.enemySlots', arena.enemySlots, arena.width));
  if (setup.player.length !== TEAM_SIZE || setup.enemy.length !== TEAM_SIZE) {
    problems.push(`skład: każda strona musi mieć dokładnie ${TEAM_SIZE} slotów`);
  }
  if (problems.length > 0) return problems;

  // Gracz stoi po lewej, przeciwnik po prawej; od tego zależy kierunek ruchu i pocisków.
  if (Math.max(...arena.playerSlots) >= Math.min(...arena.enemySlots)) {
    problems.push('arena: wszystkie sloty gracza muszą leżeć na lewo od slotów przeciwnika');
  }

  // Wszystkie jednostki, które mogą stanąć na polu: składy i to, co przyzywają.
  const units: UnitSpec[] = [];
  // Ograniczenie liczby pocisków w locie: suma po składach, a dla przyzwanych największe
  // ograniczenie wśród przyzywanych przez każdą ze stron (indeks 0: gracz, 1: przeciwnik).
  let bound = 0;
  const summonBound = [0, 0];
  // Jednostka idąca do ostatniego wroga minęłaby tych, którzy stoją bliżej, więc musi sięgać
  // go z każdego miejsca pola.
  const checkReach = (label: string, spec: UnitSpec): void => {
    if (spec.targetLast && spec.range < arena.width) {
      problems.push(`${label}: targetLast wymaga zasięgu na całe pole (range ≥ ${arena.width})`);
    }
  };
  const check = (label: string, spec: UnitSpec | null, side: number): void => {
    if (spec === null) return;
    units.push(spec);
    problems.push(...validateUnitSpec(label, spec));
    checkReach(label, spec);
    bound += projectileBound(spec, arena.width);
    const { summon } = spec;
    if (summon === null) return;
    // Przyzwani stają na polu, więc obowiązują ich te same reguły co jednostki składów.
    units.push(summon);
    checkReach(`${label}, przyzwany`, summon);
    summonBound[side] = Math.max(summonBound[side] ?? 0, projectileBound(summon, arena.width));
  };
  setup.player.forEach((spec, slot) => {
    check(`gracz, slot ${slot}`, spec, 0);
  });
  setup.enemy.forEach((spec, slot) => {
    check(`przeciwnik, slot ${slot}`, spec, 1);
  });
  if (problems.length > 0 || units.length === 0) return problems;

  // Wrogie jednostki nie mogą się minąć: dwie idące naprzeciw zbliżają się w jednym ticku
  // najwyżej o (dystans - zasięg) + krok, więc wystarczy, że żaden krok nie przekracza żadnego zasięgu.
  const maxStep = Math.max(...units.map((u) => u.moveStep));
  const minRange = Math.min(...units.map((u) => u.range));
  if (maxStep > minRange) {
    problems.push(
      `największy moveStep (${maxStep}) przekracza najmniejszy range (${minRange}); jednostki mogłyby się minąć`,
    );
  }

  // Każda strona może mieć naraz TEAM_SIZE przyzwanych; w najgorszym razie wszyscy strzelają
  // jak ten z jej przyzwanych, który trzyma w locie najwięcej pocisków.
  bound += TEAM_SIZE * ((summonBound[0] ?? 0) + (summonBound[1] ?? 0));
  if (bound > MAX_PROJECTILES) {
    problems.push(`możliwa liczba pocisków w locie (${bound}) przekracza pulę ${MAX_PROJECTILES}`);
  }
  return problems;
}

/**
 * Górne ograniczenie liczby pocisków jednej jednostki w locie: tyle, ile zdąży wystrzelić,
 * zanim pierwszy opuści pole. Zero dla ataku wręcz.
 */
export function projectileBound(spec: UnitSpec, arenaWidth: number): number {
  if (spec.projectileStep === 0) return 0;
  const flightTicks = Math.ceil(arenaWidth / spec.projectileStep);
  return Math.ceil(flightTicks / spec.attackInterval) + 1;
}
