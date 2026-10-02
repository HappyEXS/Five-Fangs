// Schemat rigu wycinankowego z klipami animacji (ADR 0004). Dane są czytelne dla człowieka:
// kąty w stopniach, czas klipu jako ułamek 0..1. Do tablic typowanych kompiluje je renderer.
import { z } from 'zod';

const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'id: litery, cyfry i podkreślenia');

/** Punkt w jednostkach rigu. */
const point = z.tuple([z.number(), z.number()]);

/** Klatka kluczowa kanału: [czas 0..1, wartość]. */
const key = z.tuple([z.number().min(0).max(1), z.number()]);

export const clipSchema = z.strictObject({
  /** Klip zapętlony (idle, chód) albo jednorazowy (atak). */
  loop: z.boolean(),
  /** Znaczniki zdarzeń jako ułamek klipu; `hit` musi równać się `hitFraction` typu ataku. */
  markers: z.record(id, z.number().min(0).max(1)).default({}),
  /**
   * Klatki kluczowe per kanał. Kanałem jest kość (kąt w stopniach, dodatni zgodnie z ruchem
   * wskazówek zegara) albo `bob` / `dx`: przesunięcie korzenia w pionie i poziomie.
   */
  channels: z.record(id, z.array(key).min(1)),
});

export const rigSchema = z.strictObject({
  id,
  /** Wysokość bioder (korzenia) nad ziemią w jednostkach rigu. */
  hipHeight: z.number().positive(),
  /** Jednostki logiczne sceny na jednostkę rigu dla postaci o skali 1. */
  scale: z.number().positive(),
  /** Dystans w jednostkach rigu, po którym klip chodu wykonuje pełny cykl. */
  strideLength: z.number().positive(),
  /** Kości w kolejności obliczeń: rodzic zawsze przed dzieckiem. */
  bones: z
    .array(
      z.strictObject({
        id,
        /** Id kości nadrzędnej albo "root". */
        parent: id,
        /** Punkt zaczepienia względem pivota rodzica, w jednostkach rigu. */
        at: z.tuple([z.number(), z.number()]),
        /** Nazwa części w skórce: sprite `<skórka>/<sprite>` w atlasie. */
        sprite: id,
        /** Kończyna po dalszej stronie postaci: rysowana w wariancie przyciemnionym. */
        back: z.boolean().default(false),
      }),
    )
    .min(1),
  /** Kolejność rysowania: każda kość dokładnie raz. */
  drawOrder: z.array(id),
  /** Postawy: kąty kości (w stopniach) dla kanałów, których klip nie animuje. */
  stances: z.record(id, z.record(id, z.number())),
  /**
   * Cięciwy: linia rysowana wektorowo między dwoma punktami kości (końce łuku), w podanej
   * fazie klipu naciągana do punktu innej kości (dłoń). Klucz to postawa, w której występuje.
   */
  strings: z
    .record(
      id,
      z.strictObject({
        /** Kość, na której leżą końce cięciwy, i ich położenie względem jej pivota. */
        bone: id,
        ends: z.tuple([point, point]),
        pull: z.strictObject({
          /** Kość i punkt, do którego cięciwa jest naciągana. */
          bone: id,
          at: point,
          /** Klip i przedział jego fazy, w którym cięciwa jest naciągnięta. */
          clip: id,
          from: z.number().min(0).max(1),
          to: z.number().min(0).max(1),
        }),
      }),
    )
    .default({}),
  clips: z.record(id, clipSchema),
});

export type RawClip = z.infer<typeof clipSchema>;
export type RawRig = z.infer<typeof rigSchema>;

/** Kanały korzenia, które nie są kośćmi. */
export const ROOT_CHANNELS = ['bob', 'dx'] as const;
