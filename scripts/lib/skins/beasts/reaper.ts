// Reaper: pierwsza ewolucja, walczy wręcz. Kostucha w lisiej skórze: zamiast pyska ma gołą lisią
// czaszkę z jednym światłem w oczodole, wokół niej kaptur skołtunionej sierści z postrzępionymi
// uszami; spod futra wyłażą żebra, a z każdej łapy rosną trzy kościane sierpy (szkic autora:
// trójkątny lisi łeb ze szpiczastymi uszami i długie, zakrzywione pazury po bokach).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper } from '../limbs-beasts.ts';
import {
  beast,
  crack,
  emberEye,
  FAR_BONE,
  grime,
  INK,
  OLD_BONE,
  strands,
  teeth,
  VOID,
} from './palette.ts';

/** Spalona lisia rudość. */
const FOX = { main: '#4d2e20', shade: '#24140c', light: '#7a5238', dark: INK };

export const REAPER: Palette = beast(FOX, '#1b110b', '#e2f4c2');

function head(p: Palette): PartCanvas {
  const c = partCanvas(-19, -44, 29, 13, 1);
  const dusk = { main: p.accent, shade: INK, dark: INK, light: p.shade };
  // Dalsze ucho.
  c.form(
    c.poly([
      [-8, -15],
      [-11, -36],
      [-1, -19],
    ]),
    dusk,
  );
  // Kaptur z sierści: otula czaszkę od tyłu i opada strzępami na kark.
  const cowl = c.poly([
    [-10, 2],
    [-12.4, -8],
    [-9.4, -17.6],
    [-2, -22],
    [6, -20],
    [9, -14],
    [5, -4],
    [3.6, 3],
    [1.6, 8.6],
    [-0.6, 3],
    [-3, 9.6],
    [-5.4, 3],
    [-8, 8],
  ]);
  const hood = c.form(
    union(
      cowl,
      strands(c, [
        [-11, -6, -5, 6.5, 2.1],
        [-11.6, -13, -5.6, 3, 2],
      ]),
    ),
    p,
    { rag: 0.8 },
  );
  for (const [x, top, bottom] of [
    [-7, -15, 2],
    [-3, -18, -6],
    [-4, -2, 6],
  ] as const) {
    c.fill(intersect(hood, c.line(x, top, x - 1.6, bottom, 0.34)), p.shade);
  }
  // Żuchwa: wąska listwa kości pod czaszką, lekko opuszczona.
  const jaw = c.poly([
    [2.6, -3.2],
    [12, -2.2],
    [22.6, -3.2],
    [23, -1.6],
    [12, 0.6],
    [4, 0.2],
  ]);
  c.form(jaw, FAR_BONE, { rag: RAG_HARD, shadow: 0.5 });
  teeth(c, [10, -2.4], [21, -3], 5, -1.9, BONE_SHADE, 0.55);
  // Czaszka: mózgoczaszka i długi, wąski pysk.
  const skull = c.poly([
    [-1.6, -14.6],
    [4, -17.6],
    [9.6, -15.8],
    [13.6, -12.2],
    [23.6, -9.8],
    [25.4, -7.8],
    [24.4, -5.8],
    [12.4, -4.4],
    [6, -3.4],
    [0.6, -5],
    [-2.6, -9],
  ]);
  const bone = c.form(skull, OLD_BONE, { rag: RAG_HARD, rim: 0.5 });
  c.patches(bone, BONE_SHADE, 0.2, 2.2, 0.7);
  // Oczodół z jednym bladym światłem, otwór nosa, pęknięcie na czole.
  c.fill(intersect(bone, c.ragged(c.oval(6.6, -11, 3.3, 2.8), 0.3, 2)), VOID);
  emberEye(c, 7.2, -10.8, 0.9, p.glow);
  c.fill(
    intersect(
      bone,
      c.poly([
        [20.4, -9.2],
        [23.6, -8.4],
        [22.4, -7],
      ]),
    ),
    VOID,
  );
  crack(c, bone, [
    [1.6, -15],
    [3, -12.6],
    [1.8, -10.6],
    [3.4, -8.4],
  ]);
  c.fill(intersect(bone, c.line(11, -8.6, 18, -7.8, 0.26)), BONE_SHADE);
  // Zęby górnej szczęki; kieł z przodu dłuższy.
  teeth(c, [9.6, -4.4], [20.4, -5.4], 6, 2.1, BONE, 0.6);
  c.ink(c.horn(22.6, -6, 23.2, -1.6, 0.85, 0.15), BONE, INK);
  // Bliższe ucho: wysokie, naddarte.
  const ear = subtract(
    c.poly([
      [-2.6, -18],
      [2, -41],
      [7.6, -19],
    ]),
    union(c.dot(6.4, -29, 2), c.line(1, -30, 2.4, -24, 0.4)),
  );
  c.form(ear, p);
  c.fill(
    c.poly([
      [0.4, -32],
      [2, -39.4],
      [3.8, -32],
    ]),
    p.accent,
  );
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-36, -34, 14, 26, 2);
  // Ogon: wyleniały, zwisa jak podarta szmata, z brudnobiałym końcem.
  const tail = union(
    c.arc([-4, -4], [-17, -9], [-21, 3], 3.6, 5.6),
    c.arc([-21, 3], [-23.6, 12], [-21, 21], 5.6, 0.6),
  );
  const tailInside = c.form(
    union(
      tail,
      strands(c, [
        [-24, 4, -5, 6.4, 2.2],
        [-25, 9, -3.6, 7.4, 2.2],
        [-18, 8, 3.4, 7.6, 2],
        [-23, 14, -2, 7, 1.8],
        [-13, -7.6, -1.6, 6.6, 1.8],
      ]),
    ),
    p,
    { rag: 0.8 },
  );
  c.patches(intersect(tailInside, c.dot(-21.6, 18, 8)), BONE_SHADE, 0.6, 2.6, 0.9);
  c.patches(tailInside, p.shade, 0.3, 2.6, 0.9);
  for (const [ax, ay, bx, by] of [
    [-12, -6, -19.6, 0],
    [-19, 2, -22.4, 11],
    [-22, 6, -21, 16],
  ] as const) {
    c.fill(intersect(tailInside, c.line(ax, ay, bx, by, 0.34)), p.shade);
  }
  // Strzęp futra na grzbiecie jak peleryna.
  c.form(
    union(
      c.poly([
        [-6, -21],
        [-11.6, -13],
        [-10, -4],
        [-13.4, 3],
        [-8, 0],
        [-5.4, 6],
        [-3, -3],
      ]),
      strands(c, [[-10.6, -15, -5, 3.6, 1.9]]),
    ),
    { main: p.accent, shade: INK, dark: INK, light: p.shade },
    { rag: 0.8 },
  );
  // Chudy tułów.
  const body = c.poly([
    [-6.6, -20],
    [-1, -24],
    [5, -22.4],
    [7.6, -16],
    [6.6, -9],
    [4.6, -3],
    [4.6, 3.6],
    [-4.6, 3.6],
    [-5.6, -4],
    [-8, -12],
  ]);
  const inside = c.form(body, p);
  c.patches(inside, p.shade, 0.2, 2.4, 0.8);
  // Żebra na wierzchu: gołe kości.
  for (const [y, far] of [
    [-17.6, false],
    [-14, false],
    [-10.4, false],
    [-6.8, true],
  ] as const) {
    c.ink(
      intersect(inside, c.arc([-1, y - 0.4], [4, y + 2], [8.6, y - 1], 0.95, 0.6)),
      far ? BONE_SHADE : BONE,
      INK,
    );
  }
  return c.finish();
}

/** Trzy kościane sierpy rosnące z dłoni; biegną w dół od pivota jak klinga miecza. */
function sickles(p: Palette): PartCanvas {
  const c = partCanvas(-14, -5, 13, 31, 3);
  c.form(c.dot(0, 0, 2.5), p, { shadow: 0.6 });
  for (const [x, length, bow, far] of [
    [-2, 20, 0.8, true],
    [0, 26, 1, false],
    [2, 22.6, 1.15, false],
  ] as const) {
    // Sierp: ostrze wybrzusza się do przodu i wraca czubkiem do tyłu.
    const blade = c.arc([x, 0.5], [x + 9 * bow, length * 0.62], [x - 4.4, length], 2.1, 0.2);
    c.ink(blade, far ? BONE_SHADE : BONE, INK);
    grime(c, blade, [x, 0.5], 6, far ? '#4f4733' : BONE_SHADE);
    if (!far) {
      crack(c, blade, [
        [x + 3.4 * bow, length * 0.3],
        [x + 4.6 * bow, length * 0.38],
        [x + 3.8 * bow, length * 0.46],
      ]);
    }
  }
  return c.finish(0.6);
}

export function reaperParts(): Record<string, PartCanvas> {
  const p = REAPER;
  // Ciemne „skarpety” na kończynach, jak u lisa.
  const socks: Palette = { ...p, main: p.accent, shade: INK, light: p.shade };
  return {
    thigh: beastThigh(p, 0.84),
    shin: beastShin(socks, 'paw', 0.84),
    torso: torso(p),
    upper: beastUpper(p, 0.8),
    fore: beastFore(socks, 'paw', 0.82),
    head: head(p),
    weapon: sickles(socks),
  };
}
