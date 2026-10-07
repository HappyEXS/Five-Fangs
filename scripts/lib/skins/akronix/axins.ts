// Axiny: trzej bossowie Akronixów (dolna część szkicu autora). Więksi i masywniejsi od reszty:
// naga, blada pierś jak skrzynia, kudły opadające na oczy, wrzask, karwasze i okute buty,
// broń w obu rękach. W bliższej ręce każdy trzyma topór, w dalszej to, co go wyróżnia:
// Axin 1 szablę, Axin 2 skrzydlaty tasak, Axin 3 czarny sierp.
import { intersect } from '../../raster.ts';
import { BONE, type PartCanvas, partCanvas, RAG_HARD, RUST, STEEL } from '../kit.ts';
import { bandHead, wrapFore, wrapShin, wrapThigh, wrapUpper } from './body.ts';
import { BAND, CLOTH, LEATHER, SKIN } from './palette.ts';
import { axe, blackSickle, sabre, wingedCleaver } from './weapons.ts';

/** `rank` 1–3: kolejne Axiny mają coraz więcej żelaza i blizn. */
function chest(rank: number): PartCanvas {
  const c = partCanvas(-12, -28, 12, 13, 120 + rank);
  // Fartuch w barwach szczepu zwisa spod pasa.
  c.form(
    c.poly([
      [-4, -0.6],
      [4.4, -0.6],
      [3.6, 9.4],
      [1.4, 7.4],
      [-0.4, 10],
      [-2.6, 7.6],
      [-4.4, 9.2],
    ]),
    BAND,
    { rag: 0.5, shadow: 0.6 },
  );
  const body = c.form(c.box(0, -11.6, 7.8, 10.8, 2.8), SKIN, { rag: 0.35 });
  c.patches(body, SKIN.shade, 0.26, 2.6, 0.75);
  // Mostek i żebra: cienie pod skórą.
  c.fill(intersect(body, c.line(1.6, -18.4, 1.6, -5.6, 0.3)), SKIN.dark, 0.45);
  for (const y of [-12.4, -9.4, -6.4]) {
    c.fill(
      intersect(body, c.arc([1.6, y], [4.4, y + 1.2], [6.6, y - 0.2], 0.25, 0.2)),
      SKIN.dark,
      0.4,
    );
  }
  // Skrzyżowane pasy przez pierś.
  for (const [ax, bx] of [
    [-7.6, 7.6],
    [7.6, -7.6],
  ] as const) {
    c.fill(intersect(body, c.line(ax, -21, bx, -4, 1)), LEATHER.dark);
    c.fill(intersect(body, c.line(ax, -21, bx, -4, 0.55)), LEATHER.main);
  }
  c.ink(c.dot(0, -12.5, 1.5), STEEL.main, STEEL.dark);
  c.scar([-4.6, -17.4], [-1.6, -14.6], SKIN.dark, 2);
  if (rank >= 2) c.scar([2.6, -8.6], [5.4, -5.4], SKIN.dark, 2);
  if (rank >= 3) c.scar([-5.4, -9.6], [-2.4, -6.4], SKIN.dark, 3);

  c.form(c.box(0, -1.2, 7.6, 1.8, 0.5), LEATHER, { rag: RAG_HARD, shadow: 0.5 });
  c.ink(c.box(0.8, -1.2, 1.5, 1.2, 0.25), STEEL.main, STEEL.dark);
  if (rank >= 2) {
    // Naramiennik na bliższym barku; u Axina 3 z kościanym kolcem.
    const plate = c.form(c.oval(2.4, -20.4, 6, 3), STEEL, { rag: RAG_HARD, rim: 0.7 });
    c.patches(plate, RUST, 0.25, 1.8, 0.85);
    if (rank >= 3) c.ink(c.horn(3, -22.6, 6.4, -26.4, 1.4, 0.2), BONE, STEEL.dark);
  }
  return c.finish();
}

function axin(rank: number, weapon: PartCanvas, offhand: PartCanvas): Record<string, PartCanvas> {
  const girth = 1.45 + rank * 0.05;
  return {
    thigh: wrapThigh(CLOTH, girth),
    shin: wrapShin(CLOTH, girth, true),
    torso: chest(rank),
    upper: wrapUpper(SKIN, girth),
    fore: wrapFore(SKIN, SKIN, girth, rank >= 3 ? STEEL : LEATHER),
    head: bandHead({
      hair: 'shag',
      band: false,
      mouth: 'shout',
      brows: rank >= 2,
      salt: 130 + rank,
    }),
    weapon,
    offhand,
  };
}

/** Axin 1: topór i szabla. */
export function axin1Parts(): Record<string, PartCanvas> {
  return axin(1, axe(13, 1.25, false, 141), sabre());
}

/** Axin 2: brodaty topór i skrzydlaty tasak; jego ciosy zostawiają krwawiące rany. */
export function axin2Parts(): Record<string, PartCanvas> {
  return axin(2, axe(15, 1.6, false, 142), wingedCleaver());
}

/** Axin 3: topór o dwóch żeleźcach i czarny sierp. */
export function axin3Parts(): Record<string, PartCanvas> {
  return axin(3, axe(16, 1.6, true, 143), blackSickle());
}
