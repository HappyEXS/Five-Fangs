// Stała rozdzielczość logiczna sceny i jej dopasowanie do okna z zachowaniem proporcji.

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

/** Powyżej tej wartości devicePixelRatio koszt wypełniania rośnie szybciej niż jakość obrazu. */
export const MAX_DPR = 2;

export interface Viewport {
  /** Prostokąt sceny w pikselach CSS, wyśrodkowany w kontenerze. */
  cssLeft: number;
  cssTop: number;
  cssWidth: number;
  cssHeight: number;
  /** Rozmiar bufora canvasu w pikselach urządzenia. */
  pixelWidth: number;
  pixelHeight: number;
  /** Piksele urządzenia na jednostkę logiczną; argument dla `ctx.setTransform`. */
  scale: number;
}

export function createViewport(): Viewport {
  return {
    cssLeft: 0,
    cssTop: 0,
    cssWidth: LOGICAL_WIDTH,
    cssHeight: LOGICAL_HEIGHT,
    pixelWidth: LOGICAL_WIDTH,
    pixelHeight: LOGICAL_HEIGHT,
    scale: 1,
  };
}

/** Wpisuje scenę 16:9 w kontener (letterbox albo pillarbox) i wylicza rozmiar bufora canvasu. */
export function fitViewport(
  out: Viewport,
  containerWidth: number,
  containerHeight: number,
  devicePixelRatio: number,
): void {
  const fit = Math.min(containerWidth / LOGICAL_WIDTH, containerHeight / LOGICAL_HEIGHT);
  const cssScale = fit > 0 ? fit : 0;
  const dpr = devicePixelRatio > 0 ? Math.min(devicePixelRatio, MAX_DPR) : 1;

  out.cssWidth = Math.floor(LOGICAL_WIDTH * cssScale);
  out.cssHeight = Math.floor(LOGICAL_HEIGHT * cssScale);
  out.cssLeft = Math.floor((containerWidth - out.cssWidth) / 2);
  out.cssTop = Math.floor((containerHeight - out.cssHeight) / 2);
  out.pixelWidth = Math.max(1, Math.round(out.cssWidth * dpr));
  out.pixelHeight = Math.max(1, Math.round(out.cssHeight * dpr));
  out.scale = out.pixelWidth / LOGICAL_WIDTH;
}
