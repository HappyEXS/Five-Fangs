// Schematy danych progresji: linie bohaterów, runy, światy, poziomy i stałe progresji.
import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id: małe litery, cyfry i podkreślenia');
const cost = z.number().int().positive();

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
});

/**
 * Forma bohatera w drzewie ewolucji linii (ADR 0016). Każda forma poza bazową wskazuje formę,
 * z której powstaje; jedna forma może mieć kilka następnych, wtedy gracz wybiera drogę.
 */
export const formSchema = z.strictObject({
  /** Id jednostki z units/heroes.json. */
  unit: id,
  /** Forma, z której ta powstaje przez ewolucję. Brak tylko przy formie bazowej. */
  from: id.optional(),
  /** Koszt ewolucji w tę formę; podawany razem z `from`. */
  evolveCost: cost.optional(),
  /** Koszty kolejnych ulepszeń tej formy. */
  upgradeCosts: z.array(cost),
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

export const runeSchema = z.strictObject({
  id,
  stat: z.enum(['attack', 'maxHp']),
  value: z.number().int().positive(),
});

export const worldSchema = z.strictObject({ id });

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
    /** Runa za pierwsze przejście. */
    rune: id.optional(),
  }),
});

export const linesSchema = z.array(lineSchema);
export const runesSchema = z.array(runeSchema);
export const worldsSchema = z.array(worldSchema);
export const levelsSchema = z.array(levelSchema);

export type Progression = z.infer<typeof progressionSchema>;
export type RawLine = z.infer<typeof lineSchema>;
export type RawForm = z.infer<typeof formSchema>;
export type Rune = z.infer<typeof runeSchema>;
export type RawWorld = z.infer<typeof worldSchema>;
export type RawLevel = z.infer<typeof levelSchema>;
