// Batfang: pierwsza ewolucja, strzela kłami. Wychudzony nietoperz-upiór: tępy łeb o postrzępionych
// uszach, oczy jak dwa żarzące się punkty w ciemnej przepasce, z górnej szczęki zwisają dwa kły
// dłuższe od brody; żebra wyłażą spod skóry, a za plecami sterczy podarte skrzydło (szkic
// autora: okrągły łeb z uszami i zębami, pasiasty tułów, skrzydło nietoperza na grzbiecie).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE, BONE_SHADE, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper, hooks } from '../limbs-beasts.ts';
import { beast, emberEye, grime, INK, strands, teeth, VOID } from './palette.ts';

/** Szarobrązowa, łysiejąca skóra. */
const SKIN = { main: '#4b3b35', shade: '#231a17', light: '#705a50', dark: INK };
/** Błona skrzydła: przybrudzone wino. */
const MEMBRANE = { main: '#3f222a', shade: '#1f0f14', light: '#5e3640', dark: INK };

export const BATFANG: Palette = beast(SKIN, MEMBRANE.main, '#ff5a3a');

function head(p: Palette): PartCanvas {
  const c = partCanvas(-17, -40, 23, 13, 1);
  // Dalsze ucho.
  c.form(
    c.poly([
      [-8, -14],
      [-12, -33],
      [-1, -19],
    ]),
    { main: p.shade, shade: INK, dark: INK, light: p.main },
  );
  // Dalszy kieł.
  const farFang = c.horn(9.4, -4.6, 10.2, 5.4, 1.5, 0.2);
  c.ink(farFang, BONE_SHADE, INK);
  // Tępy, klinowaty łeb z kępami sierści na karku.
  const skull = c.poly([
    [-9, -3],
    [-10.4, -11],
    [-6.4, -17.6],
    [2, -20],
    [10, -17.4],
    [15.6, -11.6],
    [17.4, -7],
    [15, -3.4],
    [8, -1.4],
    [-2, -0.4],
  ]);
  const inside = c.form(
    union(
      skull,
      strands(c, [
        [-8.6, -6, -5, 6, 2],
        [-9.6, -11, -5.6, 3, 1.9],
        [-3, -1.6, -2.6, 6.4, 1.8],
      ]),
    ),
    p,
  );
  c.patches(inside, p.light, 0.16, 2.4, 0.6);
  // Zadarty, liściasty nos.
  c.form(
    c.poly([
      [14.6, -11.4],
      [19.4, -16.6],
      [18, -8.4],
    ]),
    { main: p.shade, shade: INK, dark: INK, light: p.main },
    { shadow: 0.5 },
  );
  c.fill(c.line(16.8, -11.6, 17.6, -10.4, 0.36), INK);
  // Zapadnięte oczodoły zlewają się w jedną plamę ciemności; w niej dwoje oczu.
  c.fill(
    intersect(
      inside,
      c.ragged(
        union(c.oval(6, -11, 3.6, 3), c.oval(11.8, -10.8, 3.2, 3.2), c.box(9, -11.4, 3, 1.4, 0.6)),
        0.4,
        2.4,
      ),
    ),
    VOID,
  );
  emberEye(c, 6.2, -11, 0.85, p.glow);
  emberEye(c, 11.6, -10.8, 1, p.glow);
  // Rozcięcie pyska z drobnymi zębami.
  c.fill(intersect(inside, c.line(3.6, -4.6, 16.4, -5.4, 0.9)), VOID);
  teeth(c, [5, -5.4], [8, -5.6], 3, 1.6, BONE_SHADE, 0.5);
  // Bliższe ucho: wysokie, naddarte, z ciemnym wnętrzem.
  const ear = subtract(
    c.poly([
      [-1.6, -17],
      [3, -38],
      [8.6, -18],
    ]),
    c.dot(7.4, -27, 1.9),
  );
  c.form(ear, p);
  c.fill(
    c.poly([
      [1, -20],
      [3, -33.6],
      [5.2, -21],
    ]),
    p.accent,
  );
  // Bliższy kieł: długi szabel z brudną nasadą.
  const fang = c.horn(13, -5.2, 14.4, 8.6, 1.8, 0.2);
  c.ink(fang, BONE, INK);
  grime(c, fang, [13, -5.2], 4.4);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-36, -53, 14, 10, 2);
  const wing = { ...MEMBRANE };
  // Skrzydło za plecami: błona rozpięta między palcami, poszarpana i dziurawa.
  const wrist = [-11, -40] as const;
  const tips = [
    [-23, -48],
    [-33, -35],
    [-32.6, -18],
    [-22, -5],
  ] as const;
  const membrane = subtract(
    c.poly([
      [-4, -18],
      wrist,
      tips[0],
      [-25.4, -39],
      tips[1],
      [-28, -27],
      tips[2],
      [-24.4, -13],
      tips[3],
      [-13.6, -8.6],
      [-4, -9],
    ]),
    union(
      // Rozdarcia: długie szczeliny wzdłuż palców i wyrwa przy krawędzi.
      c.horn(-17, -38, -24, -32.6, 0.3, 1.9),
      c.horn(-16, -27, -25.6, -24.6, 0.3, 1.6),
      c.horn(-12.6, -17, -20, -10.6, 0.3, 1.5),
      c.dot(-30.6, -26, 2.4),
    ),
  );
  const web = c.form(membrane, wing, { rag: 0.5 });
  c.patches(web, wing.light, 0.16, 2.6, 0.6);
  // Kości palców i ramię skrzydła; na nadgarstku hak.
  for (const [x, y] of tips) c.fill(c.horn(wrist[0], wrist[1], x, y, 0.75, 0.3), INK);
  c.fill(c.horn(-4, -18, wrist[0], wrist[1], 1.3, 0.8), INK);
  c.ink(c.arc([wrist[0], wrist[1]], [-9, -47], [-5.6, -48.6], 1.1, 0.2), BONE_SHADE, INK);
  // Kołnierz sierści sterczący za karkiem.
  c.form(
    c.poly([
      [-8.6, -17],
      [-12.4, -31],
      [-6.4, -25],
      [-4, -32],
      [-1, -21],
    ]),
    { main: p.shade, shade: INK, dark: INK, light: p.main },
  );
  // Wychudzony, przygarbiony tułów.
  const body = c.poly([
    [-7, -20],
    [-2, -24],
    [5, -22],
    [8.4, -15],
    [6.8, -7],
    [5, 0],
    [3.4, 5],
    [-4, 5],
    [-6, -2],
    [-8.6, -11],
  ]);
  const inside = c.form(union(body, strands(c, [[-7.6, -6, -3.6, 5.6, 1.6]])), p);
  // Żebra wyłażą spod skóry jak pasy.
  for (const y of [-17.4, -13.6, -9.8, -6]) {
    const rib = intersect(inside, c.arc([-3.4, y - 0.6], [2.6, y + 2.2], [8, y - 0.6], 0.7, 0.5));
    c.fill(rib, p.light);
    c.fill(intersect(inside, c.shift(rib, 0, 1)), p.shade, 0.9);
  }
  c.patches(inside, p.shade, 0.16, 2.4, 0.7);
  return c.finish();
}

export function batfangParts(): Record<string, PartCanvas> {
  const p = BATFANG;
  return {
    thigh: beastThigh(p, 0.8),
    shin: beastShin(p, 'paw', 0.82),
    torso: torso(p),
    upper: beastUpper(p, 0.72),
    fore: beastFore(p, 'paw', 0.76),
    head: head(p),
    weapon: hooks(p, 7),
  };
}
