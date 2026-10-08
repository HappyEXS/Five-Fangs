// Schematy danych progresji: linie bohaterów, runy, światy, poziomy i stałe progresji.
import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id: małe litery, cyfry i podkreślenia');
const cost = z.number().int().positive();

/**
 * Koszty jednego stopnia drzewa ewolucji (ADR 0023). Cena zależy tylko od stopnia formy: każde
 * ulepszenie formy kosztuje tyle samo, a wszystkie linie płacą według tej samej tabeli.
 */
export const tierSchema = z.strictObject({
  /** Koszt ewolucji w formę tego stopnia. Brak tylko przy stopniu 0 (forma bazowa ze sklepu). */
  evolveCost: cost.optional(),
  /** Koszt każdego ulepszenia formy tego stopnia. */
  upgradeCost: cost,
});

export const progressionSchema = z.strictObject({
  /** Liczba ulepszeń jednej formy bohatera. */
  maxUpgrades: z.number().int().positive(),
  /** O ile procent wartości bazowej rosną maxHp i attack na jedno ulepszenie albo poziom wroga. */
  upgradePercent: z.number().int().positive(),
  /** Sloty na runy na bohatera. */
  runeSlots: z.number().int().nonnegative(),
  /** Procent złota za powtórne przejście poziomu. */
  replayGoldPercent: z.number().int().min(0).max(100),
  /** Wymagana liczba poziomów w każdym świecie. */
  levelsPerWorld: z.number().int().positive(),
  /** Koszty według stopnia formy; indeks 0 to forma bazowa. */
  tiers: z.array(tierSchema).min(1),
});

/**
 * Forma bohatera w drzewie ewolucji linii (ADR 0016). Każda forma poza bazową wskazuje formę,
 * z której powstaje; jedna forma może mieć kilka następnych, wtedy gracz wybiera drogę. Koszty
 * ulepszeń i ewolucji wynikają ze stopnia formy (`progression.json`, ADR 0023).
 */
export const formSchema = z.strictObject({
  /** Id jednostki z units/heroes.json. */
  unit: id,
  /** Forma, z której ta powstaje przez ewolucję. Brak tylko przy formie bazowej. */
  from: id.optional(),
});

export const lineSchema = z.strictObject({
  id,
  /** Formy linii: dokładnie jedna bez `from` (bazowa), reszta tworzy z nią drzewo. */
  forms: z.array(formSchema).min(1),
  /** Cena jednego bohatera tej linii w sklepie; każdy kolejny egzemplarz kosztuje tyle samo. */
  price: cost,
  /** Gracz zaczyna grę z jednym bohaterem tej linii. */
  starter: z.boolean().default(false),
});

/**
 * Statystyki, które wzmacniają runy: zamknięty zestaw. Nowa statystyka = wpis tutaj, jej
 * przeliczenie w load-runes.ts i dodanie w resolveUnitSpec.
 */
export const RUNE_STATS = ['maxHp', 'attack', 'knockback', 'moveSpeed'] as const;
export type RuneStat = (typeof RUNE_STATS)[number];

/**
 * Kierunek drzewka run (ADR 0026): kolejne runy jednej statystyki, każda mocniejsza od
 * poprzedniej. Runa nie ma własnego id w danych: dostaje je z kierunku i miejsca w nim.
 */
export const runeBranchSchema = z.strictObject({
  id,
  stat: z.enum(RUNE_STATS),
  /**
   * Premie kolejnych run kierunku, od pierwszej. Wartości płaskie: życie i atak w punktach,
   * odrzut w jednostkach świata, szybkość w jednostkach świata na sekundę.
   */
  values: z.array(z.number().int().positive()).min(1),
});

export const runeTreeSchema = z.strictObject({
  branches: z.array(runeBranchSchema).min(1),
});

/**
 * Tła sceny: zamknięty zestaw, każde jest narysowane kodem w rendererze (render/backdrops).
 * Nowe tło = nowy wpis tutaj i jego rysunek; typ pilnuje, że renderer zna każde z nich.
 */
export const BACKDROP_IDS = ['castle', 'mechanus', 'swamps', 'jungle', 'tower', 'citadel'] as const;
export type BackdropId = (typeof BACKDROP_IDS)[number];

export const worldSchema = z.strictObject({
  id,
  /** Tło sceny na mapie tego świata i w jego walkach. */
  backdrop: z.enum(BACKDROP_IDS),
});

export const levelSchema = z.strictObject({
  id,
  enemies: z
    .array(
      z.strictObject({
        slot: z.number().int().min(0).max(4),
        /** Id jednostki: forma bohatera albo jednostka specjalna z units/enemies.json. */
        unit: id,
        /** Poziom siły: skaluje maxHp i attack jak ulepszenia bohatera. */
        level: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(5),
  rewards: z.strictObject({
    gold: z.number().int().nonnegative(),
    /** Żeton run za pierwsze przejście: odblokowuje jedną runę drzewka (ADR 0026). */
    runeToken: z.boolean().default(false),
  }),
});

export const linesSchema = z.array(lineSchema);
export const worldsSchema = z.array(worldSchema);
export const levelsSchema = z.array(levelSchema);

export type Progression = z.infer<typeof progressionSchema>;
export type TierCosts = z.infer<typeof tierSchema>;
export type RawLine = z.infer<typeof lineSchema>;
export type RawForm = z.infer<typeof formSchema>;
export type RawRuneBranch = z.infer<typeof runeBranchSchema>;
export type RawRuneTree = z.infer<typeof runeTreeSchema>;
export type RawWorld = z.infer<typeof worldSchema>;
export type RawLevel = z.infer<typeof levelSchema>;
