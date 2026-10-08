// Kształt zapisu gry (docs/ARCHITECTURE.md §6.2, ADR 0005). Zmiana kształtu wymaga podniesienia
// SAVE_VERSION, migracji w save-migrations.ts i fixture w tests/fixtures/saves/.
//
// Wersja 5: ten sam kształt co w wersji 4, ale runy to węzły drzewka run (ADR 0026): gracz
// odblokowuje je żetonami za przejście poziomów. Dawne runy z nagród za poziomy znikają
// w migracji; żetonów zapis nie trzyma, bo wynikają z przeszłych poziomów (runes.ts).
// Wersja 4: ten sam kształt co w wersji 3, ale inne linie: cztery dawne linie ludzi to teraz
// dwa szczepy po siedem form (M5j), więc bohaterowie linii, które znikły, i form-kopii z drzew
// testowych dostają w migracji nową linię i formę.
// Wersja 3: forma bohatera to id jednostki, bo formy linii tworzą drzewo ewolucji (ADR 0016).
// Wersja 2: bohaterowie są egzemplarzami (gracz może mieć kilku bohaterów tej samej linii,
// każdy z własnymi ulepszeniami i runami). W wersji 1 stan był trzymany per linia.
import { z } from 'zod';

export const SAVE_VERSION = 5;

/** Liczba slotów składu; równa TEAM_SIZE symulacji. */
export const SQUAD_SLOTS = 5;

const heroSchema = z.strictObject({
  /** Id egzemplarza, unikalne w zapisie; nadawane kolejno przy zdobyciu bohatera. */
  id: z.number().int().positive(),
  /** Id linii z lines.json. */
  line: z.string(),
  /** Id jednostki bieżącej formy: jednej z form linii w lines.json. */
  form: z.string(),
  /** Liczba ulepszeń bieżącej formy. */
  upgrades: z.number().int().nonnegative(),
  /** Id runy w każdym slocie albo null. */
  runes: z.array(z.string().nullable()),
});

const levelStateSchema = z.strictObject({
  cleared: z.boolean(),
  /** Najkrótsza wygrana walka w tickach. */
  bestTicks: z.number().int().positive().nullable(),
});

export const saveSchema = z.strictObject({
  saveVersion: z.literal(SAVE_VERSION),
  /** Wersja gry, która zapisała plik; tylko do diagnostyki. */
  gameVersion: z.string(),
  gold: z.number().int().nonnegative(),
  /** Posiadani bohaterowie w kolejności zdobycia. */
  heroes: z.array(heroSchema),
  /** Id, które dostanie następny zdobyty bohater. */
  nextHeroId: z.number().int().positive(),
  /** Id odblokowanych run drzewka, także tych włożonych; każda runa istnieje raz. */
  runes: z.array(z.string()),
  levels: z.record(z.string(), levelStateSchema),
  /** Id bohatera w każdym slocie składu albo null. */
  squad: z.array(z.number().int().positive().nullable()).length(SQUAD_SLOTS),
  settings: z.strictObject({
    lang: z.enum(['pl', 'en']),
    battleSpeed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  }),
});

export type Save = z.infer<typeof saveSchema>;
export type HeroState = z.infer<typeof heroSchema>;
export type LevelState = z.infer<typeof levelStateSchema>;
export type BattleSpeed = Save['settings']['battleSpeed'];
