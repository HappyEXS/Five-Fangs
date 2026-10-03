// Dekodowanie grafik źródłowych i kodowanie atlasu do WebP. Jedyne miejsce użycia sharp (ADR 0014).
import sharp from 'sharp';
import type { Image } from './raster.ts';

export interface WebpOptions {
  readonly lossless: boolean;
  /** Jakość kolorów w trybie stratnym, 1..100. */
  readonly quality: number;
}

/** Dekoduje PNG albo WebP do RGBA bez premultiplikacji. */
export async function decodeImage(file: Uint8Array): Promise<Image> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

export async function encodeWebp(image: Image, options: WebpOptions): Promise<Buffer> {
  const source = sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  });
  // effort 6 = najwolniejsze i najmniejsze; atlasy pakujemy rzadko, a pobiera je każdy gracz.
  return options.lossless
    ? source.webp({ lossless: true, effort: 6 }).toBuffer()
    : source.webp({ quality: options.quality, alphaQuality: 100, effort: 6 }).toBuffer();
}
