// Reguły progresji (docs/GAME_DESIGN.md §5 i §7): odblokowywanie poziomów, nagrody, ulepszenia,
// ewolucja, runy i skład. Czyste funkcje: biorą treść gry i zapis, zwracają nowy zapis albo
// null, gdy akcja jest niedozwolona. UI tylko je wywołuje.
import type { Language } from '../content/i18n/index.ts';
import type { GameContent } from '../content/load.ts';
import type { CompiledLine } from '../content/load-progression.ts';
import { resolveUnitSpec, type SquadMember } from '../content/resolve-spec.ts';
import type { Rune } from '../content/schema-progression.ts';
import { mulDivFloor } from '../core/int.ts';
import type { UnitSpec } from '../sim/types.ts';
import { type LineState, SAVE_VERSION, type Save, SQUAD_SLOTS } from './save-schema.ts';

function freshLine(content: GameContent): LineState {
  return {
    form: 0,
    upgrades: 0,
    runes: new Array<string | null>(content.progression.runeSlots).fill(null),
  };
}

/** Zapis nowej gry: linie startowe bez ulepszeń, ustawione w składzie od frontu. */
export function newSave(content: GameContent, gameVersion: string, lang: Language): Save {
  const lines: Record<string, LineState> = {};
  const squad = new Array<string | null>(SQUAD_SLOTS).fill(null);
  let slot = 0;
  for (const line of content.lines.values()) {
    if (line.unlockLevel !== null) continue;
    lines[line.id] = freshLine(content);
    if (slot < SQUAD_SLOTS) squad[slot++] = line.id;
  }
  return {
    saveVersion: SAVE_VERSION,
    gameVersion,
    gold: 0,
    lines,
    runes: [],
    levels: {},
    squad,
    settings: { lang, battleSpeed: 1 },
  };
}

/**
 * Dopasowuje wczytany zapis do bieżącej treści gry: usuwa linie, runy i poziomy, których już
 * nie ma, przycina liczniki do dozwolonych zakresów, dodaje linie, które zapis powinien mieć.
 * Dzięki temu zmiana treści między wersjami gry nie psuje zapisu.
 */
export function reconcileSave(content: GameContent, save: Save): Save {
  const { progression } = content;
  const levels: Save['levels'] = {};
  for (const [id, state] of Object.entries(save.levels)) {
    if (content.levels.has(id)) levels[id] = state;
  }
  const owned = save.runes.filter((id) => content.runes.has(id));
  const available = new Map<string, number>();
  for (const id of owned) available.set(id, (available.get(id) ?? 0) + 1);

  const lines: Record<string, LineState> = {};
  for (const line of content.lines.values()) {
    const saved = save.lines[line.id];
    const unlocked = line.unlockLevel === null || levels[line.unlockLevel]?.cleared === true;
    if (saved === undefined) {
      if (unlocked) lines[line.id] = freshLine(content);
      continue;
    }
    const runes: (string | null)[] = [];
    for (let slot = 0; slot < progression.runeSlots; slot++) {
      const id = saved.runes[slot] ?? null;
      const left = id === null ? 0 : (available.get(id) ?? 0);
      // Runa włożona częściej, niż gracz ją posiada, wypada ze slotu.
      if (id !== null && left > 0) {
        available.set(id, left - 1);
        runes.push(id);
      } else {
        runes.push(null);
      }
    }
    lines[line.id] = {
      form: saved.form,
      upgrades: Math.min(saved.upgrades, progression.maxUpgrades),
      runes,
    };
  }

  const seen = new Set<string>();
  const squad = save.squad.map((id) => {
    if (id === null || lines[id] === undefined || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
  return { ...save, lines, runes: owned, levels, squad };
}

/** Wszystkie poziomy w kolejności odblokowywania: świat po świecie. */
export function levelOrder(content: GameContent): string[] {
  return content.worlds.flatMap((world) => world.levels);
}

export function isLevelCleared(save: Save, levelId: string): boolean {
  return save.levels[levelId]?.cleared === true;
}

/** Poziom jest dostępny, gdy jest pierwszy w grze albo poprzedni został przeszły. */
export function isLevelUnlocked(content: GameContent, save: Save, levelId: string): boolean {
  const order = levelOrder(content);
  const index = order.indexOf(levelId);
  if (index < 0) return false;
  const previous = order[index - 1];
  return previous === undefined || isLevelCleared(save, previous);
}

/** Następny poziom w kolejności odblokowywania albo null po ostatnim. */
export function nextLevel(content: GameContent, levelId: string): string | null {
  const order = levelOrder(content);
  const index = order.indexOf(levelId);
  return index < 0 ? null : (order[index + 1] ?? null);
}

export interface Rewards {
  readonly firstClear: boolean;
  readonly gold: number;
  /** Runa za pierwsze przejście albo null. */
  readonly rune: string | null;
  /** Linie bohaterów odblokowane tym przejściem. */
  readonly lines: readonly string[];
}

/** Nagrody, które da wygrana na poziomie przy bieżącym zapisie. */
export function victoryRewards(content: GameContent, save: Save, levelId: string): Rewards | null {
  const level = content.levels.get(levelId);
  if (level === undefined) return null;
  if (isLevelCleared(save, levelId)) {
    const gold = mulDivFloor(level.gold, content.progression.replayGoldPercent, 100);
    return { firstClear: false, gold, rune: null, lines: [] };
  }
  const lines = [...content.lines.values()]
    .filter((line) => line.unlockLevel === levelId && save.lines[line.id] === undefined)
    .map((line) => line.id);
  return { firstClear: true, gold: level.gold, rune: level.rune, lines };
}

/** Zapis po wygranej w `ticks` tickach. Null, gdy poziom nie istnieje albo jest zablokowany. */
export function applyVictory(
  content: GameContent,
  save: Save,
  levelId: string,
  ticks: number,
): { save: Save; rewards: Rewards } | null {
  const rewards = victoryRewards(content, save, levelId);
  if (rewards === null || !isLevelUnlocked(content, save, levelId)) return null;
  const best = save.levels[levelId]?.bestTicks ?? null;
  const lines = { ...save.lines };
  for (const id of rewards.lines) lines[id] = freshLine(content);
  return {
    rewards,
    save: {
      ...save,
      gold: save.gold + rewards.gold,
      runes: rewards.rune === null ? save.runes : [...save.runes, rewards.rune],
      lines,
      levels: {
        ...save.levels,
        [levelId]: { cleared: true, bestTicks: best === null ? ticks : Math.min(best, ticks) },
      },
    },
  };
}

function lineOf(content: GameContent, save: Save, lineId: string) {
  const line = content.lines.get(lineId);
  const state = save.lines[lineId];
  return line === undefined || state === undefined ? null : { line, state };
}

/** Koszt następnego ulepszenia albo null, gdy forma ma już komplet (albo linia jest nieznana). */
export function upgradeCost(content: GameContent, save: Save, lineId: string): number | null {
  const found = lineOf(content, save, lineId);
  if (found === null || found.state.upgrades >= content.progression.maxUpgrades) return null;
  return found.line.upgradeCosts[found.state.form][found.state.upgrades] ?? null;
}

/** Koszt ewolucji albo null, gdy nie jest dostępna: forma druga albo brak kompletu ulepszeń. */
export function evolveCost(content: GameContent, save: Save, lineId: string): number | null {
  const found = lineOf(content, save, lineId);
  if (found === null || found.state.form !== 0) return null;
  if (found.state.upgrades < content.progression.maxUpgrades) return null;
  return found.line.evolveCost;
}

/** Kupuje ulepszenie. Null, gdy brakuje złota albo forma ma komplet. */
export function applyUpgrade(content: GameContent, save: Save, lineId: string): Save | null {
  const cost = upgradeCost(content, save, lineId);
  const state = save.lines[lineId];
  if (cost === null || state === undefined || save.gold < cost) return null;
  return {
    ...save,
    gold: save.gold - cost,
    lines: { ...save.lines, [lineId]: { ...state, upgrades: state.upgrades + 1 } },
  };
}

/** Kupuje ewolucję: forma druga bez ulepszeń, runy zostają. Null, gdy niedostępna. */
export function applyEvolve(content: GameContent, save: Save, lineId: string): Save | null {
  const cost = evolveCost(content, save, lineId);
  const state = save.lines[lineId];
  if (cost === null || state === undefined || save.gold < cost) return null;
  return {
    ...save,
    gold: save.gold - cost,
    lines: { ...save.lines, [lineId]: { ...state, form: 1, upgrades: 0 } },
  };
}

/** Posiadane runy, które nie są włożone żadnemu bohaterowi. */
export function freeRunes(save: Save): string[] {
  const free = [...save.runes];
  for (const state of Object.values(save.lines)) {
    for (const id of state.runes) {
      const index = id === null ? -1 : free.indexOf(id);
      if (index >= 0) free.splice(index, 1);
    }
  }
  return free;
}

/**
 * Wkłada wolną runę do slotu bohatera albo opróżnia slot (`runeId` null). Runa, która była
 * w slocie, wraca do wolnych. Null, gdy slot nie istnieje albo gracz nie ma wolnej takiej runy.
 */
export function equipRune(
  content: GameContent,
  save: Save,
  lineId: string,
  slot: number,
  runeId: string | null,
): Save | null {
  const state = save.lines[lineId];
  if (state === undefined || !Number.isInteger(slot)) return null;
  if (slot < 0 || slot >= content.progression.runeSlots) return null;
  if (runeId !== null && !freeRunes(save).includes(runeId)) return null;
  const runes = state.runes.map((id, index) => (index === slot ? runeId : id));
  return { ...save, lines: { ...save.lines, [lineId]: { ...state, runes } } };
}

/**
 * Stawia linię w slocie składu. Jeśli stała już w innym slocie, zamienia się miejscami
 * z zawartością slotu docelowego. Null, gdy linia nie jest odblokowana.
 */
export function placeInSquad(save: Save, lineId: string, slot: number): Save | null {
  if (save.lines[lineId] === undefined || slot < 0 || slot >= SQUAD_SLOTS) return null;
  const squad = [...save.squad];
  const from = squad.indexOf(lineId);
  const displaced = squad[slot] ?? null;
  if (from >= 0) squad[from] = displaced;
  squad[slot] = lineId;
  return { ...save, squad };
}

export function removeFromSquad(save: Save, slot: number): Save {
  return { ...save, squad: save.squad.map((id, index) => (index === slot ? null : id)) };
}

export function isSquadEmpty(save: Save): boolean {
  return save.squad.every((id) => id === null);
}

export interface LineView {
  readonly line: CompiledLine;
  readonly state: LineState;
  /** Id jednostki bieżącej formy. */
  readonly unitId: string;
  readonly runes: readonly Rune[];
  /** Statystyki efektywne: po ulepszeniach i runach, dokładnie te, które dostaje symulacja. */
  readonly spec: UnitSpec;
}

/** Bieżący stan linii z przeliczonymi statystykami albo null, gdy linia nie jest odblokowana. */
export function lineView(content: GameContent, save: Save, lineId: string): LineView | null {
  const found = lineOf(content, save, lineId);
  if (found === null) return null;
  const unitId = found.line.forms[found.state.form];
  const unit = content.heroes.get(unitId);
  if (unit === undefined) return null;
  const runes: Rune[] = [];
  for (const id of found.state.runes) {
    const rune = id === null ? undefined : content.runes.get(id);
    if (rune !== undefined) runes.push(rune);
  }
  return {
    line: found.line,
    state: found.state,
    unitId,
    runes,
    spec: resolveUnitSpec(unit, found.state.upgrades, runes, content.progression),
  };
}

/** Skład jako wejście `levelSetup`: bohater z rangą i runami per slot albo null. */
export function squadMembers(content: GameContent, save: Save): (SquadMember | null)[] {
  return save.squad.map((lineId) => {
    const view = lineId === null ? null : lineView(content, save, lineId);
    const unit = view === null ? undefined : content.heroes.get(view.unitId);
    if (view === null || unit === undefined) return null;
    return { unit, rank: view.state.upgrades, runes: view.runes };
  });
}

/** Statystyki po następnym ulepszeniu albo null, gdy forma ma już komplet. */
export function previewUpgrade(content: GameContent, save: Save, lineId: string): UnitSpec | null {
  const view = lineView(content, save, lineId);
  const unit = view === null ? undefined : content.heroes.get(view.unitId);
  if (view === null || unit === undefined) return null;
  if (view.state.upgrades >= content.progression.maxUpgrades) return null;
  return resolveUnitSpec(unit, view.state.upgrades + 1, view.runes, content.progression);
}

/** Forma po ewolucji z jej statystykami (bez ulepszeń, z tymi samymi runami) albo null. */
export function previewEvolve(
  content: GameContent,
  save: Save,
  lineId: string,
): { unitId: string; spec: UnitSpec } | null {
  const view = lineView(content, save, lineId);
  if (view === null || view.state.form !== 0) return null;
  const unitId = view.line.forms[1];
  const unit = content.heroes.get(unitId);
  if (unit === undefined) return null;
  return { unitId, spec: resolveUnitSpec(unit, 0, view.runes, content.progression) };
}
