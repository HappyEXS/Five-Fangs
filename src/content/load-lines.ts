// Linie bohaterów: drzewo form połączonych ewolucjami (ADR 0016). Kompilacja sprawdza, że
// drzewo jest drzewem: jedna forma bazowa, każda inna osiągalna z niej dokładnie jedną drogą,
// każda forma to znana jednostka bohatera należąca tylko do tej linii.
import type { CompiledUnit } from './compile.ts';
import type { ContentIssue } from './issues.ts';
import type { Progression, RawLine } from './schema-progression.ts';

export interface CompiledForm {
  /** Id jednostki z units/heroes.json. */
  readonly unit: string;
  /** Forma, z której ta powstaje przez ewolucję; null dla formy bazowej. */
  readonly from: string | null;
  /** Koszt ewolucji w tę formę; 0 dla formy bazowej. */
  readonly evolveCost: number;
  /** Koszty kolejnych ulepszeń tej formy. */
  readonly upgradeCosts: readonly number[];
  /** Formy, w które ta może ewoluować, w kolejności z treści; pusta, gdy to ostatni stopień. */
  readonly next: readonly string[];
  /** Stopień w drzewie: 0 = forma bazowa, 1 = pierwsza ewolucja itd. */
  readonly tier: number;
}

export interface CompiledLine {
  readonly id: string;
  /** Id jednostki formy bazowej: tę formę kupuje się w sklepie. */
  readonly base: string;
  /** Wszystkie formy linii po id jednostki, w kolejności z treści. */
  readonly forms: ReadonlyMap<string, CompiledForm>;
  /** Cena jednego bohatera tej linii w sklepie. */
  readonly price: number;
  /** Gracz zaczyna grę z jednym bohaterem tej linii. */
  readonly starter: boolean;
}

/**
 * Kompiluje jedną linię. `usedForms` zbiera formy wszystkich linii, żeby wykryć jednostkę
 * w dwóch liniach. Zwraca null, gdy drzewa nie da się zbudować (brak formy bazowej).
 */
export function compileLine(
  line: RawLine,
  heroes: ReadonlyMap<string, CompiledUnit>,
  progression: Progression,
  usedForms: Set<string>,
  issues: ContentIssue[],
): CompiledLine | null {
  const source = 'lines.json';
  const problem = (message: string): void => {
    issues.push({ source, message: `${line.id}: ${message}` });
  };

  const raw = new Map<string, RawLine['forms'][number]>();
  for (const form of line.forms) {
    if (raw.has(form.unit)) problem(`forma "${form.unit}" powtórzona`);
    else raw.set(form.unit, form);
    if (!heroes.has(form.unit)) problem(`nieznana forma "${form.unit}"`);
    if (usedForms.has(form.unit)) problem(`forma "${form.unit}" należy już do innej linii`);
    usedForms.add(form.unit);
    if (form.upgradeCosts.length !== progression.maxUpgrades) {
      problem(
        `forma "${form.unit}" musi mieć ${progression.maxUpgrades} kosztów ulepszeń (jest ${form.upgradeCosts.length})`,
      );
    }
    if ((form.from === undefined) !== (form.evolveCost === undefined)) {
      problem(`forma "${form.unit}": "from" i "evolveCost" podaje się razem`);
    }
    if (form.from !== undefined && !line.forms.some((other) => other.unit === form.from)) {
      problem(`forma "${form.unit}" powstaje z "${form.from}", której nie ma w tej linii`);
    }
  }

  const roots = [...raw.values()].filter((form) => form.from === undefined);
  if (roots.length !== 1) {
    problem(`musi mieć dokładnie jedną formę bazową, bez "from" (ma ${roots.length})`);
  }
  const base = roots[0];
  if (base === undefined) return null;

  // Stopień formy to liczba ewolucji od formy bazowej. Droga dłuższa niż liczba form oznacza
  // cykl: takie formy są nieosiągalne z formy bazowej.
  const tierOf = (unit: string): number | null => {
    let tier = 0;
    let current = raw.get(unit);
    while (current?.from !== undefined) {
      tier++;
      if (tier > raw.size) return null;
      current = raw.get(current.from);
    }
    return current === undefined ? null : tier;
  };

  const forms = new Map<string, CompiledForm>();
  for (const form of raw.values()) {
    const tier = tierOf(form.unit);
    if (tier === null) {
      problem(`forma "${form.unit}" nie jest osiągalna z formy bazowej (cykl ewolucji)`);
      continue;
    }
    forms.set(form.unit, {
      unit: form.unit,
      from: form.from ?? null,
      evolveCost: form.evolveCost ?? 0,
      upgradeCosts: form.upgradeCosts,
      next: line.forms.filter((other) => other.from === form.unit).map((other) => other.unit),
      tier,
    });
  }

  return {
    id: line.id,
    base: base.unit,
    forms,
    price: line.price,
    starter: line.starter,
  };
}
