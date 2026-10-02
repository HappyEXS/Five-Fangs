// Tło sceny: niebo i ziemia. Tymczasowe płaskie kolory; tła światów dojdą w M6.
import { GROUND_Y } from './camera.ts';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, type Viewport } from './viewport.ts';

const SKY = '#1b2233';
const GROUND = '#2d3a2e';
const GROUND_EDGE = '#55684f';

/** Ustawia transformację sceny (jednostki logiczne → piksele urządzenia) i rysuje tło. */
export function drawBackground(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, GROUND_Y);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);
  ctx.fillStyle = GROUND_EDGE;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, 4);
}
