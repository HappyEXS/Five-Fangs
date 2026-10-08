// Ignitix: druga ewolucja Reapera, strzelec celujący w koniec szyku wroga. Zwęglony gad na
// długiej szyi: skóra czarna jak wypalone drewno pęka i w szczelinach świeci żar, długa, kanciasta
// paszcza jest piecem z kratą zębów, a oko wysoko z tyłu łba to biały punkt (szkic autora: łeb
// z długimi szczękami i zębami, oko wysoko z tyłu, zygzak łusek na szyi).
import { intersect, type Shape, union } from '../../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, type Point, partCanvas } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper, hooks } from '../limbs-beasts.ts';
import { beast, emberEye, INK, teeth, VOID } from './palette.ts';

/** Zwęglona skóra: czerń z resztką czerwieni. */
const CHAR = { main: '#35201a', shade: '#170b08', light: '#5e3a28', dark: '#080403' };
/** Płyty grzbietu: wypalone do czerni. */
const CINDER = { main: '#1d1210', shade: '#0b0605', light: '#3a2620', dark: '#060302' };
const EMBER = '#dd5418';

export const IGNITIX: Palette = beast(CHAR, EMBER, '#ffd46e');

/** Szczelina żaru: pomarańczowa rysa z jasnym środkiem i poświatą. */
function ember(c: PartCanvas, p: Palette, clip: Shape, points: readonly Point[]): void {
  c.fill(intersect(clip, c.path(points, 1.3)), p.accent, 0.22);
  c.fill(intersect(clip, c.path(points, 0.6)), p.accent, 0.95);
  c.fill(intersect(clip, c.path(points, 0.24)), p.glow);
}

/** Płyta grzbietu: wypalony, wyszczerbiony trójkąt. */
function plate(c: PartCanvas, base: Point, tip: Point, width: number): void {
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * width;
  const ny = (dx / length) * width;
  c.form(c.poly([[base[0] - nx, base[1] - ny], tip, [base[0] + nx, base[1] + ny]]), CINDER, {
    rag: 0.4,
    shadow: 0.5,
  });
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-16, -56, 37, 8, 1);
  // Rogi na potylicy: osmalona kość, dalszy ułamany.
  c.ink(c.horn(1.6, -37, -5.6, -43, 2, 1.1), '#4f4733', INK);
  c.ink(c.arc([4, -38.6], [-1, -46], [-6.6, -52.6], 2.2, 0.3), BONE_SHADE, INK);
  // Płyty wzdłuż karku.
  for (const [base, tip] of [
    [
      [-3, -5],
      [-11.6, -9],
    ],
    [
      [-4.4, -12],
      [-13, -17.6],
    ],
    [
      [-2.6, -19],
      [-10, -26.6],
    ],
  ] as const) {
    plate(c, base, tip, 2.8);
  }
  // Szyja wygięta w łuk; od gardła w dół biegnie zygzak żaru między łuskami.
  const neck = c.arc([0, 0], [-5.6, -14], [4.6, -27], 5.2, 3.9);
  const neckInside = c.form(neck, p, { rag: 0.45 });
  c.patches(neckInside, p.shade, 0.24, 2.4, 0.9);
  ember(c, p, neckInside, [
    [3.6, -23],
    [0, -19.6],
    [2.4, -16],
    [-1.6, -12.6],
    [1, -9],
    [-2.6, -5.6],
    [0.4, -2],
  ]);
  // Dolna szczęka: kanciasta belka.
  const lower = c.poly([
    [2, -26.4],
    [12, -24.6],
    [32, -25.4],
    [33.4, -23],
    [30, -20.6],
    [10, -20],
    [3, -21.6],
  ]);
  const lowerInside = c.form(lower, { ...p, main: p.shade, shade: INK }, { rag: 0.4, shadow: 0.5 });
  c.patches(lowerInside, p.main, 0.2, 2.2, 0.7);
  // Piec w paszczy.
  const fire = c.poly([
    [7, -28.6],
    [34, -29.6],
    [33, -24.6],
    [8, -24],
  ]);
  c.fill(fire, p.accent);
  c.fill(c.line(12, -26.6, 32, -27.2, 1.1), p.glow, 0.9);
  // Czaszka z długą, kanciastą górną szczęką.
  const skull = c.poly([
    [-2.6, -27.6],
    [-0.6, -36],
    [8, -39],
    [14, -36.6],
    [30.6, -35],
    [34.6, -32.4],
    [34.6, -29],
    [12, -27.6],
    [4, -26.4],
  ]);
  const inside = c.form(skull, p, { rag: 0.4 });
  c.patches(inside, p.shade, 0.24, 2.4, 0.9);
  c.patches(inside, p.light, 0.1, 2, 0.6);
  ember(c, p, inside, [
    [12, -33.6],
    [16, -32],
    [19, -33.6],
    [23.6, -32],
    [26.4, -33.2],
  ]);
  emberEye(c, 32.6, -32.6, 0.5, p.glow);
  // Krata zębów na tle żaru.
  teeth(c, [10, -28], [32, -29], 9, 3, BONE, 1);
  teeth(c, [11.6, -24.4], [30.6, -25], 8, -2.6, BONE_SHADE, 1);
  // Oko wysoko z tyłu łba: oczodół i biały punkt.
  c.fill(c.ragged(c.oval(5, -33, 3.2, 2.7), 0.3, 2), VOID);
  emberEye(c, 5.6, -32.8, 1, '#fff2c8');
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-40, -38, 15, 22, 2);
  // Płyty na grzbiecie i ogonie.
  for (const [base, tip, width] of [
    [[-6, -21], [-14, -31.6], 3.4],
    [[-9.6, -14], [-20, -21], 3.4],
    [[-11, -6], [-20.6, -12.6], 3.2],
    [[-19, -7], [-25.6, -15.6], 2.8],
    [[-26, -1], [-34.4, -5.6], 2.6],
  ] as const) {
    plate(c, base, tip, width);
  }
  // Gruby ogon opada za plecami; jego koniec to rozżarzona maczuga.
  const tail = c.arc([-4, -5], [-29, -10], [-28, 12], 5.6, 2);
  const tailInside = c.form(union(tail, c.dot(-28, 13.6, 3.6)), p, { rag: 0.45 });
  c.patches(tailInside, p.shade, 0.24, 2.4, 0.9);
  ember(c, p, tailInside, [
    [-12, -7],
    [-16.6, -5],
    [-20, -7.6],
    [-23.6, -3],
    [-26.6, -4],
  ]);
  ember(c, p, tailInside, [
    [-29.6, 11],
    [-27.6, 13],
    [-29, 15.4],
    [-26.6, 16],
  ]);
  // Korpus.
  const body = c.poly([
    [-9, -19],
    [-4, -25],
    [4, -24],
    [9, -17],
    [10, -8],
    [8, 0],
    [4, 5.4],
    [-6, 5.4],
    [-10, -3],
    [-11.4, -11],
  ]);
  const inside = c.form(body, p, { rag: 0.45 });
  c.patches(inside, p.shade, 0.24, 2.6, 0.9);
  c.patches(inside, p.light, 0.1, 2.2, 0.6);
  // Brzuch: płyty, a między nimi żar.
  const belly = intersect(inside, c.oval(6.6, -9, 4.8, 13));
  c.fill(belly, CINDER.main);
  for (const y of [-18.6, -13.8, -9, -4.2, 0.6]) {
    ember(c, p, belly, [
      [0, y + 0.6],
      [5.6, y - 0.6],
      [12, y + 0.4],
    ]);
  }
  // Pęknięcie żaru na boku.
  ember(c, p, inside, [
    [-6, -18],
    [-3, -14.6],
    [-5.6, -11],
    [-2.4, -7.6],
    [-4.6, -3.6],
  ]);
  return c.finish();
}

export function ignitixParts(): Record<string, PartCanvas> {
  const p = IGNITIX;
  return {
    thigh: beastThigh(p, 1.15),
    shin: beastShin(p, 'paw', 1.1),
    torso: torso(p),
    upper: beastUpper(p, 1.05),
    fore: beastFore(p, 'paw', 1.05),
    head: head(p),
    weapon: hooks(p, 6.5),
  };
}
