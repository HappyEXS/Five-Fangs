// Wspólne definicje generatorów grafik zastępczych: gęstość atlasu i opis części.
import type { Image } from './raster.ts';

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

export interface PlaceholderSprite {
  /** Nazwa w atlasie: `<skórka>/<kość lub slot>` albo `fx/<nazwa>`. */
  readonly name: string;
  readonly part: PartSpec;
  readonly image: Image;
}
