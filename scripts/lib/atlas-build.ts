// Złożenie sprite'ów w atlas: jeden obraz i metadane dla renderera.
import { type PackItem, packShelves } from './pack.ts';
import { blit, createImage, type Image } from './raster.ts';

export interface AtlasSprite {
  readonly name: string;
  readonly image: Image;
  /** Punkt obrotu względem lewego górnego rogu, w jednostkach rigu. */
  readonly pivotX: number;
  readonly pivotY: number;
}

/** Metadane atlasu zapisywane obok obrazu; format czytany przez src/render/atlas.ts. */
export interface AtlasMeta {
  /** Piksele atlasu na jednostkę rigu. */
  readonly pixelsPerUnit: number;
  readonly width: number;
  readonly height: number;
  /** Nazwa → [x, y, szerokość, wysokość w pikselach atlasu, pivotX, pivotY w jednostkach rigu]. */
  readonly sprites: Readonly<Record<string, readonly number[]>>;
}

export interface ComposedAtlas {
  readonly image: Image;
  readonly meta: AtlasMeta;
}

const MIN_ATLAS_WIDTH = 256;
/** Największa tekstura bezpieczna na starszych telefonach. */
const MAX_ATLAS_WIDTH = 4096;
/** Przezroczysty margines wokół sprite'a, żeby wygładzanie nie zaciągało sąsiadów. */
const PADDING = 2;

/**
 * Szerokość atlasu: najmniejsza potęga dwójki, przy której atlas wychodzi mniej więcej
 * kwadratowy i mieści najszerszy sprite.
 */
export function chooseAtlasWidth(items: readonly PackItem[]): number {
  let area = 0;
  let widest = 0;
  for (const item of items) {
    area += (item.width + PADDING) * (item.height + PADDING);
    widest = Math.max(widest, item.width + 2 * PADDING);
  }
  let width = MIN_ATLAS_WIDTH;
  // Zapas 15% na puste końce półek.
  while (width < MAX_ATLAS_WIDTH && (width < widest || width * width < area * 1.15)) width *= 2;
  return width;
}

export function composeAtlas(
  sprites: readonly AtlasSprite[],
  pixelsPerUnit: number,
): ComposedAtlas {
  const items = sprites.map((s) => ({
    name: s.name,
    width: s.image.width,
    height: s.image.height,
  }));
  const packing = packShelves(items, chooseAtlasWidth(items), PADDING);
  const image = createImage(packing.width, packing.height);
  const byName = new Map(sprites.map((s) => [s.name, s]));
  const entries: [string, number[]][] = [];
  for (const placement of packing.placements) {
    const sprite = byName.get(placement.name);
    if (sprite === undefined) continue;
    blit(image, sprite.image, placement.x, placement.y);
    entries.push([
      placement.name,
      [placement.x, placement.y, placement.width, placement.height, sprite.pivotX, sprite.pivotY],
    ]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    image,
    meta: {
      pixelsPerUnit,
      width: packing.width,
      height: packing.height,
      sprites: Object.fromEntries(entries),
    },
  };
}
