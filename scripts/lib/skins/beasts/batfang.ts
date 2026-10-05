// Batfang: pierwsza ewolucja, strzelec. Wychudzony kocio-nietoperzy łeb o postrzępionych
// uszach i dwóch pożółkłych kłach, na grzbiecie podarte błoniaste skrzydło z pazurami na końcach
// palców (szkic autora).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE, BONE_SHADE, MAW, type Palette, type PartCanvas, partCanvas } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const BATFANG: Palette = {
  main: '#4c3932',
  shade: '#2a1e1a',
  light: '#73574b',
  dark: '#120b09',
  accent: '#5c2a33',
  glow: '#f08c2a',
};

function head(p: Palette): PartCanvas {
  const c = partCanvas(-18, -40, 20, 8, 1);
  const membrane = { main: p.accent, shade: p.dark, dark: p.dark, light: p.light };
  // Dalsze ucho: sama podarta błona.
  c.form(
    subtract(
      c.poly([
        [-8, -14],
        [-12, -34],
        [0, -18],
      ]),
      c.dot(-10.5, -25, 2.2),
    ),
    membrane,
  );
  const skull = union(c.oval(0.5, -10.5, 10, 9.2), c.oval(9.5, -7.5, 5.2, 4.4));
  const inside = c.form(
    union(skull, c.horn(-7, -6, -12.5, -1, 2.3, 0.3), c.horn(-8, -12, -13, -11, 2, 0.3)),
    p,
  );
  c.patches(intersect(inside, c.oval(9, -5.5, 7, 4.5)), p.light, 0.5, 3, 0.8);
  // Bliższe ucho z wystrzępioną krawędzią i ciemnym wnętrzem.
  c.form(
    subtract(
      c.poly([
        [-2.5, -17],
        [1, -39],
        [9.5, -18],
      ]),
      union(c.dot(7.4, -26, 1.9), c.dot(-0.6, -29, 1.3)),
    ),
    p,
  );
  c.fill(
    c.poly([
      [1.2, -19.5],
      [2, -31.5],
      [6, -19.5],
    ]),
    p.accent,
  );
  // Pomarszczony nos i rozwarty pysk; dwa długie kły wystają poniżej szczęki.
  c.fill(c.dot(14.2, -9.4, 1.5), p.dark);
  c.fill(
    c.path(
      [
        [10, -10.5],
        [12.2, -11.4],
      ],
      0.3,
    ),
    p.dark,
  );
  c.fill(intersect(inside, c.oval(8.8, -4.2, 5.8, 2.1)), MAW);
  c.ink(c.horn(6, -5, 5.4, 3.4, 1.4, 0.2), BONE, p.dark);
  c.ink(c.horn(10.6, -5, 11, 2.2, 1.3, 0.2), BONE_SHADE, p.dark);
  c.eye(5, -13.2, 2.2, p, 1.2);
  c.fill(c.horn(1, -17, 9.4, -14.6, 1.3, 0.6), p.dark);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-35, -52, 12, 6, 2);
  // Skrzydło wyrasta z łopatki; błona między trzema palcami jest podarta i dziurawa.
  const root = [-3, -19] as const;
  const tips = [
    [-13, -46],
    [-27, -39],
    [-31, -24],
  ] as const;
  const membrane = subtract(
    c.poly([root, tips[0], tips[1], tips[2], [-7, -6]]),
    union(
      c.dot(-21.5, -46.5, 5.4),
      c.dot(-32.5, -32, 5.6),
      c.dot(-22, -11.5, 9.5),
      c.dot(-17, -32, 2.4),
      c.dot(-23.5, -26, 1.6),
      c.dot(-11, -25, 1.3),
    ),
  );
  c.form(
    membrane,
    { main: p.accent, shade: p.dark, dark: p.dark, light: p.light },
    { shadow: 0.7 },
  );
  for (const [x, y] of tips) {
    c.fill(c.horn(root[0], root[1], x, y, 1, 0.5), p.dark);
    c.fill(c.horn(root[0], root[1], x, y, 0.45, 0.2), BONE_SHADE);
    // Pazur na końcu palca.
    c.ink(c.horn(x, y, x - 1.4, y - 3.4, 1.1, 0.2), BONE, p.dark);
  }
  // Chudy ogon.
  c.form(c.arc([-5, -2], [-11.5, 0.5], [-14, -6.5], 1.6, 0.3), p);
  const body = c.oval(0, -11.5, 7.4, 13.2);
  const inside = c.form(body, p);
  c.patches(intersect(inside, c.oval(4, -9, 4, 9)), p.light, 0.45, 3, 0.8);
  // Żebra: wychudzony tułów.
  for (const y of [-16, -12.5, -9, -5.5]) {
    c.fill(intersect(inside, c.arc([0.4, y], [3.6, y + 1.9], [6.8, y - 0.2], 0.32, 0.32)), p.shade);
  }
  return c.finish();
}

export function batfangParts(): Record<string, PartCanvas> {
  const p = BATFANG;
  return {
    thigh: fleshThigh(p, 0.85),
    shin: fleshShin(p, 'paw', 0.85),
    torso: torso(p),
    upper: fleshUpper(p, 0.8),
    fore: fleshFore(p, 'paw', 0.8),
    head: head(p),
    weapon: claws(p, 6.5),
  };
}
