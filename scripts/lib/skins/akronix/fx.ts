// Pociski Akronixów (lecą w prawo, pivot w środku, jak strzała) i znaczki efektów nad paskiem
// życia: krwawienie i trucizna (ADR 0021).
import { PIXELS_PER_UNIT } from '../../part-spec.ts';
import { inset, intersect, union } from '../../raster.ts';
import { type PartCanvas, partCanvas, STEEL } from '../kit.ts';
import { BAND, VENOM, WOOD } from './palette.ts';

const INK = '#0a0708';
/** Atrament i kolory interfejsu (ADR 0015): znaczki stoją obok paska życia. */
const UI_INK = '#241f3d';
const UI_RED = '#c9463d';

/** Strzała Bowixa: ciemne drzewce, stalowy grot, czerwone lotki. */
function barb(): PartCanvas {
  const c = partCanvas(-12, -4, 12, 4);
  c.fill(c.line(-8.6, 0, 7, 0, 0.6), INK);
  c.fill(c.line(-8.4, 0, 7, 0, 0.3), WOOD.light);
  c.ink(
    c.poly([
      [6, -1.7],
      [10.6, 0],
      [6, 1.7],
    ]),
    STEEL.light,
    INK,
  );
  c.ink(
    union(c.horn(-6, 0, -10, -2.2, 0.9, 0.3), c.horn(-6, 0, -10, 2.2, 0.9, 0.3)),
    BAND.light,
    INK,
  );
  return c;
}

/** Strzałka z rękawicy Assasinixa: krótki stalowy trójkąt ze smugą. */
function dart(): PartCanvas {
  const c = partCanvas(-10, -4, 8, 4);
  c.fill(c.horn(-8.6, 0, -1, 0, 0.25, 1.1), '#ffffff', 0.3);
  c.ink(
    c.poly([
      [-2.4, -2.2],
      [6.4, 0],
      [-2.4, 2.2],
      [-0.6, 0],
    ]),
    STEEL.light,
    INK,
  );
  return c;
}

/** Kolba Poisonixa w locie: szyjką do tyłu, za nią smuga jadu. */
function flask(): PartCanvas {
  const c = partCanvas(-13, -6, 8, 6);
  c.fill(c.horn(-11.4, 0.6, -3, 0, 0.3, 1.6), VENOM, 0.35);
  c.ink(union(c.dot(2.4, 0, 3.7), c.box(-2.2, 0, 1.8, 1.2, 0.3)), STEEL.light, INK);
  c.fill(intersect(c.dot(2.4, 0, 2.7), c.box(3.2, 1.2, 3.6, 2, 0)), VENOM);
  c.fill(c.dot(1.4, -1.2, 0.7), '#ffffff', 0.7);
  return c;
}

/** Kropla: znaczek efektu obok paska życia, z atramentową obwódką jak cyfry życia. */
function drop(color: string, shine: string): PartCanvas {
  const c = partCanvas(-5, -6, 5, 6);
  const shape = union(c.dot(0, 1.4, 2.6), c.horn(0, 1, 0, -3.6, 1.9, 0.25));
  c.fill(inset(shape, -0.8 * PIXELS_PER_UNIT), UI_INK);
  c.fill(shape, color);
  c.fill(c.dot(-0.9, 1.9, 0.75), shine, 0.85);
  return c;
}

export function akronixFx(): Record<string, PartCanvas> {
  return {
    barb: barb(),
    dart: dart(),
    flask: flask(),
    bleed: drop(UI_RED, '#f2b0a8'),
    poison: drop(VENOM, '#eef8c2'),
  };
}
