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

/** Odległość ze znakiem od krawędzi kształtu: ujemna wewnątrz, dodatnia na zewnątrz. */
export type Shape = (x: number, y: number) => number;

export function createImage(width: number, height: number): Image {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function hex(color: string, alpha = 1): Color {
  const value = Number.parseInt(color.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff, alpha];
}

/** Prostokąt o środku (cx, cy), połówkach wymiarów (hw, hh) i zaokrągleniu rogów r. */
export function roundBox(cx: number, cy: number, hw: number, hh: number, r: number): Shape {
  return (x, y) => {
    const dx = Math.abs(x - cx) - (hw - r);
    const dy = Math.abs(y - cy) - (hh - r);
    const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
    return outside + Math.min(Math.max(dx, dy), 0) - r;
  };
}

export function circle(cx: number, cy: number, r: number): Shape {
  return (x, y) => Math.hypot(x - cx, y - cy) - r;
}

/** Odcinek od (ax, ay) do (bx, by) pogrubiony do promienia r. */
export function capsule(ax: number, ay: number, bx: number, by: number, r: number): Shape {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  return (x, y) => {
    const t =
      lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * abx + (y - ay) * aby) / lengthSq));
    return Math.hypot(x - (ax + abx * t), y - (ay + aby * t)) - r;
  };
}

/** Suma kształtów. */
export function union(...shapes: readonly Shape[]): Shape {
  return (x, y) => {
    let d = Number.POSITIVE_INFINITY;
    for (const shape of shapes) d = Math.min(d, shape(x, y));
    return d;
  };
}

/** Kształt pomniejszony o `amount` w każdą stronę (dodatnie) albo powiększony (ujemne). */
export function inset(shape: Shape, amount: number): Shape {
  return (x, y) => shape(x, y) + amount;
}

/** Część wspólna kształtu i półpłaszczyzny y >= top. */
export function below(shape: Shape, top: number): Shape {
  return (x, y) => Math.max(shape(x, y), top - y);
}

/** Wypełnia kształt kolorem, mieszając z zawartością obrazu (source-over). */
export function fill(image: Image, shape: Shape, color: Color): void {
  const [r, g, b, a = 1] = color;
  for (let py = 0; py < image.height; py++) {
    for (let px = 0; px < image.width; px++) {
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
