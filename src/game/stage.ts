// Scena w oknie przeglądarki: dopasowanie elementu sceny i bufora canvasu do okna.
import { createViewport, fitViewport, LOGICAL_WIDTH, type Viewport } from '../render/viewport.ts';

/** Rozmiar czcionki bazowej UI przy skali 1; UI skaluje się razem ze sceną przez jednostki em. */
const BASE_FONT_PX = 16;

/**
 * Utrzymuje scenę 16:9 wpisaną w okno. Zwraca viewport aktualizowany w miejscu przy każdej
 * zmianie rozmiaru okna, więc pętla klatek może go czytać bez dodatkowych wywołań.
 */
export function attachStage(stage: HTMLElement, canvas: HTMLCanvasElement): Viewport {
  const viewport = createViewport();
  const resize = (): void => {
    fitViewport(viewport, window.innerWidth, window.innerHeight, window.devicePixelRatio);
    stage.style.left = `${viewport.cssLeft}px`;
    stage.style.top = `${viewport.cssTop}px`;
    stage.style.width = `${viewport.cssWidth}px`;
    stage.style.height = `${viewport.cssHeight}px`;
    stage.style.fontSize = `${(viewport.cssWidth / LOGICAL_WIDTH) * BASE_FONT_PX}px`;
    // Przypisanie rozmiaru czyści canvas, więc robimy to tylko przy faktycznej zmianie.
    if (canvas.width !== viewport.pixelWidth) canvas.width = viewport.pixelWidth;
    if (canvas.height !== viewport.pixelHeight) canvas.height = viewport.pixelHeight;
  };
  window.addEventListener('resize', resize);
  resize();
  return viewport;
}

/** Kontekst 2D bez kanału alfa (tło sceny zawsze pokrywa cały canvas). */
export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (ctx === null) throw new Error('Canvas 2D is not available');
  return ctx;
}
