// Rysowanie postaci z policzonych macierzy kości (`scene.matrices`): części z atlasu i cięciwa.
// Wspólne dla walki (draw-units.ts) i edytora animacji. Gorąca ścieżka: bez alokacji; argumenty
// to wyłącznie obiekty, indeksy i flagi (powód w docs/ARCHITECTURE.md §5.7).
import type { UnitLook } from './animation.ts';
import { VARIANT_DARK, VARIANT_NORMAL, VARIANT_WHITE } from './atlas.ts';
import { debugBone, debugOptions } from './debug.ts';
import { type CompiledString, MATRIX_SIZE } from './rig.ts';
import { blit, type Scene } from './scene.ts';
import type { Viewport } from './viewport.ts';

const STRING_COLOR = '#e9e2cf';

/** Części jednostki `unit` w kolejności rysowania rigu; `flashing` rysuje białą sylwetkę. */
export function drawRigParts(
  scene: Scene,
  unit: number,
  look: UnitLook,
  viewport: Viewport,
  flashing: boolean,
): void {
  const { rig } = look;
  const { atlas, matrices } = scene;
  for (let i = 0; i < rig.boneCount; i++) {
    const bone = rig.drawOrder[i] ?? 0;
    const sprite = scene.boneSprites[unit * scene.maxBones + bone];
    if (sprite === null || sprite === undefined) continue;
    const variant = flashing
      ? VARIANT_WHITE
      : (rig.back[bone] ?? 0) === 1
        ? VARIANT_DARK
        : VARIANT_NORMAL;
    const image = atlas.images[variant];
    if (image === undefined) continue;
    blit(scene, image, sprite, matrices, bone * MATRIX_SIZE, viewport);
    if (import.meta.env.DEV && debugOptions.pivots) debugBone(scene.ctx, sprite);
  }
}

/**
 * Cięciwa i strzała na cięciwie: elementy rysowane wektorowo między punktami kości,
 * z macierzy policzonych przed chwilą dla tej jednostki.
 */
export function drawString(
  scene: Scene,
  look: UnitLook,
  string: CompiledString,
  unit: number,
  pulled: boolean,
  viewport: Viewport,
): void {
  const { ctx, matrices } = scene;
  const s = viewport.scale;
  const m = string.bone * MATRIX_SIZE;
  const a = matrices[m] ?? 1;
  const b = matrices[m + 1] ?? 0;
  const c = matrices[m + 2] ?? 0;
  const d = matrices[m + 3] ?? 1;
  const e = matrices[m + 4] ?? 0;
  const f = matrices[m + 5] ?? 0;
  const x1 = a * string.ax + c * string.ay + e;
  const y1 = b * string.ax + d * string.ay + f;
  const x2 = a * string.bx + c * string.by + e;
  const y2 = b * string.bx + d * string.by + f;

  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.strokeStyle = STRING_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (!pulled) {
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }
  const p = string.pullBone * MATRIX_SIZE;
  const handX =
    (matrices[p] ?? 1) * string.pullX +
    (matrices[p + 2] ?? 0) * string.pullY +
    (matrices[p + 4] ?? 0);
  const handY =
    (matrices[p + 1] ?? 0) * string.pullX +
    (matrices[p + 3] ?? 1) * string.pullY +
    (matrices[p + 5] ?? 0);
  ctx.lineTo(handX, handY);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Strzała leży od dłoni w stronę majdanu łuku (pivot kości z cięciwą).
  const sprite = scene.projectileSprites[unit];
  const image = scene.atlas.images[VARIANT_NORMAL];
  if (sprite === null || sprite === undefined || image === undefined) return;
  const dirX = e - handX;
  const dirY = f - handY;
  // sqrt zamiast Math.hypot: hypot jest zwykłym wywołaniem funkcji wbudowanej i pakuje
  // argumenty oraz wynik w liczby na stercie (36 B na wywołanie).
  const length = Math.sqrt(dirX * dirX + dirY * dirY);
  if (length === 0) return;
  const ux = (dirX / length) * look.scale;
  const uy = (dirY / length) * look.scale;
  // Koniec strzały (jednostka rigu za lewą krawędzią sprite'a) leży w dłoni, nie jej pivot.
  const shift = -1 - sprite.offsetX;
  const { local } = scene;
  local[0] = ux;
  local[1] = uy;
  local[2] = -uy;
  local[3] = ux;
  local[4] = handX + ux * shift;
  local[5] = handY + uy * shift;
  blit(scene, image, sprite, local, 0, viewport);
}
