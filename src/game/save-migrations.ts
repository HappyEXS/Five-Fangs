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

/**
 * v2 → v3: forma bohatera jako id jednostki zamiast indeksu (0 = bazowa, 1 = po ewolucji), bo
 * formy linii tworzą teraz drzewo (ADR 0016). W treści gry z czasów zapisu v2 każda linia `L`
 * miała dokładnie dwie formy, `L_a` i `L_b`, więc indeks wystarcza do odtworzenia id. Formę,
 * której nie zna bieżąca treść, poprawia potem reconcileSave. Inna wartość niż 0 i 1 zostaje
 * bez zmian i odrzuci ją schemat.
 */
function formIndexToUnit(save: Record<string, unknown>): Record<string, unknown> {
  const heroes = Array.isArray(save.heroes)
    ? save.heroes.map((hero: unknown) => {
        if (!isRecord(hero) || typeof hero.line !== 'string') return hero;
        if (hero.form !== 0 && hero.form !== 1) return hero;
        return { ...hero, form: `${hero.line}_${hero.form === 1 ? 'b' : 'a'}` };
      })
    : save.heroes;
  return { ...save, saveVersion: 3, heroes };
}

/** Linie, które w wersji 4 weszły do szczepów Mieczników i Łuczników. */
const MERGED_LINES: ReadonlyMap<string, string> = new Map([
  ['guard', 'swordsman'],
  ['cleric', 'archer'],
]);

/**
 * Formy, których w wersji 4 już nie ma: kopie z testowych drzew ewolucji (ADR 0016). Każda
 * wskazuje prawdziwą formę tej samej postaci: „Strażnik (kopia)” i „Strażnik II” to Strażnik,
 * „Rycerz (kopia)” to forma o statystykach dawnego Rycerza (dziś Zbrojny, `swordsman_b`),
 * a „Rycerz II (kopia)” to dzisiejszy Rycerz (`swordsman_b2`); u łuczników tak samo.
 */
const MERGED_FORMS: ReadonlyMap<string, string> = new Map([
  ['swordsman_c', 'guard_b'],
  ['swordsman_c2', 'guard_b'],
  ['guard_b2', 'guard_b'],
  ['guard_c', 'swordsman_b'],
  ['guard_c2', 'swordsman_b2'],
  ['archer_c', 'cleric_b'],
  ['archer_c2', 'cleric_b'],
  ['cleric_b2', 'cleric_b'],
  ['cleric_c', 'archer_b'],
  ['cleric_c2', 'archer_b2'],
]);

/**
 * v3 → v4: cztery linie ludzi (Miecznicy, Łucznicy, Tarczownicy, Akolici) stają się dwoma
 * szczepami po siedem form. Bez tej migracji reconcileSave usunąłby bohaterów linii, których
 * już nie ma, a bohaterów w formach-kopiach cofnął do formy bazowej. Bohater zachowuje id,
 * liczbę ulepszeń i runy; formy `swordsman_b`, `archer_b`, `guard_a`, `guard_b`,
 * `cleric_a` i `cleric_b` istnieją dalej pod tym samym id.
 */
function mergeHumanLines(save: Record<string, unknown>): Record<string, unknown> {
  const heroes = Array.isArray(save.heroes)
    ? save.heroes.map((hero: unknown) => {
        if (!isRecord(hero)) return hero;
        const line = typeof hero.line === 'string' ? MERGED_LINES.get(hero.line) : undefined;
        const form = typeof hero.form === 'string' ? MERGED_FORMS.get(hero.form) : undefined;
        return { ...hero, line: line ?? hero.line, form: form ?? hero.form };
      })
    : save.heroes;
  return { ...save, saveVersion: 4, heroes };
}

/**
 * v4 → v5: runy przestają być nagrodami za poziomy i stają się węzłami drzewka run, które gracz
 * odblokowuje żetonami (ADR 0026). Dawnych run nie ma już w treści gry, więc znikają z zapasu
 * i z gniazd bohaterów. Gracz nic nie traci: żetony wynikają z przeszłych poziomów (runes.ts),
 * więc po wczytaniu ma do wydania po jednym za każdy poziom, który dziś daje żeton.
 */
function dropRewardRunes(save: Record<string, unknown>): Record<string, unknown> {
  const heroes = Array.isArray(save.heroes)
    ? save.heroes.map((hero: unknown) => {
        if (!isRecord(hero) || !Array.isArray(hero.runes)) return hero;
        return { ...hero, runes: hero.runes.map(() => null) };
      })
    : save.heroes;
  return { ...save, saveVersion: 5, heroes, runes: [] };
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: linesToHeroes,
  2: formIndexToUnit,
  3: mergeHumanLines,
  4: dropRewardRunes,
};
