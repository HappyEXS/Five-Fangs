// Holo-bot: pierwsza ewolucja Bota, strzelec, który nie rusza się z miejsca. Stary ekran na
// stojaku: pęknięte szkło, po którym pełzną fale zakłóceń, w rogu mosiężne pokrętło, a pośrodku
// to, czym patrzy: holograficzne oko, obręcz światła z ciemną źrenicą (szkic autora: szeroki
// ekran z falami i pokrętłem na dwóch nóżkach).
//
// Na szkielecie ludzi ekranem jest „głowa” (wisi pod stawem szyi), tułów to stojak z kablami,
// ramię to oko hologramu (przy strzale obraca się jak przysłona), a przedramię jego iskra.
import { intersect, subtract, union } from '../../raster.ts';
import { type Palette, type PartCanvas, partCanvas, STEEL } from '../kit.ts';
import { HARD, metalShin, metalThigh, rivet } from '../limbs-robots.ts';
import { BRASS, CYAN, PAINT_DARK, plate, robot, rustStreak, SOOT_BLACK } from './palette.ts';

export const HOLO_BOT: Palette = robot(PAINT_DARK, CYAN);

const GLASS = '#0b2226';
/** Środek ekranu w układzie szyi i połowy jego wymiarów. */
const CX = 1;
const CY = 4;
const HW = 15;
const HH = 10.5;

function head(p: Palette): PartCanvas {
  const c = partCanvas(-18, -15, 20, 18, 1);
  // Anteny na rogach: jedna złamana.
  c.fill(
    c.path(
      [
        [-11, -6],
        [-13.6, -11.4],
        [-12, -13.4],
      ],
      0.4,
    ),
    STEEL.dark,
  );
  c.fill(
    c.path(
      [
        [13, -6],
        [15.4, -10.6],
      ],
      0.4,
    ),
    STEEL.dark,
  );
  // Obudowa.
  const bezel = plate(c, c.box(CX, CY, HW, HH, 1.6), p, 0.3);
  rustStreak(c, bezel, -11, -5, 4);
  // Szkło: ciemne, z poświatą od środka.
  const glass = c.box(CX - 0.4, CY - 0.6, HW - 2.6, HH - 3, 0.8);
  c.fill(glass, SOOT_BLACK);
  c.fill(c.box(CX - 0.4, CY - 0.6, HW - 3.1, HH - 3.5, 0.6), GLASS);
  c.fill(intersect(glass, c.oval(CX + 1, CY - 0.6, 8, 6)), p.glow, 0.1);
  // Fale zakłóceń: trzy nierówne linie, środkowa szarpnięta jak zapis sejsmografu.
  for (const [y, alpha, kick] of [
    [-3.6, 0.5, 0],
    [0.4, 0.8, 3.2],
    [5.6, 0.45, 0],
  ] as const) {
    const points: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const x = CX - 12.4 + i * 2;
      const wave = Math.sin(i * 1.7 + y) * 0.7;
      const spike = i === 8 ? -kick : i === 9 ? kick * 0.7 : 0;
      points.push([x, y + wave + spike]);
    }
    c.fill(intersect(glass, c.path(points, 0.3)), p.glow, alpha);
  }
  // Pęknięcie od rogu i wybity odłamek.
  c.fill(
    intersect(
      glass,
      c.poly([
        [-11.6, -4.2],
        [-7.4, -4.2],
        [-11.6, -0.6],
      ]),
    ),
    SOOT_BLACK,
  );
  for (const crack of [
    [
      [-9.6, -2.6],
      [-6, 0.6],
      [-6.6, 3.4],
      [-3.6, 6.6],
    ],
    [
      [-6, 0.6],
      [-2.6, -0.8],
    ],
  ] as const) {
    c.fill(intersect(glass, c.path(crack, 0.18)), '#c5cbd1', 0.5);
  }
  // Pokrętło w rogu obudowy.
  const knob = c.form(c.dot(13.2, 11.6, 2.9), BRASS, { rag: 0.15, shadow: 0.7, rim: 0.4 });
  c.fill(intersect(knob, c.line(13.2, 11.6, 14.6, 9.8, 0.36)), BRASS.dark);
  rivet(c, -12, 12.6);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-10, -16, 10, 5, 2);
  // Zwisające kable.
  c.fill(c.arc([-2, -12], [-8.6, -6], [-3, 0], 0.5, 0.5), SOOT_BLACK);
  c.fill(c.arc([2, -12], [7.6, -4], [2.6, 0.4], 0.5, 0.5), SOOT_BLACK);
  // Kolumna stojaka i podstawa.
  c.form(c.line(0, -13, 0, -1, 1.9), STEEL, HARD);
  for (const y of [-9.6, -6, -2.4]) c.fill(c.line(-1.7, y, 1.7, y, 0.26), STEEL.dark);
  plate(c, c.box(0, 0.6, 5.4, 2.4, 1), p, 0.35);
  rivet(c, -3, 0.6);
  rivet(c, 3, 0.6);
  return c.finish();
}

/**
 * Oko hologramu: obręcz światła z przerwą i ciemna źrenica. Bark leży prawie w środku ekranu,
 * więc gdy ramię obraca się przy strzale, przerwa w obręczy krąży jak przysłona.
 */
function holoEye(p: Palette): PartCanvas {
  const c = partCanvas(-7, -6, 7, 8, 3);
  const cy = 1;
  c.fill(c.dot(0, cy, 6), p.glow, 0.12);
  const ring = subtract(
    c.dot(0, cy, 4.6),
    union(
      c.dot(0, cy, 3.3),
      c.poly([
        [0, cy],
        [7, cy - 5.4],
        [7, cy - 1.4],
      ]),
    ),
  );
  c.fill(ring, p.glow, 0.9);
  c.fill(c.dot(0.5, cy, 1.9), p.glow, 0.35);
  c.fill(c.oval(0.7, cy, 0.7, 1.5), '#e9fdff');
  return c;
}

/** Iskra krążąca wokół oka (przedramię szkieletu) i piksel, który od niej odpada (broń). */
function spark(p: Palette): PartCanvas {
  const c = partCanvas(-3, -3, 3, 3, 4);
  c.fill(c.dot(0, 0, 2.2), p.glow, 0.2);
  c.fill(
    c.poly([
      [0, -1.9],
      [1.2, 0],
      [0, 1.9],
      [-1.2, 0],
    ]),
    p.glow,
    0.9,
  );
  return c;
}

function pixel(p: Palette): PartCanvas {
  const c = partCanvas(-2, -2, 2, 2, 5);
  c.fill(c.box(0, 0, 0.8, 0.8, 0), p.glow);
  return c;
}

export function holoBotParts(): Record<string, PartCanvas> {
  const p = HOLO_BOT;
  return {
    thigh: metalThigh(p, 0.75),
    shin: metalShin(p, 'pad', 0.85),
    torso: torso(p),
    upper: holoEye(p),
    fore: spark(p),
    head: head(p),
    weapon: pixel(p),
  };
}
