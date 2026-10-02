// Start aplikacji: dopasowanie sceny do okna i pętla klatek.
import { pickLanguage } from '../content/i18n/index.ts';
import { drawBackground } from '../render/background.ts';
import { installGlobalErrorHandlers } from './errors.ts';
import { createFrameLoop } from './frame-loop.ts';
import { language } from './i18n.ts';
import { attachStage, get2dContext } from './stage.ts';

export function startApp(stage: HTMLElement, canvas: HTMLCanvasElement): void {
  installGlobalErrorHandlers(window);
  language.value = pickLanguage(navigator.languages);

  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  // Do czasu scen z M4 gra pokazuje samo tło.
  createFrameLoop(() => drawBackground(ctx, viewport)).start();
}
