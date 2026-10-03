// Co gracz może teraz zrobić z bohaterem na ekranie składu: następny zakup (ulepszenie albo
// ewolucja) i wolne runy do włożenia. Czyste funkcje nad regułami z progress.ts; UI pokazuje
// ich wynik w polu bohatera.
import type { GameContent } from '../content/load.ts';
import type { Rune } from '../content/schema-progression.ts';
import type { UnitSpec } from '../sim/types.ts';
import {
  evolveCost,
  findHero,
  freeRunes,
  previewEvolve,
  previewUpgrade,
  upgradeCost,
} from './progress.ts';
import type { Save } from './save-schema.ts';

export interface Purchase {
  readonly kind: 'upgrade' | 'evolve';
  readonly cost: number;
  /** Statystyki bohatera po zakupie. */
  readonly spec: UnitSpec;
  /** Jednostka po zakupie: przy ewolucji forma druga, przy ulepszeniu ta sama. */
  readonly unitId: string;
}

/**
 * Następny zakup bohatera: ulepszenie, dopóki forma nie ma kompletu, potem ewolucja (tylko
 * z formy bazowej). Null, gdy bohater ma komplet ulepszeń formy drugiej albo go nie ma.
 * Wynik nie zależy od złota gracza; czy go stać, sprawdza UI i reguła zakupu.
 */
export function nextPurchase(content: GameContent, save: Save, heroId: number): Purchase | null {
  const hero = findHero(save, heroId);
  const line = hero === null ? undefined : content.lines.get(hero.line);
  if (hero === null || line === undefined) return null;
  const upgrade = upgradeCost(content, save, heroId);
  const upgraded = previewUpgrade(content, save, heroId);
  if (upgrade !== null && upgraded !== null) {
    return { kind: 'upgrade', cost: upgrade, spec: upgraded, unitId: line.forms[hero.form] };
  }
  const evolve = evolveCost(content, save, heroId);
  const evolved = previewEvolve(content, save, heroId);
  if (evolve !== null && evolved !== null) {
    return { kind: 'evolve', cost: evolve, spec: evolved.spec, unitId: evolved.unitId };
  }
  return null;
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
