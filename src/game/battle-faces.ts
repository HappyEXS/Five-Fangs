// Twarze walki: kto stoi w którym slocie i kto jeszcze żyje. HUD pokazuje z nich miniaturki
// żywych postaci w rogach ekranu. Lista zmienia się tylko wtedy, gdy ktoś ginie, więc pętla
// klatek porównuje samą maskę bitową, a nową listę buduje przy zmianie.
import type { CompiledLevel } from '../content/load-progression.ts';
import type { SquadMember } from '../content/resolve-spec.ts';
import { type Battle, isAlive, MAX_UNITS, TEAM_SIZE } from '../sim/index.ts';

export interface BattleFace {
  /** Indeks jednostki w symulacji (`unitId`): sloty gracza 0..4, potem przeciwnika. */
  readonly unit: number;
  /** Id jednostki w treści gry: po nim interfejs znajduje nazwę i miniaturkę. */
  readonly unitId: string;
  readonly side: 'player' | 'enemy';
  readonly alive: boolean;
}

/**
 * Id jednostek walki pod ich indeksami w symulacji, tak jak w `levelSetup`: skład gracza per
 * slot, potem wrogowie poziomu; null to pusty slot.
 */
export function battleLineup(
  level: CompiledLevel,
  squad: readonly (SquadMember | null)[],
): (string | null)[] {
  const lineup = new Array<string | null>(MAX_UNITS).fill(null);
  for (let slot = 0; slot < TEAM_SIZE; slot++) lineup[slot] = squad[slot]?.unit.id ?? null;
  for (const entry of level.enemies) {
    if (entry.slot >= 0 && entry.slot < TEAM_SIZE) lineup[TEAM_SIZE + entry.slot] = entry.unit;
  }
  return lineup;
}

/** Maska bitowa żywych jednostek: bit `unit` jest ustawiony, gdy jednostka żyje. Nie alokuje. */
export function aliveMask(battle: Battle): number {
  const { status } = battle.state;
  let mask = 0;
  for (let unit = 0; unit < MAX_UNITS; unit++) {
    if (isAlive(status[unit] ?? 0)) mask |= 1 << unit;
  }
  return mask;
}

/**
 * Twarze w kolejności, w jakiej postacie stają na scenie od lewej: skład gracza od tyłu do
 * frontu (slot 4 … 0), potem przeciwnik od frontu do tyłu (slot 0 … 4). Polegli zostają na
 * liście z `alive: false`, żeby interfejs mógł pokazać ich zejście.
 */
export function battleFaces(lineup: readonly (string | null)[], mask: number): BattleFace[] {
  const faces: BattleFace[] = [];
  const add = (unit: number, side: BattleFace['side']): void => {
    const unitId = lineup[unit] ?? null;
    if (unitId !== null) faces.push({ unit, unitId, side, alive: ((mask >> unit) & 1) === 1 });
  };
  for (let slot = TEAM_SIZE - 1; slot >= 0; slot--) add(slot, 'player');
  for (let slot = 0; slot < TEAM_SIZE; slot++) add(TEAM_SIZE + slot, 'enemy');
  return faces;
}
