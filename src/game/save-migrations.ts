// Migracje zapisu vN → vN+1 (ADR 0005). Klucz to wersja wejściowa. Starych migracji nigdy
// nie usuwamy: gracz może wrócić z zapisem z dowolnej wcześniejszej wersji gry.
//
// Migracja dostaje dane, które nie przeszły jeszcze żadnej walidacji, więc niczego o nich nie
// zakłada. Wynik całego łańcucha sprawdza schemat bieżącej wersji; śmieci na wejściu kończą się
// tam odrzuceniem zapisu, nie wyjątkiem.
//
// Każda migracja ma test z zapisanym przykładowym plikiem w tests/fixtures/saves/.

export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * v1 → v2: stan per linia (`lines`) staje się listą egzemplarzy bohaterów (`heroes`).
 * Każda linia z v1 daje jednego bohatera z jej formą, ulepszeniami i runami; skład zamiast
 * id linii trzyma id bohaterów.
 */
function linesToHeroes(save: Record<string, unknown>): Record<string, unknown> {
  const { lines, squad, ...rest } = save;
  const heroes: Record<string, unknown>[] = [];
  const heroOfLine = new Map<string, number>();
  let nextHeroId = 1;
  if (isRecord(lines)) {
    for (const [line, state] of Object.entries(lines)) {
      if (!isRecord(state)) continue;
      heroes.push({
        id: nextHeroId,
        line,
        form: state.form,
        upgrades: state.upgrades,
        runes: state.runes,
      });
      heroOfLine.set(line, nextHeroId);
      nextHeroId++;
    }
  }
  const slots = Array.isArray(squad) ? squad : [];
  return {
    ...rest,
    saveVersion: 2,
    heroes,
    nextHeroId,
    squad: slots.map((line) => (typeof line === 'string' ? (heroOfLine.get(line) ?? null) : null)),
  };
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: linesToHeroes,
};
