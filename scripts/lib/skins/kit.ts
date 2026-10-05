// Przybory do rysowania części bestii. Część rysuje się w układzie swojego stawu: punkt (0, 0)
// to pivot (np. szyja dla głowy, biodra dla tułowia), oś Y rośnie w dół, postać patrzy w prawo,
// a jednostką jest jednostka rigu. Rozmiar obrazka i pivot wynikają z podanego prostokąta, więc
// każda bestia może mieć części innej wielkości niż ludzie na tym samym szkielecie.
import { type PartSpec, PIXELS_PER_UNIT } from '../part-spec.ts';
import {
  capsule,
  circle,
  createImage,
  ellipse,
  fill,
  hex,
  type Image,
  inset,
  polygon,
  roundBox,
  type Shape,
  taper,
  union,
} from '../raster.ts';

const P = PIXELS_PER_UNIT;
/** Grubość obrysu w jednostkach rigu, jak w częściach ludzi. */
export const OUTLINE = 0.7;

export type Point = readonly [x: number, y: number];

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
  poly(points: readonly Point[]): Shape;
  /** Wnętrze kształtu bez obrysu: obszar, w którym można malować plamy, pysk albo brzuch. */
  inner(shape: Shape): Shape;
  /** Wypełnia kształt kolorem; `alpha` < 1 daje cień albo połysk. */
  fill(shape: Shape, color: string, alpha?: number): void;
  /** Kształt z atramentowym obrysem: najpierw kolor obrysu, potem wnętrze. */
  ink(shape: Shape, main: string, dark: string): void;
}

/**
 * Płótno części obejmujące prostokąt od (left, top) do (right, bottom) w układzie pivota.
 * Granice muszą być całkowite, żeby rozmiar obrazka w pikselach też był całkowity.
 */
export function partCanvas(left: number, top: number, right: number, bottom: number): PartCanvas {
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
    poly: (points) => polygon(points.map(([x, y]) => [px(x), py(y)] as const)),
    inner: (shape) => inset(shape, OUTLINE * P),
    fill: (shape, color, alpha = 1) => {
      fill(image, shape, hex(color, alpha));
    },
    ink: (shape, main, dark) => {
      fill(image, shape, hex(dark));
      fill(image, inset(shape, OUTLINE * P), hex(main));
    },
  };
  return canvas;
}

/** Kolory bestii. Każda ma własny odcień brązu (kolor szczepu) i jeden akcent. */
export interface BeastPalette {
  /** Sierść, pióra albo łuski. */
  readonly main: string;
  /** Obrys i najciemniejsze miejsca. */
  readonly dark: string;
  /** Brzuch, pysk, spód: jaśniejszy odcień koloru głównego. */
  readonly light: string;
  /** Akcent wyróżniający postać: błona skrzydła, grzywa, płomień, żelazo. */
  readonly accent: string;
  /** Oko. */
  readonly eye: string;
}

/** Kość rogów, kłów i pazurów oraz jej cień: wspólne dla całego szczepu. */
export const BONE = '#f1e7cf';
export const BONE_SHADE = '#b9a988';
export const PUPIL = '#1c130e';
