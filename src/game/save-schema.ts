// Kształt zapisu gry (docs/ARCHITECTURE.md §6.2, ADR 0005). Zmiana kształtu wymaga podniesienia
// SAVE_VERSION, migracji w save-migrations.ts i fixture w tests/fixtures/saves/.
import { z } from 'zod';

export const SAVE_VERSION = 1;

/** Liczba slotów składu; równa TEAM_SIZE symulacji. */
export const SQUAD_SLOTS = 5;

const lineStateSchema = z.strictObject({
  /** 0 = forma bazowa, 1 = forma po ewolucji. */
  form: z.union([z.literal(0), z.literal(1)]),
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
  /** Stan odblokowanych linii bohaterów; klucz to id linii. */
  lines: z.record(z.string(), lineStateSchema),
  /** Id posiadanych run, także tych włożonych; ta sama runa może wystąpić kilka razy. */
  runes: z.array(z.string()),
  levels: z.record(z.string(), levelStateSchema),
  /** Id linii w każdym slocie składu albo null. */
  squad: z.array(z.string().nullable()).length(SQUAD_SLOTS),
  settings: z.strictObject({
    lang: z.enum(['pl', 'en']),
    battleSpeed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  }),
});

export type Save = z.infer<typeof saveSchema>;
export type LineState = z.infer<typeof lineStateSchema>;
export type LevelState = z.infer<typeof levelStateSchema>;
export type BattleSpeed = Save['settings']['battleSpeed'];
