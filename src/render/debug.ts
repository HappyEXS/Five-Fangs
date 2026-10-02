// Nakładka debug renderera. Cały ten moduł jest używany wyłącznie w gałęziach
// `import.meta.env.DEV`, więc build produkcyjny go nie zawiera; pilnuje tego `pnpm check:dist`,
// szukając w dist/ znacznika DEBUG_MARKER.
//
// Kod debug może alokować (napisy nakładki); nie jest częścią gorącej ścieżki gry.
import { DEBUG_MARKER } from '../core/dev-markers.ts';
import type { Sprite } from './atlas.ts';
import { LOGICAL_WIDTH } from './viewport.ts';

export interface DebugOptions {
  /** Punkty obrotu i ramki części. */
  pivots: boolean;
  /** Zasięgi jednostek i linie do celów. */
  ranges: boolean;
  /** Pomiary: FPS, czas symulacji i renderu, liczba wywołań rysowania. */
  perf: boolean;
}

export const debugOptions: DebugOptions = { pivots: false, ranges: false, perf: false };

export interface DebugStats {
  /** Wywołania drawImage w bieżącej klatce. */
  drawCalls: number;
  /** Czas ticków symulacji i rysowania w ostatniej klatce, w milisekundach. */
  simMs: number;
  renderMs: number;
  /** Czas między klatkami. */
  frameMs: number;
}

export const debugStats: DebugStats = { drawCalls: 0, simMs: 0, renderMs: 0, frameMs: 0 };

const PIVOT_COLOR = '#ff4dd2';
const FRAME_COLOR = 'rgba(255, 255, 255, 0.55)';
const RANGE_COLOR = 'rgba(255, 221, 87, 0.8)';
const TARGET_COLOR = 'rgba(255, 99, 99, 0.7)';

/** Ramka części i krzyżyk w punkcie obrotu; rysowane w bieżącej transformacji kości. */
export function debugBone(ctx: CanvasRenderingContext2D, sprite: Sprite): void {
  ctx.lineWidth = 0.35;
  ctx.strokeStyle = FRAME_COLOR;
  ctx.strokeRect(-sprite.pivotX, -sprite.pivotY, sprite.width, sprite.height);
  ctx.strokeStyle = PIVOT_COLOR;
  ctx.beginPath();
  ctx.moveTo(-1.5, 0);
  ctx.lineTo(1.5, 0);
  ctx.moveTo(0, -1.5);
  ctx.lineTo(0, 1.5);
  ctx.stroke();
}

/**
 * Zasięg jednostki (odcinek od jej pozycji w stronę przeciwnika) i linia do celu.
 * Współrzędne w jednostkach logicznych sceny; `targetX` ujemne oznacza brak celu.
 */
export function debugRange(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  range: number,
  targetX: number,
  targetY: number,
): void {
  ctx.lineWidth = 2;
  ctx.strokeStyle = RANGE_COLOR;
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x + facing * range, y + 4);
  ctx.moveTo(x + facing * range, y - 2);
  ctx.lineTo(x + facing * range, y + 10);
  ctx.stroke();
  if (targetX < 0) return;
  ctx.lineWidth = 1;
  ctx.strokeStyle = TARGET_COLOR;
  ctx.beginPath();
  ctx.moveTo(x, y - 30);
  ctx.lineTo(targetX, targetY - 30);
  ctx.stroke();
}

let overlayText = '';
let overlayAge = 1000;
let smoothedFrame = 16.7;

/** Tekst z pomiarami w prawym górnym rogu sceny; odświeżany cztery razy na sekundę. */
export function debugOverlay(ctx: CanvasRenderingContext2D): void {
  smoothedFrame += (debugStats.frameMs - smoothedFrame) * 0.1;
  overlayAge += debugStats.frameMs;
  if (overlayAge >= 250) {
    overlayAge = 0;
    const fps = smoothedFrame > 0 ? 1000 / smoothedFrame : 0;
    overlayText = `${fps.toFixed(0)} FPS   sim ${debugStats.simMs.toFixed(2)} ms   render ${debugStats.renderMs.toFixed(2)} ms   ${debugStats.drawCalls} draw   [${DEBUG_MARKER}]`;
  }
  ctx.font = '13px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(11, 13, 18, 0.7)';
  ctx.fillRect(LOGICAL_WIDTH - 470, 6, 462, 22);
  ctx.fillStyle = '#d7f7c2';
  ctx.fillText(overlayText, LOGICAL_WIDTH - 14, 21);
  ctx.textAlign = 'left';
}
