// Tymczasowa pusta scena z M0: tło i linia ziemi. Zastąpi ją renderer walki w M2.
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, type Viewport } from './viewport.ts';

const SKY = '#1b2233';
const GROUND = '#2d3a2e';
const GROUND_EDGE = '#55684f';

/** Wysokość linii ziemi w jednostkach logicznych. */
const GROUND_Y = 560;

export function drawEmptyScene(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, GROUND_Y);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);
  ctx.fillStyle = GROUND_EDGE;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, 4);
}
