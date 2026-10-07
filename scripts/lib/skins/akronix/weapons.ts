// Bronie Akronixów. Układ jak u miecza ludzi: pivot w dłoni, broń biegnie w dół (dodatnie Y),
// a postawa rigu obraca ją do przodu. Tarcza i druga broń Axinów to część „offhand”: wiszą
// w drugiej ręce i są rysowane przed tułowiem.
import { intersect, union } from '../../raster.ts';
import { BONE, type PartCanvas, partCanvas, RAG_HARD, RUST, STEEL } from '../kit.ts';
import { emblem } from './body.ts';
import { BAND, LEATHER, VENOM, WOOD } from './palette.ts';

/** Sczerniała stal sierpa Axina 3. */
const BLACK_STEEL = { main: '#2b2a30', shade: '#15141a', light: '#55535f', dark: '#050406' };

/** Okutą część (ostrze, głownię) pokrywa rdza i brud. */
function steel(c: PartCanvas, shape: ReturnType<PartCanvas['dot']>, tone = STEEL): void {
  const inside = c.form(shape, tone, { rag: RAG_HARD, rim: 0.7 });
  c.patches(inside, RUST, 0.2, 1.8, 0.85);
}

/** Owijka rękojeści w kolorze szczepu. */
function grip(c: PartCanvas, from: number, to: number, r = 0.9): void {
  c.form(c.line(0, from, 0, to, r), BAND, { rag: RAG_HARD, shadow: 0.5 });
}

/**
 * Łuk Bowixa: łęczysko zakończone kościanymi półksiężycami, jak na szkicu. Końce leżą tam, gdzie
 * rig zaczepia cięciwę postawy `bow`: (-16,5; -7,5) i (16,5; -7,5), a majdan w pivocie.
 */
export function crescentBow(): PartCanvas {
  const c = partCanvas(-23, -14, 23, 12, 81);
  c.form(c.arc([-16.5, -7.5], [0, 9.5], [16.5, -7.5], 1.1, 1.1), WOOD, { rag: RAG_HARD });
  for (const side of [-1, 1]) {
    const tip = c.arc([side * 15.4, -11.4], [side * 20.6, -8.4], [side * 17.6, -3], 0.5, 1.5);
    c.ink(tip, BONE, WOOD.dark);
  }
  c.form(c.line(-2.2, 0.8, 2.2, 0.8, 1.2), BAND, { rag: RAG_HARD, shadow: 0.5 });
  return c.finish(0.6);
}

/** Rękawica Assasinixa: karwasz z wyrzutnią i trzema ostrzami wysuniętymi przed dłoń. */
export function dartGauntlet(): PartCanvas {
  const c = partCanvas(-6, -6, 6, 13, 82);
  for (const [x, tip] of [
    [-2, 8.4],
    [0, 10.4],
    [2, 8.8],
  ] as const) {
    c.ink(c.horn(x, 1.5, x * 1.3, tip, 0.9, 0.15), STEEL.light, STEEL.dark);
  }
  const block = c.form(c.box(0, -0.6, 3.3, 2.7, 0.8), LEATHER, { rag: RAG_HARD });
  c.fill(intersect(block, c.line(-3.4, -1.8, 3.4, -1.8, 0.3)), LEATHER.dark);
  c.ink(c.box(0, 1.2, 2.5, 0.8, 0.3), STEEL.main, STEEL.dark);
  return c.finish(0.6);
}

/** Katana: długa, wąska, lekko wygięta klinga, mała okrągła tsuba, czerwona owijka. */
export function katana(): PartCanvas {
  const c = partCanvas(-5, -10, 8, 35, 83);
  steel(c, c.arc([0, 1], [-0.6, 17], [3.4, 31.4], 1.7, 0.4));
  c.fill(c.arc([0.3, 3], [-0.2, 17], [3, 29], 0.22, 0.12), STEEL.light, 0.8);
  grip(c, -7.4, 0);
  c.ink(c.oval(0, 0.6, 2.4, 0.9), STEEL.shade, STEEL.dark);
  return c.finish(0.5);
}

/** Topór na drzewcu: `reach` to długość drzewca przed dłonią, `blade` wielkość żeleźca. */
export function axe(reach: number, blade: number, double = false, salt = 84): PartCanvas {
  const half = Math.ceil(blade * 4.4) + 2;
  const c = partCanvas(double ? -half : -4, -8, half, Math.ceil(reach + blade * 3.4) + 3, salt);
  c.form(c.line(0, -5.4, 0, reach + blade * 2.2, 0.85), WOOD, { rag: RAG_HARD });
  const head = (side: number) =>
    c.poly([
      [side * 0.6, reach - blade * 2],
      [side * blade * 3.6, reach - blade * 3],
      [side * blade * 4.2, reach + blade * 0.2],
      [side * blade * 3.2, reach + blade * 3],
      [side * 0.6, reach + blade * 1.2],
    ]);
  steel(c, double ? union(head(1), head(-1)) : head(1));
  // Jasna krawędź ostrza.
  c.fill(
    c.arc(
      [blade * 3.6, reach - blade * 2.6],
      [blade * 4.4, reach + blade * 0.2],
      [blade * 3.2, reach + blade * 2.6],
      0.25,
      0.25,
    ),
    STEEL.light,
    0.9,
  );
  grip(c, -2.4, 2.4);
  return c.finish(0.6);
}

/** Pawęż Defenixa ze znakiem szczepu; trzymana w drugiej ręce, zasłania przód postaci. */
export function pavise(): PartCanvas {
  const c = partCanvas(-9, -17, 9, 15, 85);
  const board = c.poly([
    [-5.6, -13.6],
    [5.6, -13.6],
    [6.4, 4],
    [3.4, 10.6],
    [0, 11.8],
    [-3.4, 10.6],
    [-6.4, 4],
  ]);
  const inside = c.form(board, WOOD, { rag: RAG_HARD, rim: 0.5 });
  // Okucie wzdłuż krawędzi i przez środek, zjedzone rdzą.
  for (const [from, to] of [
    [
      [-5.4, -12.4],
      [5.4, -12.4],
    ],
    [
      [0, -13],
      [0, 11],
    ],
  ] as const) {
    c.fill(intersect(inside, c.line(from[0], from[1], to[0], to[1], 0.75)), STEEL.shade);
  }
  c.patches(inside, RUST, 0.16, 2, 0.8);
  c.fill(intersect(inside, c.dot(0, -2.4, 4.4)), BAND.shade);
  emblem(c, 0, -2.4, 3.2, BONE);
  return c.finish(0.8);
}

/** Kolba z trucizną w dłoni Poisonixa: pękata, z korkiem, w środku świeci jad. */
export function flaskInHand(): PartCanvas {
  const c = partCanvas(-6, -7, 6, 9, 86);
  c.form(union(c.dot(0, 3, 3.8), c.box(0, -1.6, 1.2, 2.4, 0.3)), STEEL, {
    rag: RAG_HARD,
    shadow: 0.5,
  });
  c.fill(intersect(c.dot(0, 3, 2.9), c.box(0, 4.6, 4, 2.6, 0)), VENOM);
  c.fill(c.dot(-0.9, 3.8, 0.7), '#e9f7b0', 0.9);
  c.ink(c.box(0, -4.2, 1.5, 0.9, 0.3), WOOD.light, WOOD.dark);
  return c.finish(0.4);
}

/** Lanca Hornixa: krótka pika z zadziorami, w barwach szczepu. */
export function barbedLance(): PartCanvas {
  const c = partCanvas(-6, -10, 6, 27, 87);
  c.form(c.line(0, -7.4, 0, 16, 0.9), WOOD, { rag: RAG_HARD });
  steel(
    c,
    union(
      c.horn(0, 14, 0, 24.4, 2.3, 0.25),
      c.horn(0.4, 16, 3.8, 12.4, 1.1, 0.15),
      c.horn(-0.4, 16, -3.8, 12.4, 1.1, 0.15),
    ),
  );
  c.form(c.horn(0, 10.4, -3.8, 6.4, 1.2, 0.3), BAND, { rag: 0.4, shadow: 0.5 });
  grip(c, -2.4, 2.4);
  return c.finish(0.6);
}

/**
 * Broń generała: wielki topór o dwóch żeleźcach, z którego szczytu wyrasta ostrze o falistej,
 * płomienistej krawędzi (szkic autora).
 */
export function flameHalberd(): PartCanvas {
  const c = partCanvas(-12, -13, 12, 45, 88);
  c.form(c.line(0, -10.4, 0, 27, 1), WOOD, { rag: RAG_HARD });
  // Płomieniste ostrze: zęby na przemian po obu stronach, coraz węższe ku czubkowi.
  const flame = [c.horn(0, 25, 0, 41.6, 2, 0.25)];
  for (let i = 0; i < 5; i++) {
    const y = 27.6 + i * 2.6;
    const side = i % 2 === 0 ? 1 : -1;
    flame.push(c.horn(0, y, side * (3.6 - i * 0.45), y + 2.6, 1.3 - i * 0.14, 0.15));
  }
  steel(c, union(...flame));
  const bit = (side: number) =>
    c.poly([
      [side * 0.6, 17],
      [side * 7.6, 14.4],
      [side * 9.4, 20.4],
      [side * 7, 26.4],
      [side * 0.6, 23],
    ]);
  steel(c, union(bit(1), bit(-1)));
  c.fill(c.arc([7.8, 15], [9.8, 20.4], [7.2, 25.8], 0.28, 0.28), STEEL.light, 0.9);
  c.form(c.box(0, 20, 1.5, 3.4, 0.5), BAND, { rag: RAG_HARD, shadow: 0.5 });
  grip(c, -3, 3, 1);
  return c.finish(0.6);
}

/** Szabla Axina 1: długa, szeroka przy końcu, mocno wygięta. */
export function sabre(): PartCanvas {
  const c = partCanvas(-6, -9, 12, 35, 89);
  steel(c, c.arc([0, 1], [-1.6, 19], [7.4, 31.4], 1.3, 0.35));
  steel(c, c.arc([0.6, 18], [1.4, 26], [7.4, 31.4], 1.9, 0.3));
  grip(c, -6.4, 0);
  c.ink(c.box(0, 0.6, 2.6, 0.8, 0.3), STEEL.shade, STEEL.dark);
  return c.finish(0.6);
}

/** Skrzydlaty tasak Axina 2: kolczasta głownia z piórem ostrza po jednej stronie. */
export function wingedCleaver(): PartCanvas {
  const c = partCanvas(-9, -8, 12, 30, 90);
  c.form(c.line(0, -5.4, 0, 20, 0.9), WOOD, { rag: RAG_HARD });
  const wing = union(
    c.poly([
      [0.4, 12],
      [8.4, 9.4],
      [9.6, 14],
      [7.4, 16.4],
      [8.6, 19.4],
      [6, 21.4],
      [6.6, 24.6],
      [0.4, 23],
    ]),
    c.horn(0, 21, 0, 27, 1.8, 0.2),
  );
  steel(c, wing);
  for (const [x, y] of [
    [-3.4, 14.4],
    [-4.6, 18.6],
    [-3.4, 22.6],
  ] as const) {
    c.ink(c.horn(-0.4, y - 0.4, x, y, 1, 0.15), STEEL.light, STEEL.dark);
  }
  grip(c, -2.4, 2.4);
  return c.finish(0.6);
}

/** Czarny sierp Axina 3: szeroki półksiężyc ze sczerniałej stali. */
export function blackSickle(): PartCanvas {
  const c = partCanvas(-8, -8, 17, 30, 91);
  c.form(c.line(0, -5.4, 0, 12, 0.95), WOOD, { rag: RAG_HARD });
  const blade = union(
    c.arc([0, 9.4], [3.4, 27.4], [13.4, 17.4], 1.6, 3),
    c.arc([13.4, 17.4], [15.4, 13.4], [12.4, 9], 3, 0.25),
  );
  const inside = c.form(blade, BLACK_STEEL, { rag: RAG_HARD, rim: 0.8 });
  c.patches(inside, RUST, 0.12, 1.8, 0.7);
  grip(c, -2.4, 2.4);
  return c.finish(0.6);
}
