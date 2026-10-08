// Runy składu odniesienia (ADR 0025 i 0026): ile żetonów gracz ma przed poziomem, które runy
// drzewka za nie bierze i którym bohaterom je wkłada. Jak plan zakupów, tak i ten plan jest
// częścią balansu: bossowie są strojeni do run, które wynikają z niego.
import type { GameContent } from '../../src/content/load.ts';
import type { CompiledLevel, Rune } from '../../src/content/load-progression.ts';
import type { RuneStat } from '../../src/content/schema-progression.ts';
import type { PlannedSquad } from './reference-plan.ts';

/** Żetony run zdobyte przed poziomem o indeksie `index` w kolejności gry `levels`. */
export function tokensBefore(levels: readonly CompiledLevel[], index: number): number {
  return levels.slice(0, index).filter((level) => level.runeToken).length;
}

/**
 * Runy, które gracz ma po wydaniu `tokens` żetonów. Plan to kolejne fazy; w fazie żetony idą
 * w jej kierunki po kolei i w kółko, każdy bierze następną runę swojego kierunku. Kierunek
 * przeszły do końca jest pomijany, a gdy faza nie ma już czego brać, zaczyna się następna.
 * Żetony, na które plan nie ma już run, zostają niewydane.
 */
export function runesForTokens(
  content: GameContent,
  phases: readonly (readonly string[])[],
  tokens: number,
): Rune[] {
  const taken = new Map<string, number>();
  const runes: Rune[] = [];
  for (const order of phases) {
    let turn = 0;
    let skipped = 0;
    while (runes.length < tokens && skipped < order.length) {
      const branchId = order[turn % order.length] ?? '';
      turn++;
      const depth = taken.get(branchId) ?? 0;
      const rune = content.runeTree.find((branch) => branch.id === branchId)?.runes[depth];
      if (rune === undefined) {
        skipped++;
        continue;
      }
      skipped = 0;
      taken.set(branchId, depth + 1);
      runes.push(rune);
    }
  }
  return runes;
}

/**
 * Komu najpierw dać runy jednej statystyki: `front` i `back` to kolejność slotów od frontu
 * albo od tyłu, `melee` to walczący wręcz od frontu (potem reszta), `ranged` to strzelcy od
 * tyłu (potem reszta).
 */
export type Holders = 'front' | 'back' | 'melee' | 'ranged';
export const HOLDERS: readonly Holders[] = ['front', 'back', 'melee', 'ranged'];

/**
 * Rozdanie składu odniesienia: życie od frontu (front przyjmuje ciosy), atak od tyłu (strzelcy
 * żyją najdłużej), odrzut od frontu, szybkość od tyłu (stamtąd jest do wroga najdalej).
 */
export const REFERENCE_HOLDERS: Readonly<Record<RuneStat, Holders>> = {
  maxHp: 'front',
  attack: 'back',
  knockback: 'front',
  moveSpeed: 'back',
};

const STAT_ORDER: readonly RuneStat[] = ['maxHp', 'attack', 'knockback', 'moveSpeed'];

/** Indeksy bohaterów składu w kolejności, w jakiej dostają runy. */
function holderOrder(content: GameContent, squad: PlannedSquad, holders: Holders): number[] {
  const frontFirst = squad.members
    .map((member, index) => ({ index, slot: member.slot }))
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => entry.index);
  if (holders === 'front') return frontFirst;
  const backFirst = [...frontFirst].reverse();
  if (holders === 'back') return backFirst;
  const melee = (index: number): boolean =>
    (content.heroes.get(squad.members[index]?.form ?? '')?.base.projectileStep ?? 0) === 0;
  return holders === 'melee'
    ? [...frontFirst.filter(melee), ...frontFirst.filter((index) => !melee(index))]
    : [...backFirst.filter((index) => !melee(index)), ...backFirst.filter(melee)];
}

/**
 * Rozdaje runy składowi. Runy jednej statystyki idą od najmocniejszej po kolei po bohaterach,
 * w kolejności z `holders` (domyślnie rozdanie składu odniesienia). Bohater z pełnymi gniazdami
 * jest pomijany, a runa szybkości omija bohatera, który stoi w miejscu; nadmiarowe runy zostają
 * niewłożone. Zwraca runy per bohater, w kolejności `squad.members`.
 */
export function assignRunes(
  content: GameContent,
  squad: PlannedSquad,
  runes: readonly Rune[],
  holders: Partial<Record<RuneStat, Holders>> = {},
): Rune[][] {
  const { runeSlots } = content.progression;
  const given: Rune[][] = squad.members.map(() => []);
  for (const stat of STAT_ORDER) {
    const sorted = runes.filter((rune) => rune.stat === stat).sort((a, b) => b.value - a.value);
    const order = holderOrder(content, squad, holders[stat] ?? REFERENCE_HOLDERS[stat]).filter(
      (index) => {
        if (stat !== 'moveSpeed') return true;
        const form = squad.members[index]?.form ?? '';
        return (content.heroes.get(form)?.base.moveStep ?? 0) > 0;
      },
    );
    let cursor = 0;
    for (const rune of sorted) {
      let tries = 0;
      while (
        tries < order.length &&
        (given[order[cursor % order.length] ?? 0]?.length ?? 0) >= runeSlots
      ) {
        cursor++;
        tries++;
      }
      if (tries === order.length) break;
      given[order[cursor % order.length] ?? 0]?.push(rune);
      cursor++;
    }
  }
  return given;
}
