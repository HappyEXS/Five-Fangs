// Schematy surowych danych treści. Dane są czytelne dla człowieka: sekundy, jednostki świata,
// stringowe id. Na struktury runtime zamienia je compile.ts.
import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id: małe litery, cyfry i podkreślenia');

export const arenaSchema = z.strictObject({
  /** Szerokość pola walki w jednostkach świata. */
  width: z.number().int().positive(),
  /** Pozycje startowe slotów; slot 0 najbliżej środka. */
  playerSlots: z.array(z.number().int().nonnegative()).length(5),
  enemySlots: z.array(z.number().int().nonnegative()).length(5),
  /** Limit czasu walki w sekundach. */
  timeLimit: z.number().positive(),
});

export const attackTypeSchema = z.strictObject({
  id,
  /** Czas zamachu w sekundach. */
  swingDuration: z.number().positive(),
  /** Moment trafienia albo wystrzału jako ułamek zamachu. */
  hitFraction: z.number().gt(0).lt(1),
  /** Klip animacji ataku. */
  clip: z.string().min(1),
  projectile: z
    .strictObject({
      /** Prędkość pocisku w jednostkach świata na sekundę. */
      speed: z.number().positive(),
      sprite: z.string().min(1),
    })
    .optional(),
});

/** Cechy pasywne: zamknięty zestaw, każda ma kod w symulacji (ADR 0009). */
export const traitSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('periodicHeal'),
    /** `self` leczy tylko siebie, `team` wszystkich żywych sojuszników wraz z sobą. */
    target: z.enum(['self', 'team']),
    amount: z.number().int().positive(),
    /** Odstęp między leczeniami w sekundach, liczony od początku walki. */
    interval: z.number().positive(),
  }),
  /** Pociski jednostki trafiają każdego wroga na drodze. Tylko dla ataku z pociskiem. */
  z.strictObject({ type: z.literal('pierce') }),
]);

export const unitSchema = z.strictObject({
  id,
  kind: z.enum(['melee', 'ranged']),
  maxHp: z.number().int().positive(),
  attack: z.number().int().nonnegative(),
  /** Jednostki świata na sekundę. */
  moveSpeed: z.number().positive(),
  /** Ataki na sekundę. */
  attackSpeed: z.number().positive(),
  /** Jednostki świata. */
  range: z.number().positive(),
  /** Jednostki świata. */
  knockback: z.number().nonnegative(),
  attackType: id,
  traits: z.array(traitSchema).default([]),
});

export const attackTypesSchema = z.array(attackTypeSchema);
export const unitsSchema = z.array(unitSchema);

export type RawArena = z.infer<typeof arenaSchema>;
export type RawAttackType = z.infer<typeof attackTypeSchema>;
export type RawTrait = z.infer<typeof traitSchema>;
export type RawUnit = z.infer<typeof unitSchema>;
