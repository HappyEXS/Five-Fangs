// Reguły treści wynikające z niezmienników symulacji (docs/ARCHITECTURE.md §4.4).
// Leżą w scripts/, bo moduł `content` nie może importować kodu z `sim`.
import type { CompiledUnit } from '../../src/content/compile.ts';
import type { ContentIssue } from '../../src/content/issues.ts';
import type { GameContent } from '../../src/content/load.ts';
import { MAX_PROJECTILES, TEAM_SIZE } from '../../src/sim/types.ts';
import { projectileBound, validateSetup, validateUnitSpec } from '../../src/sim/validate-setup.ts';

const EMPTY_TEAM = [null, null, null, null, null] as const;

/**
 * Suma największych ograniczeń pocisków w jednej drużynie złożonej z tych jednostek. Drużyna
 * może mieć do tego TEAM_SIZE przyzwanych; w najgorszym razie wszyscy są tą z jednostek
 * przyzywanych przez `units`, która trzyma w locie najwięcej pocisków.
 */
function worstTeamBound(units: Iterable<CompiledUnit>, width: number): number {
  const all = [...units];
  const squad = all
    .map((unit) => projectileBound(unit.base, width))
    .sort((a, b) => b - a)
    .slice(0, TEAM_SIZE)
    .reduce((sum, bound) => sum + bound, 0);
  const summon = all.reduce(
    (worst, unit) =>
      unit.base.summon === null ? worst : Math.max(worst, projectileBound(unit.base.summon, width)),
    0,
  );
  return squad + TEAM_SIZE * summon;
}

export function contentSimIssues(content: GameContent): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const message of validateSetup({
    arena: content.arena,
    player: EMPTY_TEAM,
    enemy: EMPTY_TEAM,
  })) {
    issues.push({ source: 'arena.json', message });
  }

  const groups = [
    ['units/heroes.json', content.heroes],
    ['units/enemies.json', content.enemies],
    ['units/summons.json', content.summons],
  ] as const;
  const all: CompiledUnit[] = [];
  for (const [source, units] of groups) {
    for (const unit of units.values()) {
      all.push(unit);
      for (const message of validateUnitSpec(unit.id, unit.base)) issues.push({ source, message });
      // Jednostka celująca w koniec szyku strzela z miejsca: idąc do celu, minęłaby bliższych
      // wrogów. Ten sam warunek sprawdza `validateSetup` przy tworzeniu walki.
      if (unit.base.targetLast && unit.base.range < content.arena.width) {
        issues.push({
          source,
          message: `${unit.id}: cecha "targetLast" wymaga zasięgu na całe pole (range ≥ szerokość areny)`,
        });
      }
      // Jednostka bez ruchu, która nie sięga całego pola, stałaby bezczynnie, gdy wróg jest dalej.
      if (unit.base.moveStep === 0 && unit.base.range < content.arena.width) {
        issues.push({
          source,
          message: `${unit.id}: jednostka bez ruchu (moveSpeed 0) wymaga zasięgu na całe pole (range ≥ szerokość areny)`,
        });
      }
    }
  }
  if (issues.length > 0 || all.length === 0) return issues;

  // Dowolne dwie jednostki mogą spotkać się w walce, więc reguła obejmuje całą treść.
  const fastest = all.reduce((a, b) => (b.base.moveStep > a.base.moveStep ? b : a));
  const shortest = all.reduce((a, b) => (b.base.range < a.base.range ? b : a));
  if (fastest.base.moveStep > shortest.base.range) {
    issues.push({
      source: 'units',
      message: `krok ruchu "${fastest.id}" (${fastest.base.moveStep} podjednostek na tick) przekracza zasięg "${shortest.id}" (${shortest.base.range}); jednostki mogłyby się minąć`,
    });
  }

  // Bohater może nosić runy szybkości (ADR 0026): reguła musi trzymać także dla najszybszego
  // bohatera z najmocniejszymi runami we wszystkich gniazdach.
  const speedRunes = [...content.runes.values()]
    .filter((rune) => rune.stat === 'moveSpeed')
    .map((rune) => rune.bonus)
    .sort((a, b) => b - a)
    .slice(0, content.progression.runeSlots)
    .reduce((sum, bonus) => sum + bonus, 0);
  const heroes = [...content.heroes.values()];
  const fastestHero = heroes.reduce(
    (a, b) => (b.base.moveStep > a.base.moveStep ? b : a),
    heroes[0] ?? fastest,
  );
  if (
    fastest.base.moveStep <= shortest.base.range &&
    fastestHero.base.moveStep + speedRunes > shortest.base.range
  ) {
    issues.push({
      source: 'runes.json',
      message: `krok ruchu "${fastestHero.id}" z runami szybkości (${fastestHero.base.moveStep + speedRunes} podjednostek na tick) przekracza zasięg "${shortest.id}" (${shortest.base.range}); jednostki mogłyby się minąć`,
    });
  }

  const bound =
    worstTeamBound(content.heroes.values(), content.arena.width) +
    worstTeamBound(content.enemies.values(), content.arena.width);
  if (bound > MAX_PROJECTILES) {
    issues.push({
      source: 'units',
      message: `najgorszy skład może mieć ${bound} pocisków w locie, a pula mieści ${MAX_PROJECTILES}`,
    });
  }
  return issues;
}
