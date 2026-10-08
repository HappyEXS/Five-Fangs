// Reguły progresji (docs/GAME_DESIGN.md §5 i §7): odblokowywanie poziomów, nagrody, sklep,
// ulepszenia, ewolucja, runy i skład. Czyste funkcje: biorą treść gry i zapis, zwracają nowy
// zapis albo null, gdy akcja jest niedozwolona. UI tylko je wywołuje.
import type { Language } from '../content/i18n/index.ts';
import type { GameContent } from '../content/load.ts';
import type { CompiledLine, Rune } from '../content/load-progression.ts';
import { resolveUnitSpec, type SquadMember } from '../content/resolve-spec.ts';
import { mulDivFloor } from '../core/int.ts';
import type { UnitSpec } from '../sim/types.ts';
import { type HeroState, SAVE_VERSION, type Save, SQUAD_SLOTS } from './save-schema.ts';

function freshHero(content: GameContent, id: number, line: CompiledLine): HeroState {
  return {
    id,
    line: line.id,
    form: line.base,
    upgrades: 0,
    runes: new Array<string | null>(content.progression.runeSlots).fill(null),
  };
}

/** Bohaterowie startowi: po jednym z każdej linii startowej, ustawieni w składzie od frontu. */
function starters(content: GameContent, firstId: number) {
  const heroes: HeroState[] = [];
  const squad = new Array<number | null>(SQUAD_SLOTS).fill(null);
  for (const line of content.lines.values()) {
    if (!line.starter) continue;
    const hero = freshHero(content, firstId + heroes.length, line);
    if (heroes.length < SQUAD_SLOTS) squad[heroes.length] = hero.id;
    heroes.push(hero);
  }
  return { heroes, squad, nextHeroId: firstId + heroes.length };
}

/** Zapis nowej gry: bohaterowie startowi bez ulepszeń, bez złota. */
export function newSave(content: GameContent, gameVersion: string, lang: Language): Save {
  return {
    saveVersion: SAVE_VERSION,
    gameVersion,
    gold: 0,
    ...starters(content, 1),
    runes: [],
    levels: {},
    settings: { lang, battleSpeed: 1 },
  };
}

/**
 * Dopasowuje wczytany zapis do bieżącej treści gry: usuwa bohaterów nieistniejących linii,
 * runy i poziomy, których już nie ma, przycina liczniki do dozwolonych zakresów i naprawia
 * skład. Dzięki temu zmiana treści między wersjami gry nie psuje zapisu.
 */
export function reconcileSave(content: GameContent, save: Save): Save {
  const { progression } = content;
  const levels: Save['levels'] = {};
  for (const [id, state] of Object.entries(save.levels)) {
    if (content.levels.has(id)) levels[id] = state;
  }
  // Każda runa drzewka istnieje raz: powtórzenie w zapisie nie daje drugiego egzemplarza.
  const owned = [...new Set(save.runes)].filter((id) => content.runes.has(id));
  const available = new Map<string, number>();
  for (const id of owned) available.set(id, (available.get(id) ?? 0) + 1);

  const heroes: HeroState[] = [];
  const ids = new Set<number>();
  for (const hero of save.heroes) {
    // Powtórzone id oznacza uszkodzony zapis; zostaje pierwszy bohater o tym id.
    const line = content.lines.get(hero.line);
    if (line === undefined || ids.has(hero.id)) continue;
    ids.add(hero.id);
    // Formy, której nie ma już w drzewie linii, nie da się wystawić: bohater wraca do formy
    // bazowej bez ulepszeń, ale zostaje graczowi razem z runami.
    const known = line.forms.has(hero.form);
    const runes: (string | null)[] = [];
    for (let slot = 0; slot < progression.runeSlots; slot++) {
      const id = hero.runes[slot] ?? null;
      const left = id === null ? 0 : (available.get(id) ?? 0);
      // Runa włożona częściej, niż gracz ją posiada, wypada ze slotu.
      if (id !== null && left > 0) {
        available.set(id, left - 1);
        runes.push(id);
      } else {
        runes.push(null);
      }
    }
    heroes.push({
      ...hero,
      form: known ? hero.form : line.base,
      upgrades: known ? Math.min(hero.upgrades, progression.maxUpgrades) : 0,
      runes,
    });
  }

  let nextHeroId = save.nextHeroId;
  for (const id of ids) nextHeroId = Math.max(nextHeroId, id + 1);
  // Zapis bez żadnego bohatera nie pozwala grać: gracz dostaje bohaterów startowych.
  if (heroes.length === 0) {
    const fresh = starters(content, nextHeroId);
    return { ...save, ...fresh, runes: owned, levels };
  }

  const seen = new Set<number>();
  const squad = save.squad.map((id) => {
    if (id === null || !ids.has(id) || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
  return { ...save, heroes, nextHeroId, runes: owned, levels, squad };
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

/** Poprzedni poziom w kolejności odblokowywania (ten, który odblokowuje wskazany) albo null. */
export function previousLevel(content: GameContent, levelId: string): string | null {
  const order = levelOrder(content);
  const index = order.indexOf(levelId);
  return index <= 0 ? null : (order[index - 1] ?? null);
}

/** Pierwszy poziom, którego gracz jeszcze nie przeszedł; po przejściu wszystkich ostatni. */
export function currentLevel(content: GameContent, save: Save): string | null {
  const order = levelOrder(content);
  return order.find((id) => !isLevelCleared(save, id)) ?? order[order.length - 1] ?? null;
}

/** Świat odbity z rąk najeźdźców: wszystkie jego poziomy są przeszłe. */
export function isWorldCleared(content: GameContent, save: Save, worldId: string): boolean {
  const world = content.worlds.find((entry) => entry.id === worldId);
  return world?.levels.every((id) => isLevelCleared(save, id)) ?? false;
}

/**
 * Poziom, na którym mapa otwiera wskazany świat: pierwszy jeszcze nieprzeszły, a w świecie
 * odbitym ostatni (boss). W świecie, do którego gracz jeszcze nie doszedł, jest to jego pierwszy
 * poziom: mapa pokazuje go jako zablokowany. Null dla nieznanego świata.
 */
export function worldEntryLevel(content: GameContent, save: Save, worldId: string): string | null {
  const world = content.worlds.find((entry) => entry.id === worldId);
  if (world === undefined) return null;
  return (
    world.levels.find((id) => !isLevelCleared(save, id)) ??
    world.levels[world.levels.length - 1] ??
    null
  );
}

export interface Rewards {
  readonly firstClear: boolean;
  readonly gold: number;
  /** Żeton run za pierwsze przejście (wydaje się go w drzewku run, runes.ts). */
  readonly runeToken: boolean;
}

/** Nagrody, które da wygrana na poziomie przy bieżącym zapisie. */
export function victoryRewards(content: GameContent, save: Save, levelId: string): Rewards | null {
  const level = content.levels.get(levelId);
  if (level === undefined) return null;
  if (isLevelCleared(save, levelId)) {
    const gold = mulDivFloor(level.gold, content.progression.replayGoldPercent, 100);
    return { firstClear: false, gold, runeToken: false };
  }
  return { firstClear: true, gold: level.gold, runeToken: level.runeToken };
}

/**
 * Zapis po wygranej w `ticks` tickach. Null, gdy poziom nie istnieje albo jest zablokowany.
 * Żetonu run zapis nie przechowuje: wynika z przeszłych poziomów (runes.ts).
 */
export function applyVictory(
  content: GameContent,
  save: Save,
  levelId: string,
  ticks: number,
): { save: Save; rewards: Rewards } | null {
  const rewards = victoryRewards(content, save, levelId);
  if (rewards === null || !isLevelUnlocked(content, save, levelId)) return null;
  const best = save.levels[levelId]?.bestTicks ?? null;
  return {
    rewards,
    save: {
      ...save,
      gold: save.gold + rewards.gold,
      levels: {
        ...save.levels,
        [levelId]: { cleared: true, bestTicks: best === null ? ticks : Math.min(best, ticks) },
      },
    },
  };
}

export function findHero(save: Save, heroId: number): HeroState | null {
  return save.heroes.find((hero) => hero.id === heroId) ?? null;
}

function heroAndLine(content: GameContent, save: Save, heroId: number) {
  const hero = findHero(save, heroId);
  const line = hero === null ? undefined : content.lines.get(hero.line);
  return hero === null || line === undefined ? null : { hero, line };
}

export function withHero(save: Save, next: HeroState): Save {
  return { ...save, heroes: save.heroes.map((hero) => (hero.id === next.id ? next : hero)) };
}

/**
 * Koszt następnego ulepszenia albo null, gdy forma ma już komplet (albo bohatera nie ma). Każde
 * ulepszenie formy kosztuje tyle samo; cena zależy od stopnia formy (ADR 0023).
 */
export function upgradeCost(content: GameContent, save: Save, heroId: number): number | null {
  const found = heroAndLine(content, save, heroId);
  if (found === null || found.hero.upgrades >= content.progression.maxUpgrades) return null;
  return found.line.forms.get(found.hero.form)?.upgradeCost ?? null;
}

/** Kupuje ulepszenie. Null, gdy brakuje złota albo forma ma komplet. */
export function applyUpgrade(content: GameContent, save: Save, heroId: number): Save | null {
  const cost = upgradeCost(content, save, heroId);
  const hero = findHero(save, heroId);
  if (cost === null || hero === null || save.gold < cost) return null;
  return withHero({ ...save, gold: save.gold - cost }, { ...hero, upgrades: hero.upgrades + 1 });
}

/** Liczba posiadanych bohaterów danej linii. */
export function ownedCount(save: Save, lineId: string): number {
  return save.heroes.filter((hero) => hero.line === lineId).length;
}

/**
 * Kupuje w sklepie bohatera linii: nowy egzemplarz w formie bazowej, bez ulepszeń. Jeśli
 * w składzie jest wolny slot, bohater od razu go zajmuje (pierwszy wolny od frontu).
 * Null, gdy linia nie istnieje albo brakuje złota.
 */
export function buyHero(content: GameContent, save: Save, lineId: string): Save | null {
  const line = content.lines.get(lineId);
  if (line === undefined || save.gold < line.price) return null;
  const hero = freshHero(content, save.nextHeroId, line);
  const free = save.squad.indexOf(null);
  return {
    ...save,
    gold: save.gold - line.price,
    heroes: [...save.heroes, hero],
    nextHeroId: save.nextHeroId + 1,
    squad: free < 0 ? save.squad : save.squad.map((id, slot) => (slot === free ? hero.id : id)),
  };
}

/** Posiadane runy, które nie są włożone żadnemu bohaterowi. */
export function freeRunes(save: Save): string[] {
  const free = [...save.runes];
  for (const hero of save.heroes) {
    for (const id of hero.runes) {
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
  heroId: number,
  slot: number,
  runeId: string | null,
): Save | null {
  const hero = findHero(save, heroId);
  if (hero === null || !Number.isInteger(slot)) return null;
  if (slot < 0 || slot >= content.progression.runeSlots) return null;
  if (runeId !== null && !freeRunes(save).includes(runeId)) return null;
  const runes = hero.runes.map((id, index) => (index === slot ? runeId : id));
  return withHero(save, { ...hero, runes });
}

/**
 * Stawia bohatera w slocie składu. Jeśli stał już w innym slocie, zamienia się miejscami
 * z zawartością slotu docelowego. Null, gdy gracz nie ma takiego bohatera.
 */
export function placeInSquad(save: Save, heroId: number, slot: number): Save | null {
  if (findHero(save, heroId) === null || slot < 0 || slot >= SQUAD_SLOTS) return null;
  const squad = [...save.squad];
  const from = squad.indexOf(heroId);
  const displaced = squad[slot] ?? null;
  if (from >= 0) squad[from] = displaced;
  squad[slot] = heroId;
  return { ...save, squad };
}

export function removeFromSquad(save: Save, slot: number): Save {
  return { ...save, squad: save.squad.map((id, index) => (index === slot ? null : id)) };
}

export function isSquadEmpty(save: Save): boolean {
  return save.squad.every((id) => id === null);
}

export interface HeroView {
  readonly hero: HeroState;
  readonly line: CompiledLine;
  /** Id jednostki bieżącej formy. */
  readonly unitId: string;
  readonly runes: readonly Rune[];
  /** Statystyki efektywne: po ulepszeniach i runach, dokładnie te, które dostaje symulacja. */
  readonly spec: UnitSpec;
}

/** Bohater z przeliczonymi statystykami albo null, gdy gracz go nie ma. */
export function heroView(content: GameContent, save: Save, heroId: number): HeroView | null {
  const found = heroAndLine(content, save, heroId);
  if (found === null) return null;
  const unitId = found.hero.form;
  const unit = content.heroes.get(unitId);
  if (unit === undefined) return null;
  const runes: Rune[] = [];
  for (const id of found.hero.runes) {
    const rune = id === null ? undefined : content.runes.get(id);
    if (rune !== undefined) runes.push(rune);
  }
  return {
    hero: found.hero,
    line: found.line,
    unitId,
    runes,
    spec: resolveUnitSpec(unit, found.hero.upgrades, runes, content.progression),
  };
}

/** Skład jako wejście `levelSetup`: bohater z rangą i runami per slot albo null. */
export function squadMembers(content: GameContent, save: Save): (SquadMember | null)[] {
  return save.squad.map((heroId) => {
    const view = heroId === null ? null : heroView(content, save, heroId);
    const unit = view === null ? undefined : content.heroes.get(view.unitId);
    if (view === null || unit === undefined) return null;
    return { unit, rank: view.hero.upgrades, runes: view.runes };
  });
}

/** Statystyki po następnym ulepszeniu albo null, gdy forma ma już komplet. */
export function previewUpgrade(content: GameContent, save: Save, heroId: number): UnitSpec | null {
  const view = heroView(content, save, heroId);
  const unit = view === null ? undefined : content.heroes.get(view.unitId);
  if (view === null || unit === undefined) return null;
  if (view.hero.upgrades >= content.progression.maxUpgrades) return null;
  return resolveUnitSpec(unit, view.hero.upgrades + 1, view.runes, content.progression);
}
