// Bush: forma bazowa szczepu Plants, strzelec, który nie rusza się z miejsca. Przysadzisty,
// ciernisty krzak; w ciemnej dziupli między liśćmi świeci para blisko osadzonych oczu, niżej
// sterczą kolce jak zęby (szkic autora: krzak z oczami na krótkich nóżkach).
// Tym samym rysunkiem w bledszych kolorach jest „Bush ver. 2”, krzak przyzywany przez Mother-tree.
//
// Na szkielecie ludzi krzakiem jest „głowa”: wisi pod stawem szyi i zasłania nogi prawie do
// ziemi, a przy strzale cała się wychyla. Tułów to ciemniejsza warstwa liści za nią.
import { intersect, union } from '../../raster.ts';
import { BONE_SHADE, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { barkShin, barkThigh } from '../limbs-plants.ts';
import { BARK, LEAF, LEAF_DARK, MOSS, plant } from './palette.ts';

export const BUSH: Palette = plant(LEAF);
/** Krzak przyzwany: młodszy, chorobliwie żółtawy. */
export const SPROUT: Palette = plant(
  { main: '#6f7a34', shade: '#40481c', light: '#a2a856', dark: LEAF.dark },
  MOSS,
  '#f0d24a',
);

/** Środek krzaka w układzie szyi. */
const CX = 0;
const CY = 23;

function head(p: Palette): PartCanvas {
  const c = partCanvas(-24, -6, 25, 46, 1);
  const mound = union(
    c.oval(CX, CY, 15, 16),
    c.dot(-11, 14, 7),
    c.dot(10, 13, 7.5),
    c.dot(-13, 27, 6.5),
    c.dot(13.5, 27, 6.5),
    c.dot(-2, 8.5, 8),
    c.dot(6, 36, 6),
    c.dot(-7, 35.5, 6),
    // Suche, cierniste gałązki sterczą z liści.
    c.horn(-10, 10, -18, 2, 1.4, 0.2),
    c.horn(9, 8, 17.5, 0.5, 1.4, 0.2),
    c.horn(0, 6, 1.5, -3, 1.3, 0.2),
    c.horn(-15, 22, -21.5, 19.5, 1.3, 0.2),
    c.horn(15, 23, 22, 20, 1.3, 0.2),
  );
  const inside = c.form(mound, p, { rag: 0.75 });
  c.patches(inside, p.shade, 0.34, 3, 0.9);
  c.patches(inside, p.light, 0.16, 2.2, 0.9);
  c.patches(inside, BARK.light, 0.06, 2, 0.9);
  // Dziupla: ciemność, w niej oczy.
  const hollow = intersect(inside, c.ragged(c.oval(4, 21.5, 8.4, 5.4), 0.5, 3));
  c.fill(hollow, '#050703');
  for (const [x, y, r] of [
    [1.8, 20.6, 1.3],
    [6.6, 21, 1.15],
  ] as const) {
    c.fill(c.dot(x, y, r * 2.2), p.glow, 0.22);
    c.fill(c.dot(x, y, r), p.glow);
    c.fill(c.dot(x + 0.3, y, r * 0.38), '#050703');
  }
  // Kolce u dołu dziupli sterczą jak zęby.
  for (const x of [-0.6, 2.2, 5, 7.8, 10.4]) {
    c.fill(intersect(hollow, c.horn(x, 27.2, x + 0.3, 23.6, 0.9, 0.15)), BONE_SHADE);
  }
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-25, -24, 23, 24, 2);
  const dark = { main: p.shade, shade: LEAF_DARK.shade, dark: p.dark, light: p.main };
  // Pieniek, z którego wyrasta krzak.
  c.form(c.box(0, 16.5, 4, 5, 1.2), BARK, { rag: 0.5 });
  const back = union(
    c.oval(-2, 0, 16, 17.5),
    c.dot(-14, -8, 7),
    c.dot(-15, 8, 7),
    c.dot(8, -11, 8),
    c.dot(-6, -14, 7),
    c.horn(-14, -12, -21, -19, 1.4, 0.2),
    c.horn(-17, 2, -22.5, 0, 1.3, 0.2),
    c.horn(-12, 13, -19, 17, 1.3, 0.2),
    c.horn(4, -16, 6, -22, 1.3, 0.2),
  );
  const inside = c.form(back, dark, { rag: 0.75 });
  c.patches(inside, LEAF_DARK.shade, 0.3, 3, 0.9);
  return c.finish();
}

/** Gałązka z liściem na czubku krzaka: ramię szkieletu, więc drga przy strzale. */
function sprig(p: Palette): PartCanvas {
  const c = partCanvas(-5, -8, 5, 3, 3);
  c.form(union(c.horn(0, 0, -1.6, -5.6, 1.3, 0.3), c.horn(0, 0, 2.4, -4.6, 1.2, 0.3)), p, {
    rag: 0.4,
    shadow: 0.6,
  });
  return c.finish();
}

/** Suchy listek na liściach (przedramię szkieletu) i cierń w paszczy (broń). */
function dryLeaf(): PartCanvas {
  const c = partCanvas(-3, -3, 3, 3, 4);
  c.form(
    c.oval(0, 0, 1.6, 1),
    { ...BARK, main: BARK.light, shade: BARK.main },
    { rag: 0.3, shadow: 0.5 },
  );
  return c.finish();
}

function thorn(): PartCanvas {
  const c = partCanvas(-2, -2, 2, 6, 5);
  c.ink(c.horn(0, 0, 0, 4.2, 0.9, 0.15), BONE_SHADE, LEAF.dark);
  return c.finish(0.5);
}

function bushParts(p: Palette): Record<string, PartCanvas> {
  const roots = { ...BARK, accent: MOSS, glow: p.glow };
  return {
    thigh: barkThigh(roots, 0.6),
    shin: barkShin(roots, 0.7),
    torso: torso(p),
    upper: sprig(p),
    fore: dryLeaf(),
    head: head(p),
    weapon: thorn(),
  };
}

export const bushSkin = (): Record<string, PartCanvas> => bushParts(BUSH);
export const sproutSkin = (): Record<string, PartCanvas> => bushParts(SPROUT);
