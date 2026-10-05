// Egzo-bot: pierwsza ewolucja Bota, walczy wręcz. Maszyna bez twarzy: stożkowy hełm z wąską
// szczeliną i wyszczerbioną zębatką na czubku, zamiast piersi pusta klatka ze stężeniem na krzyż
// i grzebieniami chłodnicy po bokach, niżej blaszany klosz z zębami piły u dołu; w kleszczach
// tarcza piły (szkic autora: zębatka na stożku, klatka z krzyżem, klosz z piłą).
import { intersect, subtract, union } from '../../raster.ts';
import { type Palette, type PartCanvas, type Point, partCanvas, RUST, STEEL } from '../kit.ts';
import {
  DARK_STEEL,
  HARD,
  metalFore,
  metalShin,
  metalThigh,
  metalUpper,
  rivet,
} from '../limbs-robots.ts';
import { AMBER, BRASS, PAINT, plate, robot, rustStreak, SOOT_BLACK, visor } from './palette.ts';

export const EGZO_BOT: Palette = robot(PAINT, AMBER);

function head(p: Palette): PartCanvas {
  const c = partCanvas(-11, -28, 13, 5, 1);
  // Zębatka na czubku: osiem zębów, jeden ułamany.
  const cx = 1.4;
  const cy = -19.4;
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    const reach = degrees === 315 ? 3.6 : 5.8;
    return c.line(cx, cy, cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach, 1.1);
  });
  const cog = c.form(subtract(union(c.dot(cx, cy, 3.9), ...teeth), c.dot(cx, cy, 1.3)), BRASS, {
    rag: 0.15,
    shadow: 0.7,
    rim: 0.4,
  });
  c.patches(cog, BRASS.shade, 0.3, 2, 0.9);
  // Stożkowy hełm.
  const cone = c.poly([
    [-6.6, 1],
    [7.4, 1],
    [2.4, -14.6],
    [0.4, -14.6],
  ]);
  const inside = plate(c, cone, p, 0.3);
  visor(c, inside, [-0.6, -4], [6.4, -4], 0.9, p.glow);
  rustStreak(c, inside, 1.4, -3, 3.4);
  rivet(c, -2.6, -1);
  // Kryza u podstawy hełmu.
  plate(c, c.box(0.4, 1.6, 8, 1.4, 0.6), DARK_STEEL, 0.4);
  return c.finish();
}

function torso(p: Palette): PartCanvas {
  const c = partCanvas(-14, -26, 14, 12, 2);
  // Klosz z zębami piły u dołu.
  const bell = c.poly([
    [-5.4, -8.6],
    [5.4, -8.6],
    [9.8, 4.6],
    [8, 9.6],
    [6, 5],
    [4, 9.8],
    [2, 5],
    [0, 9.8],
    [-2, 5],
    [-4, 9.8],
    [-6, 5],
    [-8, 9.6],
    [-9.8, 4.6],
  ]);
  const bellInside = plate(c, bell, p, 0.32);
  c.fill(intersect(bellInside, c.line(-10, 3.4, 10, 3.4, 0.3)), p.dark, 0.85);
  // Wielkie śruby po bokach klosza.
  for (const x of [-6.2, 6.2]) {
    c.form(c.oval(x, -2.2, 1.5, 2.1), DARK_STEEL, HARD);
    rustStreak(c, bellInside, x, -0.4, 3.6);
  }
  // Klatka: w środku ciemno, tylko żar gdzieś w głębi.
  const cage = c.box(0, -15.6, 7, 7.4, 0.8);
  c.fill(cage, SOOT_BLACK);
  c.fill(intersect(cage, c.dot(-1, -14, 3.4)), p.glow, 0.14);
  c.fill(intersect(cage, c.dot(-1, -14, 1.1)), p.glow, 0.7);
  const bars: readonly (readonly [Point, Point])[] = [
    [
      [-6.4, -22.4],
      [6.4, -8.8],
    ],
    [
      [6.4, -22.4],
      [-6.4, -8.8],
    ],
  ];
  // Grzebienie chłodnicy sterczą z ramy na boki.
  const combs = [-20.4, -16.8, -13.2, -9.8].flatMap((y) => [
    c.line(-6.6, y, -11, y, 0.9),
    c.line(6.6, y, 11, y, 0.9),
  ]);
  const frame = union(
    subtract(c.box(0, -15.6, 7.6, 8, 1), c.box(0, -15.6, 5.8, 6.2, 0.4)),
    ...bars.map(([from, to]) => c.line(from[0], from[1], to[0], to[1], 0.8)),
    ...combs,
  );
  const steel = c.form(frame, STEEL, HARD);
  c.patches(steel, RUST, 0.3, 2.2, 0.95);
  rivet(c, 0, -15.6);
  return c.finish();
}

/** Tarcza piły na krótkim wysięgniku: wyszczerbiona, zardzewiała przy osi. */
function saw(): PartCanvas {
  const c = partCanvas(-9, -4, 9, 26, 3);
  c.form(c.line(0, -2, 0, 10, 1.1), STEEL, HARD);
  const cy = 16.4;
  const points: Point[] = [];
  const TEETH = 12;
  for (let i = 0; i < TEETH; i++) {
    const a = (i / TEETH) * Math.PI * 2;
    const b = ((i + 0.55) / TEETH) * Math.PI * 2;
    // Dwa zęby wyłamane.
    const tip = i === 3 || i === 8 ? 6 : 8;
    points.push([Math.cos(a) * tip, cy + Math.sin(a) * tip]);
    points.push([Math.cos(b) * 5.6, cy + Math.sin(b) * 5.6]);
  }
  const disc = c.form(
    c.poly(points),
    { ...STEEL, main: STEEL.light, light: '#d5dade' },
    {
      rag: 0.12,
      shadow: 0.8,
    },
  );
  c.patches(disc, RUST, 0.34, 2.2, 0.95);
  c.form(c.dot(0, cy, 2.2), DARK_STEEL, HARD);
  c.fill(c.dot(0, cy, 0.7), STEEL.light);
  return c.finish();
}

export function egzoBotParts(): Record<string, PartCanvas> {
  const p = EGZO_BOT;
  return {
    thigh: metalThigh(p),
    shin: metalShin(p, 'pad'),
    torso: torso(p),
    upper: metalUpper(p),
    fore: metalFore(p, 'clamp'),
    head: head(p),
    weapon: saw(),
  };
}
