// Kończyny postaci na szkielecie humanoid. Stawy leżą tam, gdzie u ludzi (kolano 11 jednostek
// pod biodrem, ziemia ok. 14,5 pod kolanem, łokieć 10 pod barkiem, dłoń 9 pod łokciem),
// a o charakterze postaci decyduje materiał kończyny (ciało, kora, pnącze, blacha, szmata),
// jej grubość i to, czym się kończy.
import { intersect, union } from '../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from './kit.ts';

export type Foot = 'paw' | 'hoof' | 'talon';
export type Hand = 'paw' | 'hoof' | 'wing';

// ---------------------------------------------------------------------------------------------
// Ciało: bestie i strażnicy. Żylaste, zwężające się kończyny z kępkami sierści od tyłu.
// ---------------------------------------------------------------------------------------------

/** Udo: zwęża się od biodra do kolana. `girth` 1 to zwykła postać, więcej to masywna. */
export function fleshThigh(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-9, -8, 9, 17, 11);
  c.form(
    union(
      c.horn(0, 0, 0, 10.5, 4.3 * girth, 2.9 * girth),
      c.horn(-3 * girth, 1.5, -6 * girth, 4.5, 1.7, 0.2),
      c.horn(-2.6 * girth, 6, -5 * girth, 9.5, 1.4, 0.2),
    ),
    p,
  );
  return c.finish();
}

/**
 * Goleń ze stopą. Kolano stoi ok. 15 jednostek nad ziemią (biodro 25, staw uda 1 wyżej, udo 11),
 * a przy lekko ugiętych nogach z klipu idle stopa sięga ziemi przy y ok. 14,5.
 */
export function fleshShin(p: Palette, foot: Foot, girth = 1): PartCanvas {
  const c = partCanvas(-8, -5, 12, 17, 12);
  const leg = c.horn(0, 0, 0, 10.5, 2.9 * girth, 2 * girth);
  if (foot === 'paw') {
    c.form(
      union(leg, c.oval(2.4, 12, 4.8, 2.5), c.horn(-2 * girth, 3, -4.6 * girth, 6, 1.3, 0.2)),
      p,
    );
    for (const x of [3.2, 5.2, 7]) c.ink(c.horn(x, 12.6, x + 1.9, 14.3, 1, 0.2), BONE, p.dark);
  } else if (foot === 'hoof') {
    c.form(leg, p);
    c.form(
      c.poly([
        [-2.6 * girth, 10.2],
        [3 * girth, 10.2],
        [4.6 * girth, 14.5],
        [-3.2 * girth, 14.5],
      ]),
      { main: p.dark, shade: p.dark, dark: p.dark, light: p.shade },
      { rag: RAG_HARD, shadow: 0, rim: 0.5 },
    );
  } else {
    // Ptasia noga: cienki, łuskowaty skok i trzy palce ze szponami.
    const scaly = { main: p.accent, shade: p.shade, dark: p.dark, light: p.light };
    c.form(c.horn(0, 0, 0.4, 11.8, 1.7, 1.2), scaly, { rag: RAG_HARD });
    for (const [x, y] of [
      [7, 13.8],
      [5.4, 11.8],
      [-3.8, 13.8],
    ] as const) {
      c.form(c.horn(0.4, 12.2, x, y, 1.2, 0.45), scaly, { rag: RAG_HARD, shadow: 0 });
      c.ink(c.horn(x, y, x + (x > 0 ? 1.8 : -1.6), y + 0.9, 0.7, 0.15), BONE_SHADE, p.dark);
    }
  }
  return c.finish();
}

/** Ramię: od barku do łokcia. */
export function fleshUpper(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-7, -6, 7, 15, 13);
  c.form(
    union(
      c.horn(0, 0, 0, 9.6, 3.3 * girth, 2.5 * girth),
      c.horn(-2.2 * girth, 2, -4.6 * girth, 5, 1.4, 0.2),
    ),
    p,
  );
  return c.finish();
}

/** Przedramię z dłonią; broń (pazury) doczepia się w punkcie (0, 9). */
export function fleshFore(p: Palette, hand: Hand, girth = 1): PartCanvas {
  const c = partCanvas(-8, -5, 8, 21, 14);
  if (hand === 'wing') {
    // Złożone skrzydło: wystrzępione lotki opadające od łokcia, jedna złamana.
    c.form(
      union(
        c.horn(0, 0, -3.6, 15.5, 2.8, 0.5),
        c.horn(0, 0, -0.2, 18, 2.8, 0.5),
        c.horn(0, 0, 3, 12, 2.8, 0.9),
        c.horn(0, 0, 4.6, 8.5, 2.2, 0.4),
      ),
      p,
    );
    c.fill(c.line(-0.2, 3, -0.2, 15, 0.3), p.dark, 0.6);
    c.fill(c.line(-0.6, 3, -3, 13, 0.3), p.dark, 0.6);
    return c.finish();
  }
  const arm = c.horn(0, 0, 0, 8.4, 2.8 * girth, 2.2 * girth);
  if (hand === 'hoof') {
    c.form(arm, p);
    c.form(
      c.box(0, 9.8, 3 * girth, 2, 0.9),
      { main: p.dark, shade: p.dark, dark: p.dark, light: p.shade },
      { rag: RAG_HARD, shadow: 0, rim: 0.5 },
    );
  } else {
    c.form(
      union(arm, c.dot(0, 9.2, 3 * girth), c.horn(-2 * girth, 2, -4.2 * girth, 5.5, 1.2, 0.2)),
      p,
    );
  }
  return c.finish();
}

/**
 * Pazury w dłoni: wachlarz ostrzy biegnących w dół od pivota, tak jak klinga miecza, więc
 * klipy cięcia machają nimi bez zmian. `length` to długość środkowego pazura, `spread`
 * rozwarcie wachlarza, a `blade` grubość ostrza u nasady.
 */
export function claws(p: Palette, length: number, spread = 1, blade = 1.25): PartCanvas {
  const c = partCanvas(
    -Math.ceil(4 + 2.6 * spread),
    -4,
    Math.ceil(4 + 3.4 * spread),
    Math.ceil(length) + 3,
    15,
  );
  c.form(c.dot(0, 0, 2.3), p, { shadow: 0.6 });
  const blades = [
    [-1.6, -2.6 * spread, 0.82],
    [0, 0.4 * spread, 1],
    [1.6, 3.4 * spread, 0.86],
  ] as const;
  for (const [x, lean, part] of blades) {
    const tipY = length * part;
    // Lekko zakrzywione ostrze: nasada przy dłoni, czubek odchylony do przodu.
    const shape = c.arc([x, 0.5], [x - lean * 0.35, tipY * 0.62], [x + lean, tipY], blade, 0.2);
    c.ink(shape, BONE, p.dark);
    // Brudna nasada pazura.
    c.fill(intersect(shape, c.dot(x, 0.5, blade * 2.4)), BONE_SHADE, 0.8);
  }
  return c.finish(0.6);
}
