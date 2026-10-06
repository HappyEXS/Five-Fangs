// Minimalny rasteryzator i koder PNG dla generatora grafik placeholder. Bez zależności:
// kształty opisane funkcjami odległości ze znakiem, wygładzanie krawędzi z pokrycia piksela.
import { crc32, deflateSync } from 'node:zlib';

export interface Image {
  readonly width: number;
  readonly height: number;
  /** RGBA, 4 bajty na piksel, bez premultiplikacji. */
  readonly data: Uint8ClampedArray;
}

export type Color = readonly [r: number, g: number, b: number, a?: number];

/** Prostokąt, poza którym kształt na pewno jest pusty. */
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Odległość ze znakiem od krawędzi kształtu: ujemna wewnątrz, dodatnia na zewnątrz.
 * Kształt może nieść prostokąt ograniczający; `fill` liczy wtedy tylko piksele w jego obrębie,
 * co przy drobnych detalach na dużym płótnie skraca rysowanie wielokrotnie.
 */
export type Shape = ((x: number, y: number) => number) & { readonly bounds?: Bounds };

function bounded(
  distance: (x: number, y: number) => number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Shape {
  return Object.assign(distance, { bounds: { minX, minY, maxX, maxY } });
}

/** Ten sam kształt z prostokątem przejętym od innego (albo bez, gdy tamten go nie ma). */
function within(distance: (x: number, y: number) => number, bounds: Bounds | undefined): Shape {
  return bounds === undefined ? distance : Object.assign(distance, { bounds });
}

export function createImage(width: number, height: number): Image {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function hex(color: string, alpha = 1): Color {
  const value = Number.parseInt(color.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff, alpha];
}

/** Prostokąt o środku (cx, cy), połówkach wymiarów (hw, hh) i zaokrągleniu rogów r. */
export function roundBox(cx: number, cy: number, hw: number, hh: number, r: number): Shape {
  return bounded(
    (x, y) => {
      const dx = Math.abs(x - cx) - (hw - r);
      const dy = Math.abs(y - cy) - (hh - r);
      const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
      return outside + Math.min(Math.max(dx, dy), 0) - r;
    },
    cx - hw,
    cy - hh,
    cx + hw,
    cy + hh,
  );
}

export function circle(cx: number, cy: number, r: number): Shape {
  return bounded((x, y) => Math.hypot(x - cx, y - cy) - r, cx - r, cy - r, cx + r, cy + r);
}

/** Odcinek od (ax, ay) do (bx, by) pogrubiony do promienia r. */
export function capsule(ax: number, ay: number, bx: number, by: number, r: number): Shape {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  return bounded(
    (x, y) => {
      const t =
        lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * abx + (y - ay) * aby) / lengthSq));
      return Math.hypot(x - (ax + abx * t), y - (ay + aby * t)) - r;
    },
    Math.min(ax, bx) - r,
    Math.min(ay, by) - r,
    Math.max(ax, bx) + r,
    Math.max(ay, by) + r,
  );
}

/**
 * Elipsa o środku (cx, cy) i półosiach (rx, ry). Odległość jest przybliżona: dokładna przy
 * krawędzi, co wystarcza do wygładzania i obrysu.
 */
export function ellipse(cx: number, cy: number, rx: number, ry: number): Shape {
  return bounded(
    (x, y) => {
      const px = x - cx;
      const py = y - cy;
      const k0 = Math.hypot(px / rx, py / ry);
      if (k0 === 0) return -Math.min(rx, ry);
      const k1 = Math.hypot(px / (rx * rx), py / (ry * ry));
      return (k0 * (k0 - 1)) / k1;
    },
    cx - rx,
    cy - ry,
    cx + rx,
    cy + ry,
  );
}

/** Odcinek, którego promień zmienia się liniowo od ra przy (ax, ay) do rb przy (bx, by). */
export function taper(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ra: number,
  rb: number,
): Shape {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const r = Math.max(ra, rb);
  return bounded(
    (x, y) => {
      const t =
        lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * abx + (y - ay) * aby) / lengthSq));
      return Math.hypot(x - (ax + abx * t), y - (ay + aby * t)) - (ra + (rb - ra) * t);
    },
    Math.min(ax, bx) - r,
    Math.min(ay, by) - r,
    Math.max(ax, bx) + r,
    Math.max(ay, by) + r,
  );
}

/** Wielokąt prosty (także wklęsły) o wierzchołkach podanych w kolejności obiegu. */
export function polygon(points: readonly (readonly [number, number])[]): Shape {
  const n = points.length;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return bounded(distance, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));

  function distance(x: number, y: number): number {
    let best = Number.POSITIVE_INFINITY;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const [ax = 0, ay = 0] = points[i] ?? [];
      const [bx = 0, by = 0] = points[j] ?? [];
      const ex = bx - ax;
      const ey = by - ay;
      const lengthSq = ex * ex + ey * ey;
      const t =
        lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / lengthSq));
      const dx = x - (ax + ex * t);
      const dy = y - (ay + ey * t);
      best = Math.min(best, dx * dx + dy * dy);
      // Parzystość przecięć półprostej w prawo: punkt jest w środku, gdy przecina brzeg
      // nieparzystą liczbę razy.
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    return inside ? -Math.sqrt(best) : Math.sqrt(best);
  }
}

/** Kształt bez części wspólnej z `cut`. */
export function subtract(shape: Shape, cut: Shape): Shape {
  return within((x, y) => Math.max(shape(x, y), -cut(x, y)), shape.bounds);
}

/** Część wspólna kształtów. */
export function intersect(a: Shape, b: Shape): Shape {
  const distance = (x: number, y: number): number => Math.max(a(x, y), b(x, y));
  const first = a.bounds;
  const second = b.bounds;
  if (first === undefined || second === undefined) return within(distance, first ?? second);
  return bounded(
    distance,
    Math.max(first.minX, second.minX),
    Math.max(first.minY, second.minY),
    Math.min(first.maxX, second.maxX),
    Math.min(first.maxY, second.maxY),
  );
}

/** Suma kształtów. */
export function union(...shapes: readonly Shape[]): Shape {
  const distance = (x: number, y: number): number => {
    let d = Number.POSITIVE_INFINITY;
    for (const shape of shapes) d = Math.min(d, shape(x, y));
    return d;
  };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const { bounds } of shapes) {
    // Jeden składnik bez prostokąta odbiera go całej sumie.
    if (bounds === undefined) return distance;
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }
  return shapes.length === 0 ? distance : bounded(distance, minX, minY, maxX, maxY);
}

/** Kształt pomniejszony o `amount` w każdą stronę (dodatnie) albo powiększony (ujemne). */
export function inset(shape: Shape, amount: number): Shape {
  const distance = (x: number, y: number): number => shape(x, y) + amount;
  const { bounds } = shape;
  if (bounds === undefined) return distance;
  // Powiększony kształt wychodzi poza prostokąt o tyle, o ile urósł.
  const grow = Math.max(0, -amount);
  return bounded(
    distance,
    bounds.minX - grow,
    bounds.minY - grow,
    bounds.maxX + grow,
    bounds.maxY + grow,
  );
}

/** Część wspólna kształtu i półpłaszczyzny y >= top. */
export function below(shape: Shape, top: number): Shape {
  const distance = (x: number, y: number): number => Math.max(shape(x, y), top - y);
  const { bounds } = shape;
  if (bounds === undefined) return distance;
  return bounded(distance, bounds.minX, Math.max(bounds.minY, top), bounds.maxX, bounds.maxY);
}

/** Piksele zapasu wokół prostokąta kształtu: wygładzanie sięga pół piksela poza krawędź. */
const FILL_MARGIN = 2;

/** Wypełnia kształt kolorem, mieszając z zawartością obrazu (source-over). */
export function fill(image: Image, shape: Shape, color: Color): void {
  const [r, g, b, a = 1] = color;
  // Poza prostokątem kształtu pokrycie jest zerowe; zapas na wygładzoną krawędź.
  const { bounds } = shape;
  const fromX = bounds === undefined ? 0 : Math.max(0, Math.floor(bounds.minX) - FILL_MARGIN);
  const fromY = bounds === undefined ? 0 : Math.max(0, Math.floor(bounds.minY) - FILL_MARGIN);
  const toX =
    bounds === undefined
      ? image.width
      : Math.min(image.width, Math.ceil(bounds.maxX) + FILL_MARGIN);
  const toY =
    bounds === undefined
      ? image.height
      : Math.min(image.height, Math.ceil(bounds.maxY) + FILL_MARGIN);
  for (let py = fromY; py < toY; py++) {
    for (let px = fromX; px < toX; px++) {
      // Pokrycie piksela z odległości jego środka od krawędzi: 1 w głębi, 0 poza kształtem.
      const coverage = Math.min(1, Math.max(0, 0.5 - shape(px + 0.5, py + 0.5)));
      if (coverage === 0) continue;
      const srcA = coverage * a;
      const i = (py * image.width + px) * 4;
      const dstA = (image.data[i + 3] ?? 0) / 255;
      const outA = srcA + dstA * (1 - srcA);
      const mix = (src: number, dst: number): number =>
        outA === 0 ? 0 : (src * srcA + dst * dstA * (1 - srcA)) / outA;
      image.data[i] = mix(r, image.data[i] ?? 0);
      image.data[i + 1] = mix(g, image.data[i + 1] ?? 0);
      image.data[i + 2] = mix(b, image.data[i + 2] ?? 0);
      image.data[i + 3] = outA * 255;
    }
  }
}

/** Kopiuje obraz `src` do `dst` z lewym górnym rogiem w (x, y); obszar docelowy musi być pusty. */
export function blit(dst: Image, src: Image, x: number, y: number): void {
  for (let row = 0; row < src.height; row++) {
    const from = row * src.width * 4;
    dst.data.set(src.data.subarray(from, from + src.width * 4), ((y + row) * dst.width + x) * 4);
  }
}

function chunk(type: string, body: Uint8Array): Buffer {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'latin1');
  out.set(body, 8);
  out.writeUInt32BE(crc32(out.subarray(4, body.length + 8)), body.length + 8);
  return out;
}

/** Koduje obraz jako PNG RGBA 8-bit. */
export function encodePng(image: Image): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header.set([8, 6, 0, 0, 0], 8);

  // Każdy wiersz poprzedza bajt filtra; 0 oznacza brak filtrowania.
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let row = 0; row < image.height; row++) {
    raw.set(image.data.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/** Skrót pary liczb całkowitych do zakresu 0..1; ta sama para i ziarno dają zawsze to samo. */
function latticeValue(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Gładki szum wartości w zakresie -1..1: wartości w węzłach siatki całkowitej, między nimi
 * interpolacja smoothstep. Deterministyczny, bez `Math.random`: wygenerowane grafiki muszą być
 * co do piksela takie same przy każdym uruchomieniu generatora.
 */
export function noise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = latticeValue(ix, iy, seed);
  const b = latticeValue(ix + 1, iy, seed);
  const c = latticeValue(ix, iy + 1, seed);
  const d = latticeValue(ix + 1, iy + 1, seed);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return (top + (bottom - top) * sy) * 2 - 1;
}

/**
 * Kształt o poszarpanej krawędzi: odległość zaburzona szumem o amplitudzie `amplitude`
 * i długości fali `wavelength` (w pikselach). Daje kontur jak wycięty nożem albo wyrwany,
 * zamiast gładkiego.
 */
export function roughen(shape: Shape, amplitude: number, wavelength: number, seed = 0): Shape {
  const distance = (x: number, y: number): number =>
    shape(x, y) + amplitude * noise(x / wavelength, y / wavelength, seed);
  const { bounds } = shape;
  if (bounds === undefined) return distance;
  return bounded(
    distance,
    bounds.minX - amplitude,
    bounds.minY - amplitude,
    bounds.maxX + amplitude,
    bounds.maxY + amplitude,
  );
}

/** Ten sam kształt przesunięty o (dx, dy). */
export function translate(shape: Shape, dx: number, dy: number): Shape {
  const distance = (x: number, y: number): number => shape(x - dx, y - dy);
  const { bounds } = shape;
  if (bounds === undefined) return distance;
  return bounded(distance, bounds.minX + dx, bounds.minY + dy, bounds.maxX + dx, bounds.maxY + dy);
}

/**
 * Plamy: obszary, w których szum przekracza próg. `coverage` 0..1 to w przybliżeniu część
 * powierzchni zajęta przez plamy, `size` ich wielkość w pikselach. Nie jest dokładną odległością,
 * ale wystarcza do wypełnienia z wygładzoną krawędzią; zwykle przycinany do innego kształtu.
 */
export function blotches(coverage: number, size: number, seed = 0): Shape {
  const threshold = 1 - 2 * coverage;
  return (x, y) => (threshold - noise(x / size, y / size, seed)) * size * 0.6;
}

export interface WeatherOptions {
  /** Siła nierównych, dużych zacieków: 0..1 to zmiana jasności o tyle w górę i w dół. */
  readonly stain: number;
  /** Wielkość zacieków w pikselach. */
  readonly stainSize: number;
  /** Część pikseli pokryta drobnym brudem (0..1) i o ile go przyciemnia. */
  readonly speck: number;
  readonly speckDepth: number;
}

/**
 * Postarza narysowany obraz: nierówne zacieki jasności i drobne ciemne plamki na wszystkim,
 * co nieprzezroczyste. Kolor zmienia się tylko w stronę ciemniejszego i brudniejszego; alfa
 * zostaje bez zmian, więc kontur części się nie rusza.
 */
export function weather(image: Image, seed: number, options: WeatherOptions): void {
  const { stain, stainSize, speck, speckDepth } = options;
  for (let py = 0; py < image.height; py++) {
    for (let px = 0; px < image.width; px++) {
      const i = (py * image.width + px) * 4;
      if ((image.data[i + 3] ?? 0) === 0) continue;
      // Zacieki: duże, miękkie plamy jaśniejsze i ciemniejsze.
      let factor = 1 + stain * noise(px / stainSize, py / stainSize, seed);
      // Brud: rzadkie, kilkupikselowe plamki.
      if (speck > 0 && noise(px / 2.2, py / 2.2, seed + 17) > 1 - 2 * speck) factor -= speckDepth;
      if (factor > 1.12) factor = 1.12;
      image.data[i] = (image.data[i] ?? 0) * factor;
      image.data[i + 1] = (image.data[i + 1] ?? 0) * factor;
      image.data[i + 2] = (image.data[i + 2] ?? 0) * factor;
    }
  }
}
