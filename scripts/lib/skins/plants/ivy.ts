// Ivy: pierwsza ewolucja Busha, strzelec, który nie rusza się z miejsca. Cierniste pnącze
// wzniesione jak kobra: łeb to zamknięty pąk o wężowym pysku z postrzępionymi liśćmi zamiast
// uszu, po bokach zwisają dwa mięsożerne kwiaty na kolczastych łodygach (szkic autora:
// kolczasta wić z głową i dwa tulipany po bokach).
import { intersect, union } from '../../raster.ts';
import { BONE_SHADE, MAW, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { thornShin, thornThigh, vineFore, vineUpper } from '../limbs-plants.ts';
import { BARK, LEAF, leaf, plant, ROT, VINE } from './palette.ts';

export const IVY: Palette = plant(VINE);
const ROOT: Palette = plant({ ...BARK, main: BARK.shade, shade: '#1a140d', light: BARK.main });

function head(p: Palette): PartCanvas {
  const c = partCanvas(-12, -26, 16, 6, 1);
  leaf(c, [-1, -12], [-7.6, -22.6], 2.6, LEAF);
  leaf(c, [2.4, -13], [4.6, -24], 2.6, LEAF);
  // Pąk z wydłużonym, wężowym pyskiem.
  const bud = union(c.oval(2.2, -7, 6.4, 7.2), c.horn(4, -5.2, 12, -3.4, 4.2, 1.3));
  const inside = c.form(bud, p, { rag: 0.4 });
  c.patches(inside, p.shade, 0.25, 2.6, 0.85);
  // Szew pyska: zaciśnięty, z cierniami zamiast zębów.
  const seam = intersect(inside, c.horn(5.4, -3.4, 12.6, -3, 1, 0.6));
  c.fill(seam, MAW);
  for (const x of [6.4, 8.2, 10, 11.6]) {
    c.fill(intersect(seam, c.horn(x, -4.4, x + 0.2, -2.6, 0.5, 0.1)), BONE_SHADE);
  }
  c.eye(4.6, -8.8, 1.9, p, 1.1);
  c.fill(c.horn(1.4, -12, 8, -10.6, 1, 0.5), p.dark);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-14, -27, 14, 29, 2);
  // Korzenie rozchodzą się przy ziemi.
  c.form(
    union(
      c.horn(-2, 23, -10, 25.6, 1.8, 0.4),
      c.horn(-2, 23, 6.4, 25.8, 1.8, 0.4),
      c.horn(-2, 23, -4, 26.4, 1.4, 0.4),
    ),
    ROOT,
    { rag: 0.4 },
  );
  // Łodyga w kształcie litery S, od ziemi do szyi, najeżona cierniami.
  const stem = union(
    c.arc([-2, 24.5], [9.5, 15], [-2.5, 3], 3.6, 3.2),
    c.arc([-2.5, 3], [-9.5, -8], [0, -23], 3.2, 2.6),
    c.horn(4.8, 16, 9.4, 13.6, 1.3, 0.1),
    c.horn(2.2, 9, 7, 8.2, 1.2, 0.1),
    c.horn(-5, 7.4, -9.6, 9.4, 1.2, 0.1),
    c.horn(-6, -2, -10.8, -0.6, 1.2, 0.1),
    c.horn(-5, -10.4, -9.8, -13, 1.2, 0.1),
    c.horn(-1.6, -17, 3, -19.4, 1.1, 0.1),
    c.horn(-1.4, 16.4, -6, 17.6, 1.1, 0.1),
  );
  const inside = c.form(stem, p, { rag: 0.35 });
  c.patches(inside, p.shade, 0.22, 2.4, 0.85);
  leaf(c, [1.4, 1], [8.6, -2.6], 2.2, LEAF);
  leaf(c, [-3.6, -13], [-10.4, -18.4], 2, LEAF);
  return c.finish();
}

/** Mięsożerny kwiat zwisający z łodygi: zgniłofioletowe płatki, w środku ciernie. */
function carnivorousBloom(c: PartCanvas): void {
  // Zwisający kielich o trzech spiczastych płatkach.
  const bell = union(
    c.oval(2, 13.8, 3.8, 4.2),
    c.horn(-0.4, 15, -2.2, 20.6, 1.7, 0.2),
    c.horn(2, 16, 2.4, 21.6, 1.7, 0.2),
    c.horn(4.4, 15, 6.4, 20.2, 1.7, 0.2),
  );
  const inside = c.form(bell, ROT, { rag: 0.4 });
  c.patches(inside, ROT.shade, 0.3, 2.2, 0.9);
  // Gardziel między płatkami, z cierniami.
  const throat = intersect(inside, c.oval(2.1, 17, 2.2, 1.5));
  c.fill(throat, MAW);
  for (const x of [0.8, 2.1, 3.4])
    c.fill(intersect(throat, c.horn(x, 15.4, x, 17.4, 0.45, 0.1)), BONE_SHADE);
  c.form(c.dot(2, 10.2, 2.1), VINE, { rag: 0.3, shadow: 0.6 });
}

function thorn(): PartCanvas {
  const c = partCanvas(-2, -2, 2, 6, 5);
  c.ink(c.horn(0, 0, 0, 4.2, 0.9, 0.15), BONE_SHADE, VINE.dark);
  return c.finish(0.5);
}

export function ivyParts(): Record<string, PartCanvas> {
  const p = IVY;
  return {
    thigh: thornThigh(p),
    shin: thornShin(p),
    torso: torso(p),
    upper: vineUpper(p),
    fore: vineFore(p, carnivorousBloom),
    head: head(p),
    weapon: thorn(),
  };
}
