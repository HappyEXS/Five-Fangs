// Inne drogi przez drzewko run (ADR 0026). Poziomy są strojone do planu składu odniesienia
// (życie i atak na zmianę), ale gracz może iść w dowolny kierunek. Raport pokazuje, jak na
// poziomach wymagających run radzi sobie ten sam skład, gdy żetony wyda inaczej: czy któryś
// kierunek jest bezużyteczny albo czy rozstrzyga grę sam.
import type { GameContent } from '../../src/content/load.ts';
import { type FightResult, fightLevel, type LevelReport, levelOrder } from './balance.ts';
import { type Reference, squadForGold } from './reference-plan.ts';
import { HOLDERS, type Holders, runesForTokens, tokensBefore } from './reference-runes.ts';

export interface RunePath {
  /** `reference`, `all` albo id kierunku, w który gracz idzie najpierw. */
  readonly id: string;
  /** Kolejne plany wydawania żetonów; następny zaczyna się, gdy poprzedni nie ma już czego brać. */
  readonly phases: readonly (readonly string[])[];
}

/**
 * Drogi do porównania: plan odniesienia, każdy kierunek brany najpierw do końca (potem plan
 * odniesienia) i wszystkie kierunki po równo.
 */
export function runePaths(content: GameContent, reference: Reference): RunePath[] {
  const branches = content.runeTree.map((branch) => branch.id);
  return [
    { id: 'reference', phases: [reference.runes] },
    ...branches.map((id) => ({ id, phases: [[id], reference.runes] })),
    { id: 'all', phases: [branches] },
  ];
}

export interface PathResult extends FightResult {
  /** Komu poszły runy kierunku tej drogi; null, gdy droga ma rozdanie składu odniesienia. */
  readonly holders: Holders | null;
}

export interface PathReport {
  readonly level: string;
  /** Żetony zdobyte przed poziomem. */
  readonly tokens: number;
  /** Wynik składu odniesienia dla każdej drogi, w kolejności `runePaths`. */
  readonly results: readonly PathResult[];
}

/** Wynik jako jedna liczba: wygrana tym lepsza, im więcej życia zostało; przegrana odwrotnie. */
function score(result: FightResult): number {
  if (result.win) return result.remainingHpPercent;
  return result.reason === 'timeout' ? -1000 : -result.remainingHpPercent;
}

/**
 * Walki na poziomach, które wymagają run (`reports` z runBalance), każdą z dróg. Runy odrzutu
 * i szybkości pomagają jednym bohaterom, a innym szkodzą, a gracz może je przekładać za darmo,
 * więc droga w taki kierunek dostaje wynik najlepszego z rozdań jego run (HOLDERS). Życie i atak
 * mają rozdanie składu odniesienia.
 */
export function runPaths(
  content: GameContent,
  reference: Reference,
  reports: readonly LevelReport[],
): PathReport[] {
  const levels = levelOrder(content);
  const paths = runePaths(content, reference);
  const rows: PathReport[] = [];
  reports.forEach((report, index) => {
    const level = levels[index];
    if (level === undefined || !report.needsRunes) return;
    const squad = squadForGold(content, reference, report.goldBefore);
    const tokens = tokensBefore(levels, index);
    const results = paths.map((path): PathResult => {
      const runes = runesForTokens(content, path.phases, tokens);
      const stat = content.runeTree.find((branch) => branch.id === path.id)?.stat;
      if (stat === undefined || stat === 'maxHp' || stat === 'attack') {
        return { ...fightLevel(content, level, squad, runes), holders: null };
      }
      let best: PathResult | undefined;
      for (const holders of HOLDERS) {
        const result = fightLevel(content, level, squad, runes, { [stat]: holders });
        if (best === undefined || score(result) > score(best)) best = { ...result, holders };
      }
      if (best === undefined) throw new Error('No holders to try');
      return best;
    });
    rows.push({ level: level.id, tokens, results });
  });
  return rows;
}
