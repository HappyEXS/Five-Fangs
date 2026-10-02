// Start aplikacji: dopasowanie sceny do okna i pętla klatek.
import { pickLanguage } from '../content/i18n/index.ts';
import { drawEmptyScene } from '../render/empty-scene.ts';
import { createViewport, fitViewport, LOGICAL_WIDTH } from '../render/viewport.ts';
import { createFrameLoop } from './frame-loop.ts';
import { language } from './i18n.ts';

/** Rozmiar czcionki bazowej UI przy skali 1; UI skaluje się razem ze sceną przez jednostki em. */
const BASE_FONT_PX = 16;

export function startApp(stage: HTMLElement, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (ctx === null) throw new Error('Canvas 2D is not available');

  language.value = pickLanguage(navigator.languages);

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

  createFrameLoop(() => drawEmptyScene(ctx, viewport)).start();
}
