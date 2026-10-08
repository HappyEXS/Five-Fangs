// Spiker: druga ewolucja Batfanga, strzela kolcami i sam się leczy. Garb najeżony kościanymi
// kolcami na krótkich łapach: nisko zwieszony łeb pod kościaną płytą, w szparze pod nią zielone
// światło, z dolnej szczęki sterczą dwa kły; rany zarastają mu mchem (szkic autora: zgarbiony
// stwór z kolcami na grzbiecie i łbem przy ziemi).
import { intersect, union } from '../../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, type Point, partCanvas } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper, hooks } from '../limbs-beasts.ts';
import {
  beast,
  boneSpike,
  crack,
  INK,
  OLD_BONE,
  slitEye,
  strands,
  teeth,
  VOID,
} from './palette.ts';

/** Zrogowaciała, oliwkowobrunatna skóra. */
const HORN_HIDE = { main: '#4a422d', shade: '#231f13', light: '#6f6644', dark: INK };
const MOSS = '#5c7029';

export const SPIKER: Palette = beast(HORN_HIDE, MOSS, '#aaf05a');

/** Kolec z ciemnym, osmalonym czubkiem. */
function quill(c: PartCanvas, from: Point, to: Point, radius: number, far = false): void {
  const shape = boneSpike(c, from, to, radius, far);
  const tx = from[0] + (to[0] - from[0]) * 0.8;
  const ty = from[1] + (to[1] - from[1]) * 0.8;
  c.fill(
    intersect(shape, c.dot(to[0], to[1], Math.hypot(to[0] - tx, to[1] - ty) + 0.6)),
    '#3a2a1a',
  );
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-15, -25, 26, 13, 1);
  // Kolce na karku.
  quill(c, [-2, -8], [-10.6, -18], 1.6, true);
  quill(c, [-3.4, -3], [-12.6, -7], 1.5, true);
  // Łeb zwieszony nisko i wysunięty do przodu.
  const skull = c.poly([
    [-4.6, -1],
    [-3.6, -9.6],
    [3, -14],
    [11, -12.6],
    [18.4, -8],
    [21.4, -4],
    [19.4, -0.4],
    [10, 2.4],
    [1, 3],
  ]);
  const inside = c.form(union(skull, strands(c, [[-2, 1.6, -2.6, 6.4, 1.8]])), p);
  c.patches(inside, p.light, 0.16, 2.4, 0.6);
  c.patches(inside, p.accent, 0.1, 2.2, 0.8);
  // Szpara ciemności pod płytą czoła, w niej oko.
  c.fill(
    intersect(
      inside,
      c.poly([
        [5, -8.6],
        [15.6, -7.6],
        [17, -4.6],
        [6, -4.4],
      ]),
    ),
    VOID,
  );
  slitEye(c, 11.4, -6.2, 2.4, 0.95, 0.5, p.glow);
  // Rozcięcie pyska i dwa kły dolnej szczęki.
  c.fill(intersect(inside, c.line(7, -0.4, 20.6, -2.6, 0.9)), VOID);
  teeth(c, [8.6, -0.2], [12, -0.8], 3, -1.9, BONE_SHADE, 0.7);
  c.ink(c.horn(14.4, -0.2, 15.6, -7, 1.4, 0.2), BONE, INK);
  c.ink(c.horn(18.2, -1.4, 19.6, -6.4, 1.15, 0.2), BONE_SHADE, INK);
  // Kościana płyta czoła, spękana, z dwoma krótkimi kolcami.
  const plate = c.poly([
    [-1, -12],
    [7, -15.6],
    [16.6, -10.6],
    [15, -7.4],
    [6, -9.6],
    [0, -8],
  ]);
  quill(c, [3, -13], [0.4, -21.6], 1.5);
  quill(c, [9.4, -13.6], [10.4, -22], 1.5);
  const bone = c.form(plate, OLD_BONE, { rag: 0.25, rim: 0.5 });
  c.patches(bone, BONE_SHADE, 0.22, 2.2, 0.7);
  crack(c, bone, [
    [5.6, -15],
    [6.8, -12.6],
    [5.8, -10.4],
  ]);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-38, -52, 16, 11, 2);
  // Krótki ogon z kolcem.
  quill(c, [-17, 1], [-25.6, -2.4], 1.4, true);
  c.form(c.horn(-9, -1, -19.6, 3.4, 3.6, 1.2), p);
  // Tylny rząd kolców: długie, w cieniu, rozchodzą się wachlarzem z garbu.
  const centre: Point = [-3, -11];
  const fan = (degrees: number, reach: number, far: boolean, radius: number): void => {
    const angle = (degrees * Math.PI) / 180;
    const from: Point = [centre[0] + Math.cos(angle) * 9, centre[1] - Math.sin(angle) * 11.6];
    quill(
      c,
      from,
      [from[0] + Math.cos(angle) * reach, from[1] - Math.sin(angle) * reach],
      radius,
      far,
    );
  };
  for (const [degrees, reach] of [
    [62, 19],
    [84, 24],
    [106, 21],
    [128, 25],
    [150, 20],
    [172, 23],
    [196, 17],
  ] as const) {
    fan(degrees, reach, true, 1.7);
  }
  // Garb: kopuła zrogowaciałej skóry opadająca ku biodrom.
  const hump = c.poly([
    [-13, 3.6],
    [-15.6, -8],
    [-13.4, -19],
    [-6.4, -25.6],
    [2, -25.4],
    [8.4, -19],
    [10, -10],
    [8.4, -2],
    [5.4, 5],
    [-8, 5.6],
  ]);
  const inside = c.form(hump, p);
  // Płyty skóry: łukowate bruzdy.
  for (const [ax, ay, bx, by, cx, cy] of [
    [-13, -14, -5, -19.6, 4, -17],
    [-14.4, -6, -5, -12, 7.6, -10],
    [-13, 1, -4, -5, 8, -3.6],
  ] as const) {
    c.fill(intersect(inside, c.arc([ax, ay], [bx, by], [cx, cy], 0.34, 0.34)), p.shade);
  }
  c.patches(inside, p.light, 0.14, 2.4, 0.6);
  // Blady, pozszywany brzuch.
  const belly = intersect(inside, c.oval(8, -4, 5.4, 9.6));
  c.fill(belly, '#7a6e52');
  c.patches(belly, p.shade, 0.3, 2.2, 0.7);
  c.scar([2.6, -6], [8, -1.6], INK, 3);
  // Mech w starych ranach.
  c.patches(intersect(inside, c.oval(-5, -9, 9, 13)), p.accent, 0.24, 2.6, 0.9);
  c.scar([-9.6, -9], [-4.6, -13], INK, 2);
  // Przedni rząd kolców: krótszy, wyrasta z boku garbu.
  for (const [x, y, dx, dy] of [
    [-2.6, -19, -6.4, -11.6],
    [-6.6, -14, -11, -7.6],
    [-7.4, -8, -12, -1.6],
    [2.6, -20.6, 1, -12.4],
  ] as const) {
    quill(c, [x, y], [x + dx, y + dy], 1.6);
  }
  return c.finish();
}

export function spikerParts(): Record<string, PartCanvas> {
  const p = SPIKER;
  return {
    thigh: beastThigh(p, 1.12),
    shin: beastShin(p, 'paw', 1.08),
    torso: torso(p),
    upper: beastUpper(p, 1.05),
    fore: beastFore(p, 'paw', 1.05),
    head: head(p),
    weapon: hooks(p, 7),
  };
}
