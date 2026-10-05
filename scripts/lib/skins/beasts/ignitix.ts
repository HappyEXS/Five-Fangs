// Ignitix: druga ewolucja Reapera, strzelec celujący w koniec szyku wroga. Zwęglony gad na
// długiej szyi, z wydłużoną zębatą paszczą, w której tli się ogień; między łuskami świecą
// szczeliny żaru (szkic autora: łeb z długimi szczękami, oko wysoko z tyłu, zygzak łusek na szyi).
import { intersect, type Shape, union } from '../../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, type Point, partCanvas } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const IGNITIX: Palette = {
  main: '#56281a',
  shade: '#2a120b',
  light: '#8c5a2c',
  dark: '#110604',
  accent: '#d9541a',
  glow: '#ffc04a',
};

/** Grzebień: zwęglone, prawie czarne łuski. */
const RIDGE = { main: '#2a1410', shade: '#150806', dark: '#110604', light: '#56281a' };

/** Szczelina żaru: ciemna rysa z jasnym środkiem. */
function ember(c: PartCanvas, p: Palette, clip: Shape, points: readonly Point[]): void {
  c.fill(intersect(clip, c.path(points, 0.55)), p.accent, 0.9);
  c.fill(intersect(clip, c.path(points, 0.22)), p.glow);
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-16, -48, 35, 7, 1);
  // Rogi na potylicy; dalszy ułamany.
  c.ink(c.horn(1, -34, -4.5, -38.5, 1.9, 1.1), BONE_SHADE, p.dark);
  c.ink(c.horn(3.5, -35.5, -1.5, -46, 2, 0.3), BONE, p.dark);
  // Grzebień łusek wzdłuż karku.
  for (const [x, y] of [
    [-4.2, -6],
    [-4.6, -12.5],
    [-3.4, -19],
  ] as const) {
    c.form(c.horn(x + 2.5, y, x - 4, y - 3.2, 2.1, 0.3), RIDGE, { shadow: 0 });
  }
  // Szyja wygięta w łuk; z przodu płytki, między nimi żar.
  const neck = c.arc([0, 0], [-4, -14], [4.5, -25], 4.6, 3.7);
  const neckInside = c.form(neck, p, { rag: 0.45 });
  const throat = intersect(neckInside, c.arc([3.4, 1], [-0.2, -13], [7.6, -23], 1.9, 1.6));
  c.fill(throat, p.light);
  for (const [x, y] of [
    [0.6, -5],
    [0.2, -10.5],
    [1.4, -16],
  ] as const) {
    c.fill(intersect(throat, c.line(x - 2.5, y, x + 3.5, y - 0.8, 0.32)), p.dark, 0.7);
  }
  ember(c, p, neckInside, [
    [-2.6, -3],
    [-1.4, -6.5],
    [-3, -9.5],
    [-1.6, -13],
  ]);
  // Dolna szczęka, żar w paszczy, potem czaszka z długą górną szczęką.
  c.form(c.box(15, -23.4, 10.4, 2.2, 1.8), p, { rag: 0.4, shadow: 0.5 });
  c.fill(c.oval(16.5, -26, 9.4, 1.6), p.accent);
  c.fill(c.oval(18.5, -26, 6.5, 0.85), p.glow);
  const skull = union(c.oval(5, -29.5, 7, 6.6), c.box(17.5, -30.2, 12, 3.5, 2.6));
  const skullInside = c.form(union(skull, c.dot(28, -33.4, 1.9)), p, { rag: 0.4 });
  c.fill(c.dot(28.4, -33.6, 0.75), p.dark);
  ember(c, p, skullInside, [
    [11, -32.5],
    [14.5, -31.4],
    [17, -32.6],
    [20.5, -31.6],
  ]);
  // Zęby obu szczęk: nierówne, osmalone.
  for (const [x, length] of [
    [9.5, 3.2],
    [12.9, 2.2],
    [16.3, 3.4],
    [19.7, 2.4],
    [23.1, 3],
  ] as const) {
    c.ink(
      c.poly([
        [x, -27],
        [x + 1.2, -27 + length],
        [x + 2.4, -27],
      ]),
      BONE,
      p.dark,
    );
  }
  for (const x of [11.2, 14.6, 18, 21.4]) {
    c.ink(
      c.poly([
        [x, -25.4],
        [x + 1.2, -28],
        [x + 2.4, -25.4],
      ]),
      BONE_SHADE,
      p.dark,
    );
  }
  // Oko wysoko z tyłu łba, pod łukiem brwiowym.
  c.eye(4.2, -31.6, 2.5, p, 0.6);
  c.fill(c.horn(0.4, -35.6, 8.6, -33.8, 1.2, 0.7), p.dark);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-33, -31, 14, 18, 2);
  // Gruby ogon opada za plecami i podwija się przy ziemi.
  const tail = c.arc([-4, -5], [-27, -9], [-25, 12], 5.2, 1.1);
  const tailInside = c.form(tail, p, { rag: 0.45 });
  ember(c, p, tailInside, [
    [-12, -7],
    [-16, -5.5],
    [-19.5, -7.5],
    [-22, -3],
  ]);
  // Grzebień na grzbiecie.
  for (const [x, y] of [
    [-6.5, -20.5],
    [-8.4, -14],
    [-8.4, -7.5],
  ] as const) {
    c.form(c.horn(x + 2.5, y, x - 4.6, y - 2.8, 2.2, 0.3), RIDGE, { shadow: 0 });
  }
  const body = c.oval(0, -12, 9.4, 14);
  const inside = c.form(body, p, { rag: 0.45 });
  const belly = intersect(inside, c.oval(5, -10, 5.2, 11.5));
  c.fill(belly, p.light);
  for (const y of [-19, -14.5, -10, -5.5, -1]) {
    c.fill(intersect(belly, c.line(0, y, 10, y - 0.6, 0.32)), p.dark, 0.7);
  }
  // Pęknięcia żaru na boku.
  ember(c, p, inside, [
    [-5.5, -18],
    [-3, -14.5],
    [-5, -11],
    [-2.4, -7.5],
    [-4.4, -4],
  ]);
  c.patches(inside, p.shade, 0.25, 2.6, 0.9);
  return c.finish();
}

export function ignitixParts(): Record<string, PartCanvas> {
  const p = IGNITIX;
  return {
    thigh: fleshThigh(p, 1.15),
    shin: fleshShin(p, 'paw', 1.1),
    torso: torso(p),
    upper: fleshUpper(p, 1.05),
    fore: fleshFore(p, 'paw', 1.05),
    head: head(p),
    weapon: claws(p, 6.5),
  };
}
