// Kończyny szczepu Beasts na szkielecie humanoid: ciężkie, żylaste łapy w skołtunionej sierści,
// z kosmykami zwisającymi od tyłu, kościanym kolcem na łokciu i pazurami jak haki. Rozmieszczenie
// stawów opisuje limbs.ts; tu zmienia się masa i to, czym kończyna się kończy.
import { intersect, union } from '../raster.ts';
import { grime, INK, strands } from './beasts/palette.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from './kit.ts';

export type BeastFoot = 'paw' | 'hoof' | 'talon';
export type BeastHand = 'paw' | 'hoof' | 'wing';

/** Udo: ciężkie u biodra, z kosmykami opadającymi za kolano. */
export function beastThigh(p: Palette, girth = 1): PartCanvas {
  const c = partCanvas(-13, -9, 11, 19, 71);
  c.form(
    union(
      c.horn(-0.6 * girth, 0.4, 0, 10.6, 5 * girth, 3 * girth),
      strands(c, [
        [-3.4 * girth, 1.5, -3.6, 6.5, 1.7],
        [-2.8 * girth, 5.5, -2.8, 7, 1.4],
        [-1.4 * girth, 8.5, -1.6, 6.5, 1.2],
      ]),
    ),
    p,
  );
  return c.finish();
}

/** Goleń ze stopą; ziemia leży ok. 14,5 jednostki pod kolanem. */
export function beastShin(p: Palette, foot: BeastFoot, girth = 1): PartCanvas {
  const c = partCanvas(-10, -6, 14, 18, 72);
  if (foot === 'paw') {
    // Żylasta goleń, szeroka łapa i trzy pazury zagięte ku ziemi; z pięty sterczy ostroga.
    c.ink(c.horn(-1.4 * girth, 9.4, -5.2 * girth, 7.4, 1.1, 0.2), BONE_SHADE, INK);
    c.form(
      union(
        c.horn(0, 0, 0, 10.6, 3.1 * girth, 2.1 * girth),
        c.oval(2.6, 12.1, 5.2 * girth, 2.5),
        strands(c, [[-2 * girth, 2.5, -2.6, 5, 1.3]]),
      ),
      p,
    );
    for (const x of [2.6, 5, 7.2]) {
      c.ink(c.arc([x, 11.4], [x + 2.8, 11.6], [x + 2.6, 14.6], 1.15, 0.2), BONE, INK);
    }
  } else if (foot === 'hoof') {
    // Pęcina w sierści i rozszczepione, spękane kopyto.
    c.form(
      union(
        c.horn(0, 0, 0, 10.4, 3.1 * girth, 2.4 * girth),
        strands(c, [
          [-2.2 * girth, 6.5, -2.6, 5.5, 1.4],
          [1.6 * girth, 7.5, 2.4, 4.2, 1.2],
        ]),
      ),
      p,
    );
    const hoof = c.poly([
      [-2.8 * girth, 10.4],
      [3.2 * girth, 10.4],
      [5.2 * girth, 14.6],
      [-3.6 * girth, 14.6],
    ]);
    const inside = c.form(
      hoof,
      { main: '#241a13', shade: INK, dark: INK, light: '#4a3829' },
      { rag: RAG_HARD, shadow: 0.5, rim: 0.5 },
    );
    c.fill(intersect(inside, c.line(1 * girth, 10.6, 1.6 * girth, 14.6, 0.3)), INK);
  } else {
    // Ptasi skok: gruba, łuskowata noga i trzy palce z hakami szponów, czwarty z tyłu.
    const scaly = { main: p.accent, shade: p.shade, dark: p.dark, light: p.light };
    const leg = c.form(c.horn(0, 0, 0.4, 11.6, 2.3, 1.6), scaly, { rag: RAG_HARD });
    for (const y of [3, 5.6, 8.2]) {
      c.fill(intersect(leg, c.line(-3, y, 3, y - 0.6, 0.26)), p.dark, 0.8);
    }
    for (const [x, y] of [
      [7.4, 13.4],
      [5.6, 11.2],
      [-4.2, 13.4],
    ] as const) {
      c.form(c.horn(0.4, 12, x, y, 1.5, 0.7), scaly, { rag: RAG_HARD, shadow: 0 });
      const out = x > 0 ? 1 : -1;
      c.ink(c.arc([x, y], [x + out * 2.6, y - 0.2], [x + out * 2.4, y + 2], 0.9, 0.15), BONE, INK);
    }
  }
  return c.finish();
}

/** Ramię: gruby bark, a na łokciu kościany kolec. */
export function beastUpper(p: Palette, girth = 1, spur = true): PartCanvas {
  const c = partCanvas(-10, -7, 8, 17, 73);
  if (spur) c.ink(c.horn(-1.2 * girth, 8.6, -6 * girth, 11.6, 1.3, 0.2), BONE_SHADE, INK);
  c.form(
    union(
      c.horn(-0.3 * girth, 0, 0, 9.7, 3.8 * girth, 2.6 * girth),
      strands(c, [
        [-2.6 * girth, 1.5, -3, 5.5, 1.5],
        [-2 * girth, 5, -2.4, 5.5, 1.2],
      ]),
    ),
    p,
  );
  return c.finish();
}

/** Przedramię z dłonią; broń (pazury) doczepia się w punkcie (0, 9). */
export function beastFore(p: Palette, hand: BeastHand, girth = 1): PartCanvas {
  const c = partCanvas(-10, -6, 9, 25, 74);
  if (hand === 'wing') {
    // Złożone skrzydło: długie, wystrzępione lotki opadające od łokcia, jedna złamana w połowie.
    const feathers = [
      [-5.2, 19.5, 0.4],
      [-1.4, 22, 0.4],
      [2.2, 17.5, 0.5],
      [4.6, 9.5, 1.3],
      [5.6, 6, 0.4],
    ] as const;
    c.form(union(...feathers.map(([x, y, tip]) => c.horn(0, 0, x, y, 3, tip))), p);
    for (const [x, y] of feathers) c.fill(c.line(x * 0.12, 2.5, x * 0.9, y * 0.9, 0.28), INK, 0.6);
    c.ink(c.arc([0.5, -0.5], [4.2, -2.6], [4.6, 0.6], 1, 0.2), BONE_SHADE, INK);
    return c.finish();
  }
  const arm = c.horn(0, 0, 0, 8.4, 3 * girth, 2.3 * girth);
  if (hand === 'hoof') {
    c.form(union(arm, strands(c, [[-2 * girth, 4.5, -2.4, 5, 1.3]])), p);
    const hoof = c.form(
      c.box(0, 9.9, 3.1 * girth, 2.1, 0.7),
      { main: '#241a13', shade: INK, dark: INK, light: '#4a3829' },
      { rag: RAG_HARD, shadow: 0.5, rim: 0.5 },
    );
    c.fill(intersect(hoof, c.line(0.6, 8, 0.9, 12, 0.3)), INK);
  } else {
    c.form(union(arm, c.dot(0, 9.2, 3.1 * girth), strands(c, [[-2 * girth, 2, -2.6, 5, 1.3]])), p);
    // Kłykcie.
    for (const x of [-1.5, 0.4, 2.2]) c.fill(c.dot(x * girth, 10.6, 0.5), p.dark, 0.8);
  }
  return c.finish();
}

/**
 * Pazury jak haki: wachlarz zakrzywionych ostrzy biegnących w dół od pivota (kierunek klingi
 * miecza), z czubkami zagiętymi do przodu. `length` to długość środkowego haka.
 */
export function hooks(p: Palette, length: number, blade = 1.3): PartCanvas {
  const reach = Math.ceil(length);
  const c = partCanvas(-8, -4, 11, reach + 4, 75);
  c.form(c.dot(0, 0, 2.4), p, { shadow: 0.6 });
  for (const [x, lean, part, far] of [
    [-1.7, -2.6, 0.8, true],
    [0, 0.6, 1, false],
    [1.7, 3.6, 0.84, false],
  ] as const) {
    const tipY = length * part;
    const shape = c.arc([x, 0.5], [x - 2.2 - lean * 0.2, tipY * 0.7], [x + lean, tipY], blade, 0.2);
    c.ink(shape, far ? BONE_SHADE : BONE, INK);
    grime(c, shape, [x, 0.5], blade * 2.6, far ? '#4f4733' : BONE_SHADE);
  }
  return c.finish(0.6);
}
