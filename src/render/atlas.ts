// Atlas części postaci. Obraz i metadane generuje potok atlasów (src/assets/generated),
// a Vite nadaje plikowi hash treści w nazwie. Warianty kolorystyczne powstają raz,
// przy ładowaniu; w trakcie rysowania nie używamy `ctx.filter`.
import unitsMeta from '../assets/generated/units.json' with { type: 'json' };
import unitsUrl from '../assets/generated/units.png';

export interface Sprite {
  /** Prostokąt w atlasie, w pikselach. */
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
  /** Rozmiar i punkt obrotu w jednostkach rigu. */
  readonly width: number;
  readonly height: number;
  readonly pivotX: number;
  readonly pivotY: number;
}

export interface AtlasMeta {
  readonly pixelsPerUnit: number;
  readonly width: number;
  readonly height: number;
  /** Nazwa → [x, y, szerokość, wysokość w pikselach atlasu, pivotX, pivotY w jednostkach rigu]. */
  readonly sprites: Readonly<Record<string, readonly number[]>>;
}

export const VARIANT_NORMAL = 0;
/** Przyciemniony: kończyny po dalszej stronie postaci. */
export const VARIANT_DARK = 1;
/** Biała sylwetka: błysk przy trafieniu. */
export const VARIANT_WHITE = 2;

export interface Atlas {
  /** Obraz atlasu w każdym wariancie; indeks to `VARIANT_*`. */
  readonly images: readonly CanvasImageSource[];
  readonly sprites: ReadonlyMap<string, Sprite>;
  readonly width: number;
  readonly height: number;
}

/** Zamienia metadane atlasu na opisy sprite'ów. */
export function parseAtlasMeta(meta: AtlasMeta): Map<string, Sprite> {
  const sprites = new Map<string, Sprite>();
  for (const [name, values] of Object.entries(meta.sprites)) {
    const [sx = 0, sy = 0, sw = 0, sh = 0, pivotX = 0, pivotY = 0] = values;
    sprites.set(name, {
      sx,
      sy,
      sw,
      sh,
      width: sw / meta.pixelsPerUnit,
      height: sh / meta.pixelsPerUnit,
      pivotX,
      pivotY,
    });
  }
  return sprites;
}

/** Kopia atlasu z kolorem nałożonym tylko na nieprzezroczyste piksele. */
function tinted(
  image: CanvasImageSource,
  width: number,
  height: number,
  operation: GlobalCompositeOperation,
  color: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is not available');
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = operation;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/** Ładuje atlas postaci. Wywołujący opakowuje to w obsługę błędu ładowania (`guardedLoad`). */
export async function loadUnitsAtlas(): Promise<Atlas> {
  const image = new Image();
  image.src = unitsUrl;
  await image.decode();
  const { width, height } = unitsMeta;
  return {
    images: [
      image,
      tinted(image, width, height, 'source-atop', 'rgba(8, 12, 22, 0.45)'),
      tinted(image, width, height, 'source-in', '#ffffff'),
    ],
    sprites: parseAtlasMeta(unitsMeta),
    width,
    height,
  };
}
