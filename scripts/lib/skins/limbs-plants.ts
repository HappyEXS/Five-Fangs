// Kończyny roślin na szkielecie humanoid: sękate konary chodzących drzew oraz cierniste
// łodygi roślin, które stoją w miejscu. Rozmieszczenie stawów opisuje limbs.ts.
import { intersect, union } from '../raster.ts';
import { type Palette, type PartCanvas, partCanvas } from './kit.ts';

// Kora: pęknięcia i płaty mchu w kolorze `accent`, stopy z korzeni.

export function barkThigh(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-9, -8, 9, 17, 21);
  const inside = c.form(
    union(
      c.horn(0, 0, 0, 10.5, 3.9 * girth, 3.1 * girth),
      c.dot(-2.8 * girth, 5, 2 * girth),
      c.horn(2 * girth, 3.4, 5.8 * girth, 0.6, 1.2, 0.5),
    ),
    p,
    { rag: 0.5 },
  );
  c.fill(
    intersect(
      inside,
      c.path(
        [
          [-0.4, 1],
          [0.7, 4],
          [-0.3, 7],
          [0.9, 10],
        ],
        0.3,
      ),
    ),
    p.dark,
    0.85,
  );
  c.patches(inside, p.accent, 0.2, 2.4, 0.85);
  return c.finish();
}

/** Goleń z korzeniami zamiast stopy. */
export function barkShin(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-9, -5, 13, 17, 22);
  const inside = c.form(
    union(
      c.horn(0, 0, 0, 10.8, 3 * girth, 2.4 * girth),
      c.horn(0, 10.6, 8.5, 14.4, 2 * girth, 0.5),
      c.horn(0, 10.6, 3.6, 14.7, 1.8 * girth, 0.5),
      c.horn(0, 10.6, -5.4, 14.4, 1.8 * girth, 0.5),
    ),
    p,
    { rag: 0.5 },
  );
  c.fill(
    intersect(
      inside,
      c.path(
        [
          [0.5, 1.5],
          [-0.5, 5],
          [0.6, 8.5],
        ],
        0.3,
      ),
    ),
    p.dark,
    0.85,
  );
  c.patches(inside, p.accent, 0.18, 2.4, 0.85);
  return c.finish();
}

export function barkUpper(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-7, -6, 7, 15, 23);
  const inside = c.form(
    union(c.horn(0, 0, 0, 9.6, 3 * girth, 2.4 * girth), c.dot(-2.2 * girth, 4.5, 1.7 * girth)),
    p,
    { rag: 0.5 },
  );
  c.fill(
    intersect(
      inside,
      c.path(
        [
          [0.4, 1],
          [-0.4, 4.5],
          [0.6, 8],
        ],
        0.28,
      ),
    ),
    p.dark,
    0.85,
  );
  c.patches(inside, p.accent, 0.2, 2.2, 0.85);
  return c.finish();
}

/** Przedramię: `twigs` kończy się palcami z gałązek, `fist` sękatą pięścią. */
export function barkFore(p: Palette, hand: 'twigs' | 'fist', girth = 1): PartCanvas {
  const c = partCanvas(-8, -5, 9, 21, 24);
  const arm = c.horn(0, 0, 0, 8.4, 2.5 * girth, 2 * girth);
  const fingers =
    hand === 'twigs'
      ? union(
          c.horn(0, 8.2, -3.4, 14.5, 1.1, 0.2),
          c.horn(0, 8.2, 0.6, 16, 1.1, 0.2),
          c.horn(0, 8.2, 3.8, 13.8, 1.1, 0.2),
          c.horn(1.9, 11, 4.6, 10.2, 0.6, 0.15),
        )
      : union(
          c.dot(0, 9.6, 3.5 * girth),
          c.dot(2.4 * girth, 11, 1.6 * girth),
          c.dot(-2.2 * girth, 11.4, 1.5 * girth),
        );
  const inside = c.form(union(arm, fingers), p, { rag: 0.45 });
  c.patches(inside, p.accent, 0.16, 2.2, 0.85);
  return c.finish();
}

// Pnącza: cienkie, cierniste łodygi roślin, które nie chodzą.

/**
 * Pnącza stoją w miejscu i korzenie mają narysowane w tułowiu, więc zamiast nóg dostają to, co
 * i tak rośnie na łodydze: ciernie. Noga rysowana przed tułowiem wyglądałaby jak drugi, sztywny
 * pień, a jej stopa odrywałaby się od ziemi przy każdym strzale.
 */
export function thornThigh(p: Palette): PartCanvas {
  const c = partCanvas(-3, -4, 6, 3, 35);
  c.form(c.horn(0, 0, 4.2, -1.8, 1.2, 0.1), p, { rag: 0.2, shadow: 0.5 });
  return c.finish(0.5);
}

export function thornShin(p: Palette): PartCanvas {
  const c = partCanvas(-6, -3, 3, 4, 36);
  c.form(c.horn(0, 0, -4.2, 1.8, 1.2, 0.1), p, { rag: 0.2, shadow: 0.5 });
  return c.finish(0.5);
}

/** Łodyga z cierniami w miejscu ramienia. */
export function vineUpper(p: Palette): PartCanvas {
  const c = partCanvas(-7, -5, 7, 14, 33);
  c.form(
    union(
      c.arc([0, 0], [2.4, 5], [0, 9.8], 1.7, 1.5),
      c.horn(1.2, 2.8, 4.6, 1.8, 0.9, 0.1),
      c.horn(-0.4, 6.4, -4.2, 7.6, 0.9, 0.1),
    ),
    p,
    { rag: 0.3 },
  );
  return c.finish();
}

/**
 * Łodyga w miejscu przedramienia, zakończona tym, co narysuje `bloom`: kwiatem, kryształem
 * albo strąkiem. Łodyga kończy się w punkcie (2, 10).
 */
export function vineFore(p: Palette, bloom: (c: PartCanvas) => void): PartCanvas {
  const c = partCanvas(-10, -5, 13, 23, 34);
  c.form(
    union(
      c.arc([0, 0], [-1.8, 5], [2, 10], 1.5, 1.2),
      c.horn(-0.8, 3.2, -4.2, 2.6, 0.9, 0.1),
      c.horn(0.6, 7, 3.8, 6, 0.8, 0.1),
    ),
    p,
    { rag: 0.3 },
  );
  bloom(c);
  return c.finish();
}
