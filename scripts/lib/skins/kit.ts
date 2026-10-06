// Przybory do rysowania części postaci czterech szczepów. Część rysuje się w układzie swojego
// stawu: punkt (0, 0) to pivot (np. szyja dla głowy, biodra dla tułowia), oś Y rośnie w dół,
// postać patrzy w prawo, a jednostką jest jednostka rigu. Rozmiar obrazka i pivot wynikają
// z podanego prostokąta, więc każda postać może mieć części innej wielkości niż ludzie na tym
// samym szkielecie.
//
// Styl „mroczna baśń” (decyzja autora gry z 2026-10-05, ADR 0019): przygaszone, brudne kolory,
// poszarpany atramentowy kontur, ciężki cień własny po stronie pleców i spodu, zacieki i plamy
// na każdej powierzchni, małe świecące oczy w ciemnych oczodołach. Bez połysku i bez krwi.
import { type PartSpec, PIXELS_PER_UNIT } from '../part-spec.ts';
import {
  blotches,
  capsule,
  circle,
  createImage,
  ellipse,
  fill,
  hex,
  type Image,
  inset,
  intersect,
  polygon,
  roughen,
  roundBox,
  type Shape,
  subtract,
  taper,
  translate,
  union,
  weather,
} from '../raster.ts';

const P = PIXELS_PER_UNIT;
/** Grubość obrysu w jednostkach rigu. */
export const OUTLINE = 0.85;
/** Poszarpanie konturu miękkich materiałów (sierść, tkanina, kora) i twardych (kość, metal). */
export const RAG_SOFT = 0.6;
export const RAG_HARD = 0.22;

export type Point = readonly [x: number, y: number];

/** Kolory postaci: jeden przygaszony kolor szczepu w trzech odcieniach i dwa akcenty. */
export interface Palette {
  /** Główny materiał: sierść, kora, blacha, szata. */
  readonly main: string;
  /** Cień własny formy: strona pleców i spód. */
  readonly shade: string;
  /** Wytarte, jaśniejsze miejsca: brzuch, pysk, krawędzie. */
  readonly light: string;
  /** Atrament konturu i najciemniejsze miejsca. */
  readonly dark: string;
  /** Drugi materiał: błona, grzywa, rdza, złoto. */
  readonly accent: string;
  /** Światło w oczach i żar. */
  readonly glow: string;
}

export interface FormOptions {
  /** Poszarpanie konturu w jednostkach rigu. */
  readonly rag?: number;
  /** Jak głęboko cień własny wchodzi w formę (1 = zwykle, 0 = bez cienia). */
  readonly shadow?: number;
  /** Jasna krawędź od strony światła (góra i przód), 0..1. */
  readonly rim?: number;
}

export interface PartCanvas {
  readonly image: Image;
  readonly part: PartSpec;
  dot(x: number, y: number, r: number): Shape;
  oval(x: number, y: number, rx: number, ry: number): Shape;
  box(x: number, y: number, halfWidth: number, halfHeight: number, r: number): Shape;
  line(ax: number, ay: number, bx: number, by: number, r: number): Shape;
  /** Odcinek zwężający się od promienia `ra` do `rb`: róg, kieł, pazur, kolec. */
  horn(ax: number, ay: number, bx: number, by: number, ra: number, rb: number): Shape;
  /** Łuk przez trzy punkty (krzywa Béziera 2. stopnia) o promieniu od `ra` do `rb`. */
  arc(from: Point, control: Point, to: Point, ra: number, rb: number): Shape;
  /** Łamana o stałej grubości: pęknięcie, szew, drut. */
  path(points: readonly Point[], r: number): Shape;
  poly(points: readonly Point[]): Shape;
  /** Ten sam kształt z poszarpaną krawędzią; `amount` i `grain` w jednostkach rigu. */
  ragged(shape: Shape, amount?: number, grain?: number): Shape;
  /** Kształt przesunięty o (dx, dy) jednostek rigu. */
  shift(shape: Shape, dx: number, dy: number): Shape;
  /** Wypełnia kształt kolorem; `alpha` < 1 daje cień albo poświatę. */
  fill(shape: Shape, color: string, alpha?: number): void;
  /** Mały twardy element (ząb, pazur, nit): atramentowy obrys i wnętrze, bez cienia. */
  ink(shape: Shape, main: string, dark: string): void;
  /**
   * Bryła: poszarpany atramentowy kontur, wnętrze w kolorze głównym i cień własny po stronie
   * pleców i spodu. Zwraca wnętrze, do którego przycina się dalsze szczegóły.
   */
  form(
    shape: Shape,
    palette: Pick<Palette, 'main' | 'shade' | 'dark' | 'light'>,
    options?: FormOptions,
  ): Shape;
  /** Nieregularne plamy koloru wewnątrz `clip`: rdza, pleśń, mech, przypalenia. */
  patches(clip: Shape, color: string, coverage: number, size: number, alpha?: number): void;
  /** Oko: ciemny oczodół i mały świecący punkt z poświatą. */
  eye(
    x: number,
    y: number,
    r: number,
    palette: Pick<Palette, 'dark' | 'glow'>,
    slant?: number,
  ): void;
  /** Blizna albo szew: ciemna kreska z poprzecznymi ściegami. */
  scar(from: Point, to: Point, color: string, stitches?: number): void;
  /** Postarza całą część: zacieki i drobny brud. Wołane na końcu rysowania. */
  finish(strength?: number): PartCanvas;
}

/** Prosty skrót granic do ziarna szumu, żeby każda część miała własny, ale stały kontur. */
function seedOf(left: number, top: number, right: number, bottom: number, salt: number): number {
  return (left * 73856093) ^ (top * 19349663) ^ (right * 83492791) ^ (bottom * 2971215073) ^ salt;
}

/**
 * Płótno części obejmujące prostokąt od (left, top) do (right, bottom) w układzie pivota.
 * Granice muszą być całkowite, żeby rozmiar obrazka w pikselach też był całkowity. `salt`
 * odróżnia szum części o tych samych granicach.
 */
export function partCanvas(
  left: number,
  top: number,
  right: number,
  bottom: number,
  salt = 0,
): PartCanvas {
  if (![left, top, right, bottom].every(Number.isInteger) || right <= left || bottom <= top) {
    throw new Error(
      `Part bounds must be integers with positive size: ${left} ${top} ${right} ${bottom}`,
    );
  }
  const part: PartSpec = {
    width: right - left,
    height: bottom - top,
    pivotX: -left,
    pivotY: -top,
  };
  const image = createImage(part.width * P, part.height * P);
  const px = (x: number): number => (x - left) * P;
  const py = (y: number): number => (y - top) * P;
  const baseSeed = seedOf(left, top, right, bottom, salt) | 0;
  let strokes = 0;
  const nextSeed = (): number => baseSeed + ++strokes * 7919;

  const canvas: PartCanvas = {
    image,
    part,
    dot: (x, y, r) => circle(px(x), py(y), r * P),
    oval: (x, y, rx, ry) => ellipse(px(x), py(y), rx * P, ry * P),
    box: (x, y, hw, hh, r) => roundBox(px(x), py(y), hw * P, hh * P, r * P),
    line: (ax, ay, bx, by, r) => capsule(px(ax), py(ay), px(bx), py(by), r * P),
    horn: (ax, ay, bx, by, ra, rb) => taper(px(ax), py(ay), px(bx), py(by), ra * P, rb * P),
    arc: (from, control, to, ra, rb) => {
      const STEPS = 10;
      const at = (t: number): Point => {
        const u = 1 - t;
        return [
          u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
          u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
        ];
      };
      const segments: Shape[] = [];
      for (let i = 0; i < STEPS; i++) {
        const a = at(i / STEPS);
        const b = at((i + 1) / STEPS);
        segments.push(
          canvas.horn(
            a[0],
            a[1],
            b[0],
            b[1],
            ra + ((rb - ra) * i) / STEPS,
            ra + ((rb - ra) * (i + 1)) / STEPS,
          ),
        );
      }
      return union(...segments);
    },
    path: (points, r) => {
      const segments: Shape[] = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (a !== undefined && b !== undefined) {
          segments.push(canvas.line(a[0], a[1], b[0], b[1], r));
        }
      }
      return union(...segments);
    },
    poly: (points) => polygon(points.map(([x, y]) => [px(x), py(y)] as const)),
    ragged: (shape, amount = RAG_SOFT, grain = 4) =>
      amount <= 0 ? shape : roughen(shape, amount * P, grain * P, nextSeed()),
    shift: (shape, dx, dy) => translate(shape, dx * P, dy * P),
    fill: (shape, color, alpha = 1) => {
      fill(image, shape, hex(color, alpha));
    },
    ink: (shape, main, dark) => {
      const outer = canvas.ragged(shape, RAG_HARD, 3);
      fill(image, outer, hex(dark));
      fill(image, inset(outer, OUTLINE * 0.8 * P), hex(main));
    },
    form: (shape, palette, options = {}) => {
      const { rag = RAG_SOFT, shadow = 1, rim = 0 } = options;
      const outer = canvas.ragged(shape, rag);
      fill(image, outer, hex(palette.dark));
      const inner = inset(outer, OUTLINE * P);
      fill(image, inner, hex(palette.main));
      if (shadow > 0) {
        // Światło pada z góry i z przodu: cień zostaje tam, dokąd nie sięga forma przesunięta
        // w stronę światła, czyli na plecach i od spodu.
        const lit = canvas.shift(inner, 1.5 * shadow, -1.9 * shadow);
        fill(image, subtract(inner, lit), hex(palette.shade));
      }
      if (rim > 0) {
        const unlit = canvas.shift(inner, -0.9, 1.1);
        fill(image, subtract(inner, unlit), hex(palette.light, rim));
      }
      return inner;
    },
    patches: (clip, color, coverage, size, alpha = 1) => {
      fill(image, intersect(clip, blotches(coverage, size * P, nextSeed())), hex(color, alpha));
    },
    eye: (x, y, r, palette, slant = 0) => {
      // Oczodół skośny: dwa koła przesunięte względem siebie dają migdał.
      const socket = union(
        canvas.dot(x - r * 0.35, y - slant * 0.35, r),
        canvas.dot(x + r * 0.35, y + slant * 0.35, r * 0.85),
      );
      fill(image, socket, hex(palette.dark));
      fill(image, canvas.dot(x + r * 0.2, y + slant * 0.2, r * 0.95), hex(palette.glow, 0.28));
      fill(image, canvas.dot(x + r * 0.25, y + slant * 0.25, r * 0.42), hex(palette.glow));
    },
    scar: (from, to, color, stitches = 3) => {
      fill(image, canvas.line(from[0], from[1], to[0], to[1], 0.28), hex(color));
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const length = Math.hypot(dx, dy) || 1;
      const nx = (-dy / length) * 0.9;
      const ny = (dx / length) * 0.9;
      for (let i = 1; i <= stitches; i++) {
        const t = i / (stitches + 1);
        const x = from[0] + dx * t;
        const y = from[1] + dy * t;
        fill(image, canvas.line(x - nx, y - ny, x + nx, y + ny, 0.22), hex(color));
      }
    },
    finish: (strength = 1) => {
      weather(image, baseSeed, {
        stain: 0.13 * strength,
        stainSize: 5 * P,
        speck: 0.06 * strength,
        speckDepth: 0.2,
      });
      return canvas;
    },
  };
  return canvas;
}

/** Kość rogów, kłów i pazurów oraz jej cień: brudna, pożółkła. */
export const BONE = '#cfc3a2';
export const BONE_SHADE = '#857a5d';
/** Wnętrze paszczy. */
export const MAW = '#140907';
/** Goła stal robotów i okuć oraz rdza, która ją zjada. */
export const STEEL = { main: '#676d73', shade: '#3a3f44', light: '#9da4ab', dark: '#0c1116' };
export const RUST = '#7a4526';
