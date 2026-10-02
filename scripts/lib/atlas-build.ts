// Złożenie sprite'ów w atlas: obraz PNG i metadane dla renderera.
import { packShelves } from './pack.ts';
import type { PartSpec } from './placeholder-parts.ts';
import { blit, createImage, encodePng, type Image } from './raster.ts';

export interface AtlasSprite {
  readonly name: string;
  readonly part: PartSpec;
  readonly image: Image;
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

export interface BuiltAtlas {
  readonly png: Buffer;
  readonly meta: AtlasMeta;
}

const ATLAS_WIDTH = 512;
/** Przezroczysty margines wokół sprite'a, żeby wygładzanie nie zaciągało sąsiadów. */
const PADDING = 2;

export function buildAtlas(sprites: readonly AtlasSprite[], pixelsPerUnit: number): BuiltAtlas {
  const packing = packShelves(
    sprites.map((s) => ({ name: s.name, width: s.image.width, height: s.image.height })),
    ATLAS_WIDTH,
    PADDING,
  );
  const atlas = createImage(packing.width, packing.height);
  const byName = new Map(sprites.map((s) => [s.name, s]));
  const entries: [string, number[]][] = [];
  for (const placement of packing.placements) {
    const sprite = byName.get(placement.name);
    if (sprite === undefined) continue;
    blit(atlas, sprite.image, placement.x, placement.y);
    entries.push([
      placement.name,
      [
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        sprite.part.pivotX,
        sprite.part.pivotY,
      ],
    ]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    png: encodePng(atlas),
    meta: {
      pixelsPerUnit,
      width: packing.width,
      height: packing.height,
      sprites: Object.fromEntries(entries),
    },
  };
}
