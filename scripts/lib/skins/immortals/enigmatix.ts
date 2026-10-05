// Enigmatix: druga ewolucja Guardian of hell, walczy wręcz i ma tarczę. Zakapturzony strażnik
// zagadki: pod czarnym kapturem o dwóch rogach widać tylko skośne, świecące oczy i rząd zębów;
// szeroka szata w złote pasy, sztywny wysoki kołnierz, w dłoni ciężka buława w kształcie klucza
// (szkic autora: kaptur, migdałowe oczy, zęby, pasiasta szata, berło).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { ragShin, ragThigh, sleeveFore, sleeveUpper } from '../limbs-immortals.ts';
import { GOLD, immortal, SOOT } from './palette.ts';

export const ENIGMATIX: Palette = immortal(SOOT, GOLD.main);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-17, -28, 16, 7, 1);
  // Kaptur o dwóch rogach, z postrzępionym brzegiem.
  const cowl = c.poly([
    [-9, -2],
    [-11, -14],
    [-14, -24.5],
    [-6, -19.5],
    [0, -22.5],
    [7, -20],
    [13, -25],
    [11.6, -12],
    [9.6, -2],
    [4, 2.8],
    [-3, 2.8],
  ]);
  const inside = c.form(cowl, p, { rag: 0.5 });
  c.patches(inside, p.light, 0.12, 2.6, 0.8);
  // Pod kapturem nie ma twarzy: ciemność, dwoje oczu i zęby.
  c.fill(intersect(inside, c.oval(1.6, -9, 6.8, 7.2)), '#040302');
  for (const eye of [
    [
      [-3.8, -9.4],
      [-0.4, -13.2],
      [1, -10.2],
      [-1.8, -8],
    ],
    [
      [2.6, -10.4],
      [5.4, -13.8],
      [8, -11.8],
      [4.6, -8.4],
    ],
  ] as const) {
    const shape = c.poly(eye);
    c.fill(c.ragged(shape, 0.2, 2), p.glow);
  }
  c.fill(c.oval(-1.2, -10.4, 3.6, 3), p.glow, 0.14);
  c.fill(c.oval(5.2, -11, 3.6, 3), p.glow, 0.14);
  c.fill(c.line(-2.6, -9.2, -0.2, -11.8, 0.3), p.dark);
  c.fill(c.line(4, -9.6, 6.4, -12.2, 0.3), p.dark);
  for (const [x, y] of [
    [-1.4, -4.4],
    [0, -4],
    [1.4, -3.8],
    [2.8, -3.8],
    [4.2, -4],
    [5.6, -4.4],
  ] as const) {
    c.fill(c.box(x, y, 0.55, 1.05, 0.15), BONE);
  }
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-16, -36, 16, 9, 2);
  // Sztywny kołnierz: dwie płyty sterczące po bokach głowy, ze złotą krawędzią.
  for (const plate of [
    [
      [-9, -18],
      [-12.8, -33.6],
      [-7, -30.6],
      [-4.6, -20],
    ],
    [
      [4.6, -20],
      [7, -30.6],
      [12.8, -33.6],
      [9, -18],
    ],
  ] as const) {
    c.form(c.poly(plate), p, { rag: 0.3, rim: 0.3 });
  }
  c.fill(c.line(-12.4, -32.6, -7.2, -29.8, 0.4), GOLD.main);
  c.fill(c.line(7.2, -29.8, 12.4, -32.6, 0.4), GOLD.main);
  // Szata: szerokie ramiona, prosta do bioder.
  const robe = c.poly([
    [-11.6, -22],
    [11.6, -22],
    [12.6, -16],
    [9, -12],
    [9.6, 6],
    [-9.6, 6],
    [-9, -12],
    [-12.6, -16],
  ]);
  const inside = c.form(robe, p, { rag: 0.45 });
  // Złote pasy w poprzek, przetarte i ściemniałe.
  for (const y of [-14.5, -9, -3.5, 2]) {
    const band = intersect(inside, c.line(-13, y, 13, y, 1));
    c.fill(band, GOLD.dark);
    c.fill(intersect(inside, c.line(-13, y, 13, y, 0.62)), GOLD.main);
    c.patches(band, GOLD.shade, 0.4, 2.2, 0.9);
  }
  c.patches(inside, '#000000', 0.14, 2.6, 0.5);
  return c.finish();
}

/** Buława-klucz: trzonek, na końcu złote ucho klucza, pod nim dwa zęby. */
function mace(p: Palette): PartCanvas {
  const c = partCanvas(-7, -6, 8, 32, 3);
  const iron = { main: '#3a3530', shade: '#1c1916', dark: p.dark, light: '#6a6258' };
  c.form(c.line(0, -2.4, 0, 21, 1), iron, { rag: RAG_HARD, shadow: 0.5 });
  c.form(c.dot(0, -2.6, 1.6), GOLD, { rag: RAG_HARD, shadow: 0.5 });
  const bow = subtract(c.dot(0, 25, 4.4), c.dot(0, 25, 2.1));
  const bits = union(c.box(2.6, 15.4, 2, 1, 0.2), c.box(2.2, 18.2, 1.6, 0.9, 0.2));
  const inside = c.form(union(bow, bits), GOLD, { rag: RAG_HARD, rim: 0.5 });
  c.patches(inside, GOLD.shade, 0.35, 2.2, 0.9);
  return c.finish();
}

export function enigmatixParts(): Record<string, PartCanvas> {
  const p = ENIGMATIX;
  return {
    thigh: ragThigh(p),
    shin: ragShin(p),
    torso: torso(p),
    upper: sleeveUpper(p),
    fore: sleeveFore(p, BONE),
    head: head(p),
    weapon: mace(p),
  };
}
