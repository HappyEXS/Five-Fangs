// Żetony run i drzewko run (ADR 0026). Żeton wpada za pierwsze przejście wybranych poziomów
// i odblokowuje następną runę w wybranym kierunku drzewka; odblokowana runa jest przedmiotem,
// który gracz wkłada bohaterom w gniazda (progress.ts). Czyste funkcje nad treścią i zapisem.
import type { GameContent } from '../content/load.ts';
import type { Rune, RuneBranch } from '../content/load-progression.ts';
import { isLevelCleared } from './progress.ts';
import type { Save } from './save-schema.ts';

/** Żetony zdobyte dotąd: po jednym za każdy przeszły poziom, który daje żeton. */
export function earnedTokens(content: GameContent, save: Save): number {
  let earned = 0;
  for (const level of content.levels.values()) {
    if (level.runeToken && isLevelCleared(save, level.id)) earned++;
  }
  return earned;
}

/**
 * Żetony do wydania. Zapis ich nie przechowuje: każda posiadana runa kosztowała jeden żeton,
 * więc wystarczy odjąć runy od żetonów zdobytych. Dzięki temu licznik nie może rozjechać się
 * z postępem na mapie, także po zmianie treści gry.
 */
export function runeTokens(content: GameContent, save: Save): number {
  const spent = save.runes.filter((id) => content.runes.has(id)).length;
  return Math.max(0, earnedTokens(content, save) - spent);
}

/** Następna runa kierunku: pierwsza, której gracz jeszcze nie ma. Null, gdy ma cały kierunek. */
export function nextRune(save: Save, branch: RuneBranch): Rune | null {
  return branch.runes.find((rune) => !save.runes.includes(rune.id)) ?? null;
}

/**
 * Wydaje żeton na runę. Null, gdy gracz nie ma żetonu, runy nie ma w drzewku albo nie jest
 * następną w swoim kierunku (kierunek odblokowuje się po kolei).
 */
export function unlockRune(content: GameContent, save: Save, runeId: string): Save | null {
  const rune = content.runes.get(runeId);
  const branch = content.runeTree.find((entry) => entry.id === rune?.branch);
  if (rune === undefined || branch === undefined) return null;
  if (runeTokens(content, save) === 0 || nextRune(save, branch) !== rune) return null;
  return { ...save, runes: [...save.runes, rune.id] };
}

/** `owned` – gracz ma tę runę; `next` – następna w kierunku; `locked` – dalsza, jeszcze zamknięta. */
export type RuneNodeState = 'owned' | 'next' | 'locked';

export interface RuneNodeView {
  readonly rune: Rune;
  readonly state: RuneNodeState;
}

export interface RuneBranchView {
  readonly branch: RuneBranch;
  readonly nodes: readonly RuneNodeView[];
}

export interface RuneTreeView {
  /** Żetony do wydania; runę `next` można wziąć, gdy jest co najmniej jeden. */
  readonly tokens: number;
  readonly branches: readonly RuneBranchView[];
}

/** Drzewko run tak, jak widzi je gracz: co ma, co może wziąć teraz i co czeka dalej. */
export function runeTreeView(content: GameContent, save: Save): RuneTreeView {
  return {
    tokens: runeTokens(content, save),
    branches: content.runeTree.map((branch) => {
      const next = nextRune(save, branch);
      return {
        branch,
        nodes: branch.runes.map((rune) => ({
          rune,
          state: save.runes.includes(rune.id) ? 'owned' : rune === next ? 'next' : 'locked',
        })),
      };
    }),
  };
}
