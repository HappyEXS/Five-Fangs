// Grafiki placeholder części postaci (załącznik A briefu: rozmiary i pivoty w jednostkach rigu).
// Proste kształty w kolorach skórki, zapisywane jako źródła atlasu w assets/src/units/;
// docelowe grafiki zastąpią je w M6.
import {
  below,
  capsule,
  circle,
  createImage,
  fill,
  hex,
  type Image,
  inset,
  roundBox,
  type Shape,
  union,
} from './raster.ts';

/** Piksele atlasu na jednostkę rigu. Postać ma skalę ok. 1,4, więc to ponad 2× rozdzielczości logicznej. */
export const PIXELS_PER_UNIT = 3;

export interface PartSpec {
  /** Rozmiar w jednostkach rigu. */
  readonly width: number;
  readonly height: number;
  /** Punkt obrotu względem lewego górnego rogu, w jednostkach rigu. */
  readonly pivotX: number;
  readonly pivotY: number;
}

export const PARTS = {
  thigh: { width: 10, height: 16, pivotX: 5, pivotY: 3 },
  shin: { width: 12, height: 16, pivotX: 4.5, pivotY: 3 },
  torso: { width: 20, height: 28, pivotX: 10, pivotY: 26 },
  upper: { width: 8, height: 14, pivotX: 4, pivotY: 3 },
  fore: { width: 7, height: 15, pivotX: 3.5, pivotY: 3 },
  helm: { width: 22, height: 22, pivotX: 11, pivotY: 20 },
  hood: { width: 22, height: 22, pivotX: 11, pivotY: 20 },
  sword: { width: 8, height: 36, pivotX: 4, pivotY: 5 },
  bow: { width: 36, height: 11, pivotX: 18, pivotY: 9 },
  arrow: { width: 22, height: 5, pivotX: 11, pivotY: 2.5 },
} as const satisfies Record<string, PartSpec>;

export type PartName = keyof typeof PARTS;

export interface Palette {
  /** Kolor główny stroju lub zbroi. */
  readonly main: string;
  /** Obrys i cienie. */
  readonly dark: string;
  /** Detale: pas, pióropusz, obszycia. */
  readonly accent: string;
}

export interface Skin {
  readonly id: string;
  readonly palette: Palette;
  readonly head: 'helm' | 'hood';
  readonly weapon: 'sword' | 'bow';
}

export const SKINS: readonly Skin[] = [
  {
    id: 'swordsman_a',
    head: 'helm',
    weapon: 'sword',
    palette: { main: '#6d8fb5', dark: '#2a3a52', accent: '#d8dde6' },
  },
  {
    id: 'swordsman_b',
    head: 'helm',
    weapon: 'sword',
    palette: { main: '#c2a04b', dark: '#55431a', accent: '#f6efd6' },
  },
  {
    id: 'archer_a',
    head: 'hood',
    weapon: 'bow',
    palette: { main: '#5f9a62', dark: '#27452c', accent: '#d2b071' },
  },
  {
    id: 'archer_b',
    head: 'hood',
    weapon: 'bow',
    palette: { main: '#3f8483', dark: '#193a3a', accent: '#e8c76e' },
  },
  {
    id: 'brute',
    head: 'helm',
    weapon: 'sword',
    palette: { main: '#a85b49', dark: '#4a251d', accent: '#dccaa6' },
  },
];

const SKIN_TONE = '#e6bd98';
const STEEL = '#cfd6de';
const STEEL_DARK = '#5b6672';
const WOOD = '#8a5a34';
const WOOD_DARK = '#4a2e18';
/** Grubość obrysu w jednostkach rigu. */
const OUTLINE = 0.7;

const P = PIXELS_PER_UNIT;
const box = (cx: number, cy: number, hw: number, hh: number, r: number): Shape =>
  roundBox(cx * P, cy * P, hw * P, hh * P, r * P);
const dot = (cx: number, cy: number, r: number): Shape => circle(cx * P, cy * P, r * P);
const line = (ax: number, ay: number, bx: number, by: number, r: number): Shape =>
  capsule(ax * P, ay * P, bx * P, by * P, r * P);

function blank(part: PartSpec): Image {
  return createImage(part.width * P, part.height * P);
}

/** Wypełnia kształt kolorem obrysu, a jego wnętrze kolorem głównym. */
function outlined(image: Image, shape: Shape, main: string, dark: string): void {
  fill(image, shape, hex(dark));
  fill(image, inset(shape, OUTLINE * P), hex(main));
}

function limb(part: PartSpec, palette: Palette, cuff: boolean): Image {
  const image = blank(part);
  const { width: w, height: h } = part;
  const shape = box(w / 2, h / 2, w / 2 - 0.3, h / 2 - 0.3, Math.min(w, h) / 2 - 0.6);
  outlined(image, shape, palette.main, palette.dark);
  // Jaśniejszy pas wzdłuż kończyny daje wrażenie bryły.
  fill(image, line(w * 0.38, h * 0.25, w * 0.38, h * 0.7, w * 0.1), hex('#ffffff', 0.18));
  if (cuff) fill(image, below(inset(shape, OUTLINE * P), (h - 4) * P), hex(palette.accent, 0.9));
  return image;
}

function torso(palette: Palette): Image {
  const part = PARTS.torso;
  const image = blank(part);
  const shape = box(10, 14, 9.6, 13.6, 5);
  outlined(image, shape, palette.main, palette.dark);
  fill(image, line(6.5, 6, 6.5, 16, 1.6), hex('#ffffff', 0.16));
  // Pas.
  fill(image, below(inset(shape, OUTLINE * P), 20.5 * P), hex(palette.dark, 0.85));
  fill(image, below(inset(shape, OUTLINE * P), 23.5 * P), hex(palette.main));
  fill(image, box(12.5, 22, 1.4, 1.4, 0.5), hex(palette.accent));
  return image;
}

function helm(palette: Palette): Image {
  const image = blank(PARTS.helm);
  outlined(image, box(11, 12, 9.6, 9.6, 8), STEEL, STEEL_DARK);
  // Wizjer po stronie, w którą postać patrzy (w prawo).
  fill(image, box(15.5, 12.5, 5, 1.5, 1), hex('#1b1f27'));
  fill(image, line(7, 6, 13, 5, 1), hex('#ffffff', 0.35));
  // Pióropusz w kolorze skórki.
  fill(image, line(7, 2.6, 15, 2.2, 1.6), hex(palette.dark));
  fill(image, line(7, 2.6, 15, 2.2, 1), hex(palette.main));
  return image;
}

function hood(palette: Palette): Image {
  const image = blank(PARTS.hood);
  outlined(image, box(11, 12, 9.8, 9.8, 9), palette.main, palette.dark);
  // Twarz w wycięciu kaptura, zwrócona w prawo.
  fill(image, dot(14, 13, 5.6), hex(palette.dark));
  fill(image, dot(14.4, 13.2, 4.8), hex(SKIN_TONE));
  fill(image, dot(16.4, 12.4, 0.8), hex('#1b1f27'));
  fill(image, line(4, 6, 12, 3.4, 0.9), hex(palette.accent, 0.8));
  return image;
}

function sword(palette: Palette): Image {
  const image = blank(PARTS.sword);
  // Klinga biegnie w dół od jelca; pivot jest na rękojeści.
  fill(image, line(4, 10, 4, 34, 1.9), hex(STEEL_DARK));
  fill(image, line(4, 10, 4, 33.6, 1.25), hex(STEEL));
  fill(image, line(3.6, 12, 3.6, 30, 0.35), hex('#ffffff', 0.5));
  fill(image, line(4, 1.6, 4, 8, 1.4), hex(WOOD_DARK));
  fill(image, line(4, 2, 4, 8, 0.8), hex(WOOD));
  fill(image, dot(4, 1.8, 1.5), hex(palette.accent));
  fill(image, line(0.9, 8.6, 7.1, 8.6, 1.1), hex(palette.dark));
  fill(image, line(1.2, 8.6, 6.8, 8.6, 0.55), hex(palette.accent));
  return image;
}

function bow(palette: Palette): Image {
  const image = blank(PARTS.bow);
  // Łęczysko: krzywa od końca (1,5; 1,5) przez brzusiec przy pivocie do (34,5; 1,5).
  // Końce odpowiadają punktom zaczepienia cięciwy z załącznika A.
  const segments: Shape[] = [];
  const inner: Shape[] = [];
  const point = (t: number): [number, number] => {
    const u = 1 - t;
    return [
      u * u * 1.5 + 2 * u * t * 18 + t * t * 34.5,
      u * u * 1.5 + 2 * u * t * 17 + t * t * 1.5,
    ];
  };
  const STEPS = 14;
  for (let i = 0; i < STEPS; i++) {
    const [ax, ay] = point(i / STEPS);
    const [bx, by] = point((i + 1) / STEPS);
    segments.push(line(ax, ay, bx, by, 1.25));
    inner.push(line(ax, ay, bx, by, 0.65));
  }
  fill(image, union(...segments), hex(WOOD_DARK));
  fill(image, union(...inner), hex(WOOD));
  // Owijka na majdanie.
  fill(image, line(16, 9, 20, 9, 1.3), hex(palette.dark));
  fill(image, line(16.4, 9, 19.6, 9, 0.7), hex(palette.accent));
  return image;
}

function arrow(): Image {
  const image = blank(PARTS.arrow);
  // Leci w prawo: lotki z lewej, grot z prawej.
  fill(image, line(2, 2.5, 19, 2.5, 0.55), hex(WOOD));
  fill(image, line(1.2, 1.2, 4.2, 2.5, 0.5), hex('#e9e2cf'));
  fill(image, line(1.2, 3.8, 4.2, 2.5, 0.5), hex('#e9e2cf'));
  fill(image, line(17.6, 2.5, 20.6, 2.5, 1.15), hex(STEEL_DARK));
  fill(image, line(18, 2.5, 20.4, 2.5, 0.65), hex(STEEL));
  return image;
}

/** Cyfry i plus dla liczb obrażeń i leczenia: font 5×7, wiersze od góry. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  plus: ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
};

/** Znak: komórka fontu to 1 jednostka rigu, plus margines 1 na obrys. */
export const GLYPH: PartSpec = { width: 7, height: 9, pivotX: 3.5, pivotY: 4.5 };

function glyph(rows: readonly string[], color: string, outline: string): Image {
  const image = blank(GLYPH);
  const cells: Shape[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '1') cells.push(box(1.5 + x, 1.5 + y, 0.5, 0.5, 0.12));
    }
  });
  const shape = union(...cells);
  fill(image, inset(shape, -0.75 * P), hex(outline));
  fill(image, shape, hex(color));
  return image;
}

/** Zestawy znaków: `fx/<zestaw>_<znak>`. */
const GLYPH_SETS = [
  { id: 'dmg', color: '#fff1c2', outline: '#3d1d10' },
  { id: 'heal', color: '#a6f08f', outline: '#12381a' },
] as const;

export interface PlaceholderSprite {
  /** Nazwa w atlasie: `<skórka>/<kość lub slot>` albo `fx/<nazwa>`. */
  readonly name: string;
  readonly part: PartSpec;
  readonly image: Image;
}

/** Manifest źródeł atlasu (assets/src/units/atlas.json) dla sprite'ów placeholder. */
export function placeholderManifest(sprites: readonly PlaceholderSprite[]) {
  const pivots: Record<string, [number, number]> = {};
  for (const sprite of [...sprites].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    pivots[sprite.name] = [sprite.part.pivotX, sprite.part.pivotY];
  }
  return { generator: 'placeholder' as const, pixelsPerUnit: PIXELS_PER_UNIT, pivots };
}

/** Wszystkie sprite'y placeholder w stałej kolejności. */
export function placeholderSprites(): PlaceholderSprite[] {
  const sprites: PlaceholderSprite[] = [];
  for (const skin of SKINS) {
    const add = (slot: string, part: PartSpec, image: Image): void => {
      sprites.push({ name: `${skin.id}/${slot}`, part, image });
    };
    add('thigh', PARTS.thigh, limb(PARTS.thigh, skin.palette, false));
    add('shin', PARTS.shin, limb(PARTS.shin, skin.palette, true));
    add('torso', PARTS.torso, torso(skin.palette));
    add('upper', PARTS.upper, limb(PARTS.upper, skin.palette, false));
    add('fore', PARTS.fore, limb(PARTS.fore, skin.palette, true));
    add('head', PARTS[skin.head], skin.head === 'helm' ? helm(skin.palette) : hood(skin.palette));
    add(
      'weapon',
      PARTS[skin.weapon],
      skin.weapon === 'sword' ? sword(skin.palette) : bow(skin.palette),
    );
  }
  sprites.push({ name: 'fx/arrow', part: PARTS.arrow, image: arrow() });
  for (const set of GLYPH_SETS) {
    for (const [name, rows] of Object.entries(GLYPHS)) {
      sprites.push({
        name: `fx/${set.id}_${name}`,
        part: GLYPH,
        image: glyph(rows, set.color, set.outline),
      });
    }
  }
  return sprites;
}
