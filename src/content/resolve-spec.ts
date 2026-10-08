// Statystyki efektywne jednostki i budowanie setupu walki dla poziomu. Te same funkcje
// służą grze, podglądowi w UI i skryptowi balansu, więc gracz widzi dokładnie to, co liczy symulacja.
import { mulDivFloor } from '../core/int.ts';
import type { BattleSetup, UnitSpec } from '../sim/types.ts';
import type { CompiledUnit, UnitVisual } from './compile.ts';
import type { GameContent } from './load.ts';
import type { CompiledLevel, Rune } from './load-progression.ts';
import type { Progression } from './schema-progression.ts';

/** Liczba slotów drużyny; musi zgadzać się z TEAM_SIZE symulacji (pilnuje tego validateSetup). */
const TEAM_SLOTS = 5;

/**
 * Specyfikacja jednostki po ulepszeniach i runach. `rank` to liczba ulepszeń formy bohatera
 * albo poziom wroga: każdy punkt dodaje `upgradePercent` procent bazowego maxHp i attack
 * (zaokrąglenie w dół). Runy dodają wartości płaskie po przeliczeniu ulepszeń: do życia, ataku,
 * odrzutu (który jest zarazem oporem przed odrzutem) i szybkości ruchu. Runa szybkości nie rusza
 * jednostki, która z założenia stoi w miejscu.
 * Jednostka przyzywana przez przyzywacza rośnie z jego ulepszeniami tak samo; runy przyzywacza
 * jej nie dotyczą.
 */
export function resolveUnitSpec(
  unit: CompiledUnit,
  rank: number,
  runes: readonly Rune[],
  progression: Progression,
): UnitSpec {
  const scale = 100 + rank * progression.upgradePercent;
  let maxHp = mulDivFloor(unit.base.maxHp, scale, 100);
  let attack = mulDivFloor(unit.base.attack, scale, 100);
  let { knockback, moveStep } = unit.base;
  for (const rune of runes) {
    switch (rune.stat) {
      case 'maxHp':
        maxHp += rune.bonus;
        break;
      case 'attack':
        attack += rune.bonus;
        break;
      case 'knockback':
        knockback += rune.bonus;
        break;
      case 'moveSpeed':
        // Krok 0 to decyzja projektu postaci (rośliny, wieżyczki): ma zasięg na całe pole
        // i szyk liczy na to, że zostanie w miejscu.
        if (unit.base.moveStep > 0) moveStep += rune.bonus;
        break;
    }
  }
  const { summon } = unit.base;
  return {
    ...unit.base,
    maxHp,
    attack,
    knockback,
    moveStep,
    summon:
      summon === null
        ? null
        : {
            ...summon,
            maxHp: mulDivFloor(summon.maxHp, scale, 100),
            attack: mulDivFloor(summon.attack, scale, 100),
          },
  };
}

/**
 * Jednostka o danym id: forma bohatera albo jednostka specjalna, której gracz nie może zdobyć.
 * Obie grupy dzielą przestrzeń id, a poziomy mogą wystawiać przeciw graczowi każdą z nich.
 */
export function findUnit(content: GameContent, id: string): CompiledUnit | undefined {
  return content.heroes.get(id) ?? content.enemies.get(id);
}

/** Bohater w składzie: forma, liczba ulepszeń tej formy i włożone runy. */
export interface SquadMember {
  readonly unit: CompiledUnit;
  readonly rank: number;
  readonly runes: readonly Rune[];
}

/** Setup walki: skład gracza per slot (null = pusty) przeciw wrogom z poziomu. */
export function levelSetup(
  content: GameContent,
  level: CompiledLevel,
  squad: readonly (SquadMember | null)[],
): BattleSetup {
  const player: (UnitSpec | null)[] = [];
  const enemy: (UnitSpec | null)[] = [];
  for (let slot = 0; slot < TEAM_SLOTS; slot++) {
    const member = squad[slot] ?? null;
    player.push(
      member === null
        ? null
        : resolveUnitSpec(member.unit, member.rank, member.runes, content.progression),
    );
    enemy.push(null);
  }
  for (const entry of level.enemies) {
    const unit = findUnit(content, entry.unit);
    if (unit === undefined) throw new Error(`Unknown unit "${entry.unit}" in level ${level.id}`);
    enemy[entry.slot] = resolveUnitSpec(unit, entry.level, [], content.progression);
  }
  return { arena: content.arena, player, enemy };
}

/**
 * Wygląd jednostek tej samej walki dla renderera, indeksowany `unitId`:
 * sloty gracza 0..4, potem sloty przeciwnika 5..9; null dla pustego slotu.
 */
export function levelVisuals(
  content: GameContent,
  level: CompiledLevel,
  squad: readonly (SquadMember | null)[],
): (UnitVisual | null)[] {
  const visuals: (UnitVisual | null)[] = [];
  for (let slot = 0; slot < TEAM_SLOTS; slot++) visuals.push(squad[slot]?.unit.visual ?? null);
  for (let slot = 0; slot < TEAM_SLOTS; slot++) visuals.push(null);
  for (const entry of level.enemies) {
    visuals[TEAM_SLOTS + entry.slot] = findUnit(content, entry.unit)?.visual ?? null;
  }
  return visuals;
}
