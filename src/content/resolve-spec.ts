// Statystyki efektywne jednostki i budowanie setupu walki dla poziomu. Te same funkcje
// służą grze, podglądowi w UI i skryptowi balansu, więc gracz widzi dokładnie to, co liczy symulacja.
import { mulDivFloor } from '../core/int.ts';
import type { BattleSetup, UnitSpec } from '../sim/types.ts';
import type { CompiledUnit } from './compile.ts';
import type { GameContent } from './load.ts';
import type { CompiledLevel } from './load-progression.ts';
import type { Progression, Rune } from './schema-progression.ts';

/** Liczba slotów drużyny; musi zgadzać się z TEAM_SIZE symulacji (pilnuje tego validateSetup). */
const TEAM_SLOTS = 5;

/**
 * Specyfikacja jednostki po ulepszeniach i runach. `rank` to liczba ulepszeń formy bohatera
 * albo poziom wroga: każdy punkt dodaje `upgradePercent` procent bazowego maxHp i attack
 * (zaokrąglenie w dół). Runy dodają wartości płaskie po przeliczeniu ulepszeń.
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
  for (const rune of runes) {
    if (rune.stat === 'maxHp') maxHp += rune.value;
    else attack += rune.value;
  }
  return { ...unit.base, maxHp, attack };
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
    const unit = content.enemies.get(entry.unit);
    if (unit === undefined) throw new Error(`Unknown enemy "${entry.unit}" in level ${level.id}`);
    enemy[entry.slot] = resolveUnitSpec(unit, entry.level, [], content.progression);
  }
  return { arena: content.arena, player, enemy };
}
