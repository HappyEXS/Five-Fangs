// Co gracz może teraz zrobić z bohaterem na ekranie składu: następny zakup (ulepszenie albo
// ewolucja) i wolne runy do włożenia. Czyste funkcje nad regułami z progress.ts; UI pokazuje
// ich wynik w polu bohatera.
import type { GameContent } from '../content/load.ts';
import type { Rune } from '../content/schema-progression.ts';
import type { UnitSpec } from '../sim/types.ts';
import { evolveOptions, previewEvolve } from './evolution.ts';
import { findHero, freeRunes, previewUpgrade, upgradeCost } from './progress.ts';
import type { Save } from './save-schema.ts';

export interface PurchaseOption {
  readonly cost: number;
  /** Statystyki bohatera po zakupie. */
  readonly spec: UnitSpec;
  /** Jednostka po zakupie: przy ewolucji nowa forma, przy ulepszeniu ta sama. */
  readonly unitId: string;
}

/**
 * Następny zakup bohatera. Ulepszenie ma jedną opcję; ewolucja tyle, ile dróg wychodzi
 * z bieżącej formy (ADR 0016), i wtedy gracz wybiera jedną z nich.
 */
export interface Purchase {
  readonly kind: 'upgrade' | 'evolve';
  /** Co najmniej jedna opcja, w kolejności z treści. */
  readonly options: readonly [PurchaseOption, ...PurchaseOption[]];
}

/**
 * Następny zakup bohatera: ulepszenie, dopóki forma nie ma kompletu, potem ewolucja w jedną
 * z następnych form. Null, gdy forma ma komplet ulepszeń i jest ostatnim stopniem swojej drogi
 * (albo bohatera nie ma). Wynik nie zależy od złota; czy gracza stać, sprawdza UI i reguła.
 */
export function nextPurchase(content: GameContent, save: Save, heroId: number): Purchase | null {
  const hero = findHero(save, heroId);
  if (hero === null) return null;
  const upgrade = upgradeCost(content, save, heroId);
  const upgraded = previewUpgrade(content, save, heroId);
  if (upgrade !== null && upgraded !== null) {
    return { kind: 'upgrade', options: [{ cost: upgrade, spec: upgraded, unitId: hero.form }] };
  }
  const options: PurchaseOption[] = [];
  for (const option of evolveOptions(content, save, heroId)) {
    const spec = previewEvolve(content, save, heroId, option.unitId);
    if (spec !== null) options.push({ cost: option.cost, spec, unitId: option.unitId });
  }
  const [first, ...rest] = options;
  return first === undefined ? null : { kind: 'evolve', options: [first, ...rest] };
}

export interface RuneStock {
  readonly rune: Rune;
  /** Ile takich run gracz ma wolnych (niewłożonych). */
  readonly count: number;
}

/**
 * Wolne runy pogrupowane po id: najpierw życie, potem atak, w obu rosnąco po wartości.
 * Runy, których nie ma w treści gry, są pomijane.
 */
export function runeStock(content: GameContent, save: Save): RuneStock[] {
  const counts = new Map<string, number>();
  for (const id of freeRunes(save)) counts.set(id, (counts.get(id) ?? 0) + 1);
  const stock: RuneStock[] = [];
  for (const [id, count] of counts) {
    const rune = content.runes.get(id);
    if (rune !== undefined) stock.push({ rune, count });
  }
  const statOrder = (rune: Rune): number => (rune.stat === 'maxHp' ? 0 : 1);
  return stock.sort((a, b) => statOrder(a.rune) - statOrder(b.rune) || a.rune.value - b.rune.value);
}
