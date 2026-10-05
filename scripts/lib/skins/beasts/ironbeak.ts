// Ironbeak: druga ewolucja Batfanga, szybki i odrzucający. Sępowaty ptak o nagiej, pomarszczonej
// szyi z kryzą piór u nasady i ogromnym, zakrzywionym dziobem z nitowanego, zardzewiałego żelaza;
// za grzbietem sterczą przerzedzone pióra (szkic autora).
import { intersect, union } from '../../raster.ts';
import { BONE_SHADE, type Palette, type PartCanvas, partCanvas, RAG_HARD } from '../kit.ts';
import { claws, fleshFore, fleshShin, fleshThigh, fleshUpper } from '../limbs.ts';

export const IRONBEAK: Palette = {
  main: '#5a3f27',
  shade: '#30200f',
  light: '#876a46',
  dark: '#130b05',
  accent: '#8f6c2a',
  glow: '#e8b62e',
};

const IRON = { main: '#6c747c', shade: '#3c434a', dark: '#14181c', light: '#a9b2ba' };
const RUST = '#7a4526';
const PLUME: Palette = {
  main: '#3a2413',
  shade: '#1f1208',
  light: '#5a3f27',
  dark: '#100804',
  accent: '#3a2413',
  glow: '#e8b62e',
};
/** Naga skóra szyi. */
const SKIN = { main: '#8a6a58', shade: '#55392e', dark: '#130b05', light: '#a98b78' };

function head(p: Palette): PartCanvas {
  const c = partCanvas(-14, -50, 30, 7, 1);
  // Przerzedzony czub z piór na potylicy; jedno złamane.
  c.form(
    union(
      c.horn(1, -32, -9, -42.5, 2.1, 0.3),
      c.horn(0, -29.5, -8, -32.5, 2.1, 0.9),
      c.horn(2.5, -34, -1.5, -47.5, 2.1, 0.3),
    ),
    PLUME,
  );
  // Długa, naga szyja z fałdami skóry.
  const neck = c.horn(0, 0, 3.4, -24, 4.2, 3);
  const neckInside = c.form(neck, SKIN, { rag: 0.4 });
  for (const y of [-6, -10.5, -15, -19.5]) {
    c.fill(intersect(neckInside, c.line(-3, y, 6, y - 0.9, 0.3)), SKIN.shade);
  }
  // Kryza z piór u nasady szyi.
  c.form(
    union(
      c.horn(-1, -1, -6.5, 2.5, 2.6, 0.3),
      c.horn(0, -0.5, -1.5, 4.5, 2.6, 0.3),
      c.horn(1, -1, 5.5, 3.5, 2.6, 0.3),
      c.horn(-1.5, -2, -7, -3.5, 2.2, 0.3),
      c.horn(2, -2, 7, -1.5, 2.2, 0.3),
    ),
    { main: p.light, shade: p.main, dark: p.dark, light: p.light },
  );
  c.form(c.oval(5.2, -28.8, 7.2, 6.8), p);
  // Dolna szczęka i górna część dzioba: hak z nitowanego żelaza, zżarty rdzą.
  c.form(
    c.horn(9.5, -24.6, 18.8, -21, 2.4, 0.7),
    { ...IRON, main: IRON.shade },
    { rag: RAG_HARD, shadow: 0 },
  );
  const hook = c.arc([9.5, -29.6], [26.5, -33], [23.4, -11.5], 5.4, 0.45);
  const hookInside = c.form(hook, IRON, { rag: RAG_HARD, rim: 0.7 });
  c.patches(hookInside, RUST, 0.38, 2.6, 0.95);
  // Obręcz u nasady dzioba, nity i pęknięcie.
  c.fill(c.line(9.8, -34.4, 9.8, -24.2, 1.2), IRON.dark);
  for (const [x, y] of [
    [13.4, -30.6],
    [16.8, -29.4],
    [19.6, -27],
    [14.4, -27.2],
  ] as const) {
    c.fill(c.dot(x, y, 0.8), IRON.dark);
    c.fill(c.dot(x - 0.2, y - 0.2, 0.4), IRON.light);
  }
  c.fill(
    c.path(
      [
        [21.5, -31],
        [22.6, -28.4],
        [21.6, -26.4],
        [23, -24],
      ],
      0.22,
    ),
    IRON.dark,
  );
  // Okrągłe, nieruchome oko w ciemnej obwódce.
  c.eye(4.6, -30.4, 2.5, p, 0);
  c.fill(c.horn(1, -34.4, 8, -33, 1.1, 0.6), p.dark);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-30, -45, 14, 7, 2);
  // Sterczące pióra ogona, postrzępione i przerzedzone.
  for (const [x, y, broken] of [
    [-13.5, -41, false],
    [-21.5, -33, true],
    [-26.5, -21, false],
    [-24, -9, false],
  ] as const) {
    const tx = broken ? -5 + (x + 5) * 0.6 : x;
    const ty = broken ? -6 + (y + 6) * 0.6 : y;
    c.form(c.horn(-5, -6, tx, ty, 3, broken ? 1.6 : 0.8), PLUME);
    c.fill(c.line(-5, -6, tx, ty, 0.28), PLUME.dark, 0.7);
  }
  const body = c.oval(0.5, -12, 8.8, 13.4);
  const inside = c.form(
    union(body, c.horn(-6, -20, -10.5, -22, 2.2, 0.3), c.horn(-7.5, -5, -11, -1, 2.2, 0.3)),
    p,
  );
  c.patches(intersect(inside, c.oval(5, -12, 4.8, 10.5)), p.light, 0.5, 3, 0.85);
  // Łuski piór na piersi i wyskubane, gołe miejsce.
  for (const y of [-17, -12, -7]) {
    c.fill(intersect(inside, c.arc([2.4, y], [5, y + 2.6], [7.8, y], 0.32, 0.32)), p.shade);
  }
  c.patches(intersect(inside, c.dot(-2, -9, 4.5)), SKIN.main, 0.5, 2.4, 0.9);
  return c.finish();
}

export function ironbeakParts(): Record<string, PartCanvas> {
  const p = IRONBEAK;
  return {
    thigh: fleshThigh(p, 1.12),
    shin: fleshShin({ ...p, light: BONE_SHADE }, 'talon'),
    torso: torso(p),
    upper: fleshUpper(PLUME, 1.02),
    fore: fleshFore(PLUME, 'wing'),
    head: head(p),
    weapon: claws(PLUME, 4.5),
  };
}
