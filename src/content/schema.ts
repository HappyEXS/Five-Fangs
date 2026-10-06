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
  /** Klip animacji ataku w rigu jednostki; jego znacznik `hit` musi równać się `hitFraction`. */
  clip: z.string().min(1),
  /** Postawa w rigu: kąty kości, których klipy idle i chodu nie animują (np. chwyt broni). */
  stance: z.string().min(1),
  projectile: z
    .strictObject({
      /** Prędkość pocisku w jednostkach świata na sekundę. */
      speed: z.number().positive(),
      /** Sprite pocisku w atlasie: `fx/<sprite>`. */
      sprite: z.string().min(1),
      /**
       * Wysokość lotu nad stopami strzelca w jednostkach rigu: skąd pocisk wychodzi (łuk, paszcza,
       * grzbiet). Tylko wygląd; symulacja liczy pociski na osi X.
       */
      height: z.number().positive().default(43),
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
  /** Szał: poniżej `hpBelow` procent życia ataki zadają o `attackBonus` procent więcej. */
  z.strictObject({
    type: z.literal('enrage'),
    hpBelow: z.number().int().min(1).max(99),
    attackBonus: z.number().int().positive(),
  }),
  /** Kradzież życia: po każdym trafieniu jednostka leczy się o `percent` procent zadanych obrażeń. */
  z.strictObject({
    type: z.literal('lifesteal'),
    percent: z.number().int().min(1).max(100),
  }),
  /**
   * Cios obszarowy: cios wręcz zadaje pełne obrażenia także wrogom w promieniu `radius`
   * (jednostki świata) od celu. Odrzut dostaje tylko cel. Tylko dla ataku wręcz.
   */
  z.strictObject({ type: z.literal('splash'), radius: z.number().positive() }),
  /**
   * Celuje w wroga stojącego na końcu szyku przeciwnika; pocisk mija pozostałych i trafia tylko
   * ten cel. Tylko dla ataku z pociskiem, bez `pierce`; `range` jednostki musi obejmować całe
   * pole, żeby strzelała z miejsca.
   */
  z.strictObject({ type: z.literal('targetLast') }),
  /**
   * Podwójne obrażenia w stałym rytmie: `percent` na każde 100 ataków jest podwójnych, równo
   * rozłożonych (50 to co drugi atak). Walka nie ma losowości, więc „szansa” ze szkicu postaci
   * staje się rytmem (decyzja autora gry z 2026-10-05).
   */
  z.strictObject({ type: z.literal('doubleDamage'), percent: z.number().int().min(1).max(100) }),
  /** Unik w stałym rytmie: `percent` na każde 100 trafień jednostka unika w całości. */
  z.strictObject({ type: z.literal('dodge'), percent: z.number().int().min(1).max(99) }),
  /** Tarcza: otrzymywane obrażenia są mniejsze o `percent` procent. */
  z.strictObject({ type: z.literal('shield'), percent: z.number().int().min(1).max(99) }),
]);

export const unitSchema = z.strictObject({
  id,
  kind: z.enum(['melee', 'ranged']),
  maxHp: z.number().int().positive(),
  attack: z.number().int().nonnegative(),
  /** Jednostki świata na sekundę. */
  moveSpeed: z.number().nonnegative(),
  /** Ataki na sekundę. */
  attackSpeed: z.number().positive(),
  /** Jednostki świata. */
  range: z.number().positive(),
  /** Jednostki świata. */
  knockback: z.number().nonnegative(),
  attackType: id,
  traits: z.array(traitSchema).default([]),
  /** Rig, na którym animowana jest jednostka. */
  rig: z.string().min(1).default('humanoid'),
  /** Skórka: zestaw części w atlasie, `<skin>/<część>`. */
  skin: id,
  /** Mnożnik wielkości postaci względem skali rigu. Tylko wygląd; nie wpływa na walkę. */
  scale: z.number().positive().default(1),
  /**
   * Własny kadr miniaturki, gdy twarz postaci nie leży tam, gdzie zakłada rig (długa szyja,
   * wielki łeb): środek względem kości miniaturki rigu i bok kwadratu, w jednostkach rigu.
   */
  portrait: z
    .strictObject({
      center: z.tuple([z.number(), z.number()]),
      size: z.number().positive(),
    })
    .optional(),
});

export const attackTypesSchema = z.array(attackTypeSchema);
export const unitsSchema = z.array(unitSchema);

export type RawArena = z.infer<typeof arenaSchema>;
export type RawAttackType = z.infer<typeof attackTypeSchema>;
export type RawTrait = z.infer<typeof traitSchema>;
export type RawUnit = z.infer<typeof unitSchema>;
