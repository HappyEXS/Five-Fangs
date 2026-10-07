// Skład odniesienia do balansu poziomów (ADR 0025): kto w nim jest i w jakiej kolejności wydaje
// złoto. Poziomy są strojone do tego, co ten skład może mieć za złoto zdobyte wcześniej, więc
// plan zakupów jest częścią balansu: zmiana kosztów albo nagród zmienia skład na każdym poziomie.
import { z } from 'zod';
import type { ContentIssue } from '../../src/content/issues.ts';
import type { GameContent } from '../../src/content/load.ts';
import type { CompiledLine } from '../../src/content/load-progression.ts';
import { displayPath } from '../../src/game/evolution.ts';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);

export const referenceSchema = z.strictObject({
  /**
   * Bohaterowie składu odniesienia w kolejności kupowania. Pierwsi to linie startowe, które
   * gracz ma od początku gry; resztę kupuje w sklepie.
   */
  squad: z
    .array(
      z.strictObject({
        slot: z.number().int().min(0).max(4),
        line: id,
        /**
         * Droga ewolucji: kolejne formy po formie bazowej. Bez tego pola bohater idzie główną
         * drogą linii (pierwsza z następnych form na każdym stopniu).
         */
        via: z.array(id).optional(),
      }),
    )
    .min(1)
    .max(5),
});

export type Reference = z.infer<typeof referenceSchema>;

export function validateReference(content: GameContent, reference: Reference): ContentIssue[] {
  const source = 'balance/reference-squads.json';
  const issues: ContentIssue[] = [];
  const slots = new Set<number>();
  const starters = [...content.lines.values()].filter((line) => line.starter).map((l) => l.id);
  reference.squad.forEach((member, index) => {
    if (slots.has(member.slot)) {
      issues.push({ source, message: `slot ${member.slot} użyty więcej niż raz` });
    }
    slots.add(member.slot);
    if (!content.lines.has(member.line)) {
      issues.push({ source, message: `nieznana linia "${member.line}"` });
    }
    const line = content.lines.get(member.line);
    let from = line?.base;
    for (const form of member.via ?? []) {
      if (line?.forms.get(form)?.from !== from) {
        issues.push({
          source,
          message: `${member.line}: forma "${form}" nie powstaje z "${from}"`,
        });
        break;
      }
      from = form;
    }
    const starter = starters[index];
    if (starter !== undefined && member.line !== starter) {
      issues.push({
        source,
        message: `bohater ${index + 1} składu musi być linią startową "${starter}" (jest "${member.line}")`,
      });
    }
  });
  if (reference.squad.length < starters.length) {
    issues.push({ source, message: 'skład musi zawierać wszystkie linie startowe' });
  }
  return issues;
}

/**
 * Droga ewolucji bohatera składu odniesienia: podana w `via` albo główna droga linii, czyli na
 * każdym stopniu pierwsza z następnych form w kolejności z treści (ADR 0016).
 */
function pathOf(line: CompiledLine, via: readonly string[] | undefined): string[] {
  return via === undefined ? displayPath(line, line.base) : [line.base, ...via];
}

export interface PurchaseStep {
  /** Indeks bohatera w składzie odniesienia. */
  readonly member: number;
  readonly kind: 'buy' | 'upgrade' | 'evolve';
  readonly cost: number;
}

/**
 * Kolejność zakupów składu odniesienia. Gracz, który wydaje złoto rozsądnie, najpierw kupuje
 * brakujących bohaterów (nowy bohater daje więcej niż ulepszenia za tę samą cenę), a potem
 * rozwija wszystkich równo: po jednym ulepszeniu każdemu, po komplecie ewolucja każdego.
 */
export function purchaseOrder(content: GameContent, reference: Reference): PurchaseStep[] {
  const lines = reference.squad.map((member) => content.lines.get(member.line));
  const paths = lines.map((line, member) =>
    line === undefined ? [] : pathOf(line, reference.squad[member]?.via),
  );
  const steps: PurchaseStep[] = [];
  lines.forEach((line, member) => {
    const starter = [...content.lines.values()].filter((l) => l.starter)[member];
    if (line !== undefined && starter?.id !== line.id) {
      steps.push({ member, kind: 'buy', cost: line.price });
    }
  });
  const tiers = Math.max(0, ...paths.map((path) => path.length));
  for (let tier = 0; tier < tiers; tier++) {
    for (let upgrade = 0; upgrade < content.progression.maxUpgrades; upgrade++) {
      paths.forEach((path, member) => {
        const form = lines[member]?.forms.get(path[tier] ?? '');
        if (form !== undefined) steps.push({ member, kind: 'upgrade', cost: form.upgradeCost });
      });
    }
    paths.forEach((path, member) => {
      const next = lines[member]?.forms.get(path[tier + 1] ?? '');
      if (next !== undefined) steps.push({ member, kind: 'evolve', cost: next.evolveCost });
    });
  }
  return steps;
}

export interface PlannedMember {
  readonly line: string;
  readonly slot: number;
  /** Id jednostki bieżącej formy. */
  readonly form: string;
  readonly tier: number;
  readonly upgrades: number;
}

export interface PlannedSquad {
  /** Bohaterowie, których gracz już ma, w kolejności kupowania. */
  readonly members: readonly PlannedMember[];
  readonly spent: number;
  /** Skład kupił wszystko, co się dało: dalsze złoto już go nie wzmacnia. */
  readonly maxed: boolean;
}

/** Skład odniesienia, na jaki stać gracza z `gold` złota zdobytego od początku gry. */
export function squadForGold(
  content: GameContent,
  reference: Reference,
  gold: number,
): PlannedSquad {
  const starters = [...content.lines.values()].filter((line) => line.starter);
  const owned = reference.squad.map((member, index) => starters[index]?.id === member.line);
  const tier = reference.squad.map(() => 0);
  const upgrades = reference.squad.map(() => 0);
  let spent = 0;
  let taken = 0;
  const steps = purchaseOrder(content, reference);
  for (const step of steps) {
    if (spent + step.cost > gold) break;
    spent += step.cost;
    taken++;
    if (step.kind === 'buy') owned[step.member] = true;
    else if (step.kind === 'upgrade') upgrades[step.member] = (upgrades[step.member] ?? 0) + 1;
    else {
      tier[step.member] = (tier[step.member] ?? 0) + 1;
      upgrades[step.member] = 0;
    }
  }
  const members: PlannedMember[] = [];
  reference.squad.forEach((member, index) => {
    const line = content.lines.get(member.line);
    if (line === undefined || owned[index] !== true) return;
    const form = pathOf(line, member.via)[tier[index] ?? 0] ?? line.base;
    members.push({
      line: member.line,
      slot: member.slot,
      form,
      tier: tier[index] ?? 0,
      upgrades: upgrades[index] ?? 0,
    });
  });
  return { members, spent, maxed: taken === steps.length };
}

/** Ranga bohatera: litera stopnia (A forma bazowa, B pierwsza ewolucja…) i liczba ulepszeń. */
export function rankLabel(member: Pick<PlannedMember, 'tier' | 'upgrades'>): string {
  return `${String.fromCharCode(65 + member.tier)}${member.upgrades}`;
}

/** Opis składu dla raportu: rangi od frontu, np. „5 × B2” albo „B3 B3 B2 B2 B2”. */
export function squadLabel(squad: PlannedSquad): string {
  const ranks = [...squad.members].sort((a, b) => a.slot - b.slot).map(rankLabel);
  const first = ranks[0] ?? '';
  return ranks.every((rank) => rank === first) ? `${ranks.length} × ${first}` : ranks.join(' ');
}
