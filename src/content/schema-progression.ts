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

export const lineSchema = z.strictObject({
  id,
  /** Forma bazowa i forma po ewolucji; id jednostek z units/heroes.json. */
  forms: z.tuple([id, id]),
  /** Koszty kolejnych ulepszeń: najpierw formy bazowej, potem formy po ewolucji. */
  upgradeCosts: z.tuple([z.array(cost), z.array(cost)]),
  evolveCost: cost,
  unlock: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('start') }),
    /** Linia odblokowana po pierwszym przejściu wskazanego poziomu. */
    z.strictObject({ type: z.literal('level'), level: id }),
  ]),
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
export type Rune = z.infer<typeof runeSchema>;
export type RawWorld = z.infer<typeof worldSchema>;
export type RawLevel = z.infer<typeof levelSchema>;
