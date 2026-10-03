// Ewolucje bohaterów: drzewo form linii (ADR 0016). Po komplecie ulepszeń bieżącej formy bohater
// może ewoluować w jedną z jej następnych form; gdy jest ich kilka, gracz wybiera drogę.
// Tu leżą reguły ewolucji i pomocnicze funkcje drzewa dla UI i sceny.

import type { GameContent } from '../content/load.ts';
import type { CompiledLine } from '../content/load-progression.ts';
import { resolveUnitSpec } from '../content/resolve-spec.ts';
import type { UnitSpec } from '../sim/types.ts';
import { findHero, heroView, withHero } from './progress.ts';
import type { Save } from './save-schema.ts';

export interface EvolveOption {
  /** Id jednostki formy, w którą bohater może ewoluować. */
  readonly unitId: string;
  readonly cost: number;
}

/**
 * Formy, w które bohater może teraz ewoluować, w kolejności z treści. Pusta lista, gdy bieżąca
 * forma nie ma kompletu ulepszeń albo jest ostatnim stopniem swojej drogi.
 */
export function evolveOptions(content: GameContent, save: Save, heroId: number): EvolveOption[] {
  const hero = findHero(save, heroId);
  const line = hero === null ? undefined : content.lines.get(hero.line);
  const form = hero === null ? undefined : line?.forms.get(hero.form);
  if (hero === null || line === undefined || form === undefined) return [];
  if (hero.upgrades < content.progression.maxUpgrades) return [];
  const options: EvolveOption[] = [];
  for (const unitId of form.next) {
    const target = line.forms.get(unitId);
    if (target !== undefined) options.push({ unitId, cost: target.evolveCost });
  }
  return options;
}

/**
 * Kupuje ewolucję w formę `target`: nowa forma bez ulepszeń, runy zostają. Null, gdy ta forma
 * nie jest teraz dostępna dla bohatera albo brakuje złota.
 */
export function applyEvolve(
  content: GameContent,
  save: Save,
  heroId: number,
  target: string,
): Save | null {
  const option = evolveOptions(content, save, heroId).find((each) => each.unitId === target);
  const hero = findHero(save, heroId);
  if (option === undefined || hero === null || save.gold < option.cost) return null;
  return withHero(
    { ...save, gold: save.gold - option.cost },
    { ...hero, form: target, upgrades: 0 },
  );
}

/** Statystyki bohatera po ewolucji w `target` (bez ulepszeń, z tymi samymi runami) albo null. */
export function previewEvolve(
  content: GameContent,
  save: Save,
  heroId: number,
  target: string,
): UnitSpec | null {
  const view = heroView(content, save, heroId);
  const unit = content.heroes.get(target);
  if (view === null || unit === undefined || !view.line.forms.has(target)) return null;
  return resolveUnitSpec(unit, 0, view.runes, content.progression);
}

/** Droga od formy bazowej do `unit` włącznie. Pusta, gdy forma nie należy do linii. */
export function formPath(line: CompiledLine, unit: string): string[] {
  const path: string[] = [];
  let current = line.forms.get(unit);
  while (current !== undefined) {
    path.unshift(current.unit);
    current = current.from === null ? undefined : line.forms.get(current.from);
  }
  return path;
}

/**
 * Droga pokazywana na scenie dla wybranej formy: od formy bazowej przez wybraną, a dalej przez
 * pierwszą z następnych form aż do ostatniego stopnia. Dla nieznanej formy: droga od bazowej.
 */
export function displayPath(line: CompiledLine, unit: string): string[] {
  const path = formPath(line, line.forms.has(unit) ? unit : line.base);
  let last = line.forms.get(path[path.length - 1] ?? line.base);
  while (last !== undefined && last.next.length > 0) {
    const next = last.next[0];
    if (next === undefined) break;
    path.push(next);
    last = line.forms.get(next);
  }
  return path;
}

export interface TreeCell {
  readonly unit: string;
  /** Kolumna: stopień formy. */
  readonly tier: number;
  /** Pierwszy wiersz i liczba wierszy: forma zajmuje wiersze wszystkich swoich gałęzi. */
  readonly row: number;
  readonly rows: number;
}

/**
 * Układ drzewa w siatce: kolumna to stopień, a każda ostatnia forma drogi dostaje własny wiersz.
 * Forma z kilkoma następnymi rozciąga się na wiersze swoich gałęzi, więc rozwidlenie widać
 * bez rysowania linii. Kolejność form w gałęziach jak w treści.
 */
export function treeLayout(line: CompiledLine): TreeCell[] {
  const cells: TreeCell[] = [];
  let nextRow = 0;
  const place = (unit: string): number => {
    const form = line.forms.get(unit);
    if (form === undefined) return 0;
    const row = nextRow;
    let rows = 0;
    for (const child of form.next) rows += place(child);
    if (rows === 0) {
      rows = 1;
      nextRow++;
    }
    cells.push({ unit, tier: form.tier, row, rows });
    return rows;
  };
  place(line.base);
  return cells.sort((a, b) => a.tier - b.tier || a.row - b.row);
}

/** Liczba stopni linii: najdłuższa droga od formy bazowej. */
export function tierCount(line: CompiledLine): number {
  let deepest = 0;
  for (const form of line.forms.values()) deepest = Math.max(deepest, form.tier);
  return deepest + 1;
}
