// Ironbeak: druga ewolucja Batfanga, szybki i odrzucający. Sęp-kat: na długiej, nagiej szyi
// z wystającymi kręgami siedzi łeb zakuty w żelazną maskę z ogromnym, hakowatym dziobem,
// nitowanym i zżartym rdzą; w otworze maski tli się jedno oko, nad nią sterczą trzy pióra,
// a u nasady szyi brudna kryza (szkic autora: wielki zakrzywiony dziób z nitami, długa szyja,
// wysoki czub).
import { intersect, subtract, union } from '../../raster.ts';
import { BONE_SHADE, type Palette, type PartCanvas, partCanvas, RAG_HARD, RUST } from '../kit.ts';
import { beastFore, beastShin, beastThigh, beastUpper, hooks } from '../limbs-beasts.ts';
import { beast, crack, emberEye, INK, strands, VOID } from './palette.ts';

/** Czarnobrunatne, wystrzępione pióra. */
const PLUME = { main: '#2f231c', shade: '#150e0a', light: '#503d2f', dark: INK };
/** Naga skóra szyi: sina, martwa. */
const SKIN = { main: '#6d5a52', shade: '#3a2c27', light: '#8d776c', dark: INK };
/** Żelazo maski i dzioba. */
const IRON = { main: '#5c636a', shade: '#30363c', light: '#929aa2', dark: '#0d1014' };
/** Brudna kryza. */
const RUFF = { main: '#857c69', shade: '#4a4436', light: '#a69c86', dark: INK };

export const IRONBEAK: Palette = beast(PLUME, '#5a4a36', '#ffb22e');

function rivet(c: PartCanvas, x: number, y: number): void {
  c.fill(c.dot(x, y, 0.85), IRON.dark);
  c.fill(c.dot(x - 0.2, y - 0.25, 0.4), IRON.light);
}

function head(p: Palette): PartCanvas {
  const c = partCanvas(-15, -58, 31, 10, 1);
  // Czub: trzy sztywne pióra jak ostrza, jedno złamane.
  for (const [x, y, tip] of [
    [-10.6, -37, 1.3],
    [-9, -47, 0.3],
    [-0.6, -55, 0.3],
  ] as const) {
    c.form(c.horn(2.6, -31, x, y, 2.3, tip), p);
    c.fill(c.line(2.2, -31.6, x * 0.9 + 0.3, y * 0.9 - 3, 0.26), INK, 0.6);
  }
  // Szyja: gruba u nasady, wygięta jak u sępa, z kręgami wystającymi na karku.
  for (const [x, y] of [
    [-4.6, -6.6],
    [-5.4, -12],
    [-4.4, -17.4],
    [-2, -22],
  ] as const) {
    c.ink(c.dot(x, y, 1.5), BONE_SHADE, INK);
  }
  const neck = c.arc([0, 0], [-5.6, -13], [3.4, -26.6], 4.8, 3.3);
  const neckInside = c.form(neck, SKIN, { rag: 0.35 });
  for (const [y, lean] of [
    [-4.6, -0.6],
    [-8.6, -1.2],
    [-12.6, -1.6],
    [-16.6, -1.2],
    [-20.4, -0.4],
  ] as const) {
    c.fill(intersect(neckInside, c.line(-8, y, 8, y + lean, 0.3)), SKIN.shade);
  }
  c.patches(neckInside, SKIN.shade, 0.16, 2.2, 0.7);
  // Kryza z brudnych piór u nasady szyi.
  c.form(
    strands(c, [
      [-1, -1, -7.6, 4.6, 2.8],
      [0, -0.4, -3, 7, 2.8],
      [0.6, -0.4, 2.6, 7.4, 2.8],
      [1, -1, 7.4, 5, 2.8],
      [-1.6, -2.4, -8.4, -1, 2.4],
      [2, -2.4, 8.6, -0.4, 2.4],
    ]),
    RUFF,
  );
  // Tył głowy w piórach.
  c.form(c.oval(3.4, -29.6, 5.6, 5.4), p);
  // Żuchwa: krótki żelazny hak pod dziobem.
  c.form(
    c.arc([9, -25.4], [15, -24], [16.6, -18.6], 2.2, 0.4),
    { ...IRON, main: IRON.shade, shade: IRON.dark },
    { rag: RAG_HARD, shadow: 0.4 },
  );
  // Dziób: ciężki hak, szerszy niż łeb, wyszczerbiony od spodu.
  const hook = subtract(
    intersect(
      subtract(c.dot(13, -21.6, 15.4), c.dot(8.6, -16.6, 13.4)),
      c.poly([
        [10.6, -40],
        [34, -40],
        [34, 0],
        [10.6, 0],
      ]),
    ),
    union(c.dot(23.4, -15.6, 1.3), c.dot(25.4, -19.6, 1.1)),
  );
  const hookInside = c.form(hook, IRON, { rag: RAG_HARD, rim: 0.6 });
  c.patches(hookInside, RUST, 0.42, 2.6, 0.95);
  c.patches(hookInside, IRON.dark, 0.1, 1.6, 0.8);
  crack(c, hookInside, [
    [22, -34.6],
    [23.4, -31.6],
    [22, -29.4],
    [23.6, -27],
  ]);
  for (const [x, y] of [
    [14.6, -34.6],
    [18.6, -33.6],
    [22.6, -30.6],
    [25.6, -26],
    [26.6, -21],
    [17, -30.6],
    [21.4, -26.6],
    [24.6, -16],
  ] as const) {
    rivet(c, x, y);
  }
  // Maska: żelazna płyta na czole i policzku, z otworem na oko.
  const mask = c.poly([
    [-1.6, -32.4],
    [4.6, -37.4],
    [12.6, -36.4],
    [13, -26.6],
    [8, -23.6],
    [0.6, -25],
  ]);
  const maskInside = c.form(mask, IRON, { rag: RAG_HARD, rim: 0.6 });
  c.patches(maskInside, RUST, 0.35, 2.4, 0.95);
  c.fill(intersect(maskInside, c.line(12.4, -37, 12.6, -26, 0.5)), IRON.dark);
  c.fill(c.dot(6.4, -30.6, 2.3), VOID);
  emberEye(c, 6.8, -30.4, 0.95, p.glow);
  for (const [x, y] of [
    [1.4, -31.6],
    [3, -26.4],
    [10, -34.6],
    [10.4, -26.6],
  ] as const) {
    rivet(c, x, y);
  }
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-34, -38, 15, 24, 2);
  // Pióra grzbietu i ogona: szerokie, podarte ostrza opadające za plecami, jedno złamane.
  for (const [ax, ay, bx, by, width, broken] of [
    [-6, -18, -21, -29, 3, false],
    [-7, -12, -29, -17, 3.4, false],
    [-7, -6, -30, -3, 3.6, true],
    [-6, -1, -27, 10, 3.6, false],
    [-4, 2, -17, 18, 3.4, false],
  ] as const) {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    const nx = (-dy / length) * width;
    const ny = (dx / length) * width;
    const reach = broken ? 0.62 : 1;
    const tip: [number, number] = [ax + dx * reach, ay + dy * reach];
    const feather = c.form(
      c.poly([
        [ax - nx * 0.5, ay - ny * 0.5],
        [ax + dx * 0.45 - nx, ay + dy * 0.45 - ny],
        ...(broken
          ? ([
              [tip[0] - nx * 0.8, tip[1] - ny * 0.8],
              [tip[0] + dx * 0.06, tip[1] + dy * 0.06],
              [tip[0] + nx * 0.7, tip[1] + ny * 0.7],
            ] as const)
          : ([tip] as const)),
        [ax + dx * 0.5 + nx * 0.8, ay + dy * 0.5 + ny * 0.8],
        [ax + nx * 0.5, ay + ny * 0.5],
      ]),
      p,
      { rag: 0.7 },
    );
    c.fill(intersect(feather, c.line(ax, ay, tip[0], tip[1], 0.3)), INK, 0.7);
    // Rozdarcia chorągiewki.
    for (const t of [0.4, 0.62, 0.8]) {
      if (t > reach - 0.1) continue;
      const x = ax + dx * t;
      const y = ay + dy * t;
      c.fill(intersect(feather, c.line(x, y, x + dx * 0.1 + nx, y + dy * 0.1 + ny, 0.24)), p.shade);
    }
  }
  // Zgarbiony korpus.
  const body = c.poly([
    [-9, -18],
    [-4, -24],
    [4, -23],
    [9, -17],
    [9.6, -8],
    [7, 0],
    [3.4, 5.4],
    [-5, 5.4],
    [-9.4, -2],
    [-11.6, -10],
  ]);
  const inside = c.form(
    union(
      body,
      strands(c, [
        [-1, 4.6, -1, 5.6, 1.8],
        [3, 4.6, 1.6, 5, 1.8],
      ]),
    ),
    p,
  );
  // Rzędy piór na piersi: ząbkowane linie.
  for (const y of [-16, -10.6, -5.2, 0.2]) {
    const points: [number, number][] = [];
    for (let i = 0; i <= 8; i++) points.push([-11 + i * 2.7, y + (i % 2 === 0 ? 0 : 2.4)]);
    c.fill(intersect(inside, c.path(points, 0.3)), p.shade);
  }
  c.patches(inside, p.light, 0.14, 2.4, 0.5);
  // Wyskubane, gołe miejsce ze szwem.
  const bald = intersect(inside, c.oval(-3.6, -9.6, 4.2, 3.6));
  c.fill(bald, SKIN.shade);
  c.patches(bald, SKIN.main, 0.5, 2, 0.9);
  c.scar([-6, -8], [-1.4, -11], INK, 2);
  return c.finish();
}

export function ironbeakParts(): Record<string, PartCanvas> {
  const p = IRONBEAK;
  return {
    thigh: beastThigh(p, 1.05),
    shin: beastShin(p, 'talon'),
    torso: torso(p),
    upper: beastUpper(p, 1, false),
    fore: beastFore(p, 'wing'),
    head: head(p),
    weapon: hooks(p, 4.5, 1),
  };
}
