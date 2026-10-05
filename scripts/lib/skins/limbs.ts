// Kończyny bestii na szkielecie humanoid. Stawy leżą tam, gdzie u ludzi (kolano 11 jednostek
// pod biodrem, ziemia 13 pod kolanem, łokieć 10 pod barkiem, dłoń 9 pod łokciem), a o charakterze
// postaci decyduje grubość kończyny i to, czym się kończy: łapa, kopyto, szpon albo pióra.
import { union } from '../raster.ts';
import { type BeastPalette, BONE, type PartCanvas, partCanvas } from './kit.ts';

const SHEEN = '#ffffff';

export type Foot = 'paw' | 'hoof' | 'talon';
export type Hand = 'paw' | 'hoof' | 'wing';

/** Udo: zwęża się od biodra do kolana. `girth` 1 to zwykła bestia, więcej to masywna. */
export function thigh(p: BeastPalette, girth = 1): PartCanvas {
  const c = partCanvas(-8, -8, 8, 16);
  c.ink(c.horn(0, 0, 0, 10.5, 4.4 * girth, 3.1 * girth), p.main, p.dark);
  c.fill(c.line(-1.4 * girth, 0, -1.1 * girth, 7.5, 0.9), SHEEN, 0.14);
  return c;
}

/**
 * Goleń ze stopą. Kolano stoi ok. 15 jednostek nad ziemią (biodro 25, staw uda 1 wyżej, udo 11),
 * a przy lekko ugiętych nogach z klipu idle stopa sięga ziemi przy y ok. 14,5.
 */
export function shin(p: BeastPalette, foot: Foot, girth = 1): PartCanvas {
  const c = partCanvas(-7, -5, 11, 16);
  const leg = c.horn(0, 0, 0, 10.5, 3 * girth, 2.2 * girth);
  if (foot === 'paw') {
    c.ink(union(leg, c.oval(2.2, 12, 4.6, 2.5)), p.main, p.dark);
    for (const x of [3.4, 5.2, 6.8]) c.ink(c.horn(x, 12.8, x + 1.5, 14.1, 0.9, 0.25), BONE, p.dark);
  } else if (foot === 'hoof') {
    c.ink(leg, p.main, p.dark);
    c.ink(
      c.poly([
        [-2.6 * girth, 10.4],
        [3 * girth, 10.4],
        [4.4 * girth, 14.5],
        [-3 * girth, 14.5],
      ]),
      p.dark,
      p.dark,
    );
    c.fill(c.line(-1.4 * girth, 11.6, 2.4 * girth, 11.6, 0.45), SHEEN, 0.18);
  } else {
    // Ptasia noga: cienki skok i trzy palce ze szponami.
    c.ink(c.horn(0, 0, 0.4, 11.8, 1.5, 1.1), p.accent, p.dark);
    for (const [x, y] of [
      [6.5, 13.8],
      [5.2, 12],
      [-3.4, 13.8],
    ] as const) {
      c.ink(c.horn(0.4, 12.4, x, y, 1.1, 0.35), p.accent, p.dark);
    }
  }
  c.fill(c.line(-0.9 * girth, 0, -0.7 * girth, 6.5, 0.6), SHEEN, 0.14);
  return c;
}

/** Ramię: od barku do łokcia. */
export function upper(p: BeastPalette, girth = 1): PartCanvas {
  const c = partCanvas(-6, -6, 6, 15);
  c.ink(c.horn(0, 0, 0, 9.6, 3.4 * girth, 2.7 * girth), p.main, p.dark);
  c.fill(c.line(-1 * girth, 0, -0.9 * girth, 7, 0.7), SHEEN, 0.14);
  return c;
}

/** Przedramię z dłonią; broń (pazury) doczepia się w punkcie (0, 9). */
export function fore(p: BeastPalette, hand: Hand, girth = 1): PartCanvas {
  const c = partCanvas(-7, -5, 7, 20);
  if (hand === 'wing') {
    // Złożone skrzydło: trzy lotki opadające od łokcia.
    c.ink(
      union(
        c.horn(0, 0, -3.2, 15.5, 2.8, 0.7),
        c.horn(0, 0, -0.2, 17.5, 2.8, 0.7),
        c.horn(0, 0, 2.8, 15, 2.8, 0.7),
      ),
      p.main,
      p.dark,
    );
    c.fill(c.line(-0.2, 3, -0.2, 14.5, 0.35), p.dark, 0.55);
    return c;
  }
  const arm = c.horn(0, 0, 0, 8.4, 2.9 * girth, 2.4 * girth);
  if (hand === 'hoof') {
    c.ink(arm, p.main, p.dark);
    c.ink(c.box(0, 9.6, 2.9 * girth, 1.9, 0.9), p.dark, p.dark);
  } else {
    c.ink(union(arm, c.dot(0, 9.2, 3 * girth)), p.main, p.dark);
  }
  c.fill(c.line(-0.9 * girth, 0, -0.8 * girth, 6, 0.6), SHEEN, 0.14);
  return c;
}

/**
 * Pazury w dłoni: wachlarz ostrzy biegnących w dół od pivota, tak jak klinga miecza, więc
 * klipy cięcia machają nimi bez zmian. `length` to długość środkowego pazura, `spread`
 * rozwarcie wachlarza, a `blade` grubość ostrza u nasady.
 */
export function claws(p: BeastPalette, length: number, spread = 1, blade = 1.25): PartCanvas {
  const c = partCanvas(
    -Math.ceil(3.6 + 2.6 * spread),
    -3,
    Math.ceil(3.6 + 3.4 * spread),
    Math.ceil(length) + 2,
  );
  c.ink(c.dot(0, 0, 2.2), p.main, p.dark);
  const blades = [
    [-1.6, -2.6 * spread, 0.82],
    [0, 0.4 * spread, 1],
    [1.6, 3.4 * spread, 0.86],
  ] as const;
  for (const [x, lean, part] of blades) {
    const tipY = length * part;
    // Lekko zakrzywione ostrze: nasada przy dłoni, czubek odchylony do przodu.
    c.ink(
      c.arc([x, 0.5], [x - lean * 0.35, tipY * 0.62], [x + lean, tipY], blade, 0.2),
      BONE,
      p.dark,
    );
  }
  return c;
}
