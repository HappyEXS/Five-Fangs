// Tło sceny: niebo, warstwy sylwetek świata, ziemia i linia podłogi. Płaskie kolory wycinanki
// (ADR 0015); każdy świat ma własne tło opisane w render/backdrops (ADR 0022).
import type { BackdropId } from '../content/schema-progression.ts';
import { BACKDROP_SPECS, DEFAULT_BACKDROP } from './backdrops/index.ts';
import { GROUND_Y } from './camera.ts';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, type Viewport } from './viewport.ts';

const FLOOR_LINE_HEIGHT = 4;

/** Tło gotowe do rysowania: każda warstwa to jedna ścieżka i jej kolor. */
interface BuiltBackdrop {
  readonly sky: string;
  readonly ground: string;
  readonly floorLine: string;
  readonly colors: readonly string[];
  readonly paths: readonly Path2D[];
}

/** Ścieżki tła powstają raz, przy pierwszej klatce z tym tłem; w pętli klatek są tylko wypełniane. */
const built = new Map<BackdropId, BuiltBackdrop>();

function build(id: BackdropId): BuiltBackdrop {
  const spec = BACKDROP_SPECS[id]();
  const colors: string[] = [];
  const paths: Path2D[] = [];
  for (const layer of spec.layers) {
    const path = new Path2D();
    for (const polygon of layer.polygons) {
      for (let i = 0; i + 1 < polygon.length; i += 2) {
        if (i === 0) path.moveTo(polygon[i] ?? 0, polygon[i + 1] ?? 0);
        else path.lineTo(polygon[i] ?? 0, polygon[i + 1] ?? 0);
      }
      path.closePath();
    }
    colors.push(layer.color);
    paths.push(path);
  }
  return { sky: spec.sky, ground: spec.ground, floorLine: spec.floorLine, colors, paths };
}

/**
 * Ustawia transformację sceny (jednostki logiczne → piksele urządzenia) i rysuje tło świata.
 * Sylwetki są przycięte do nieba: nic nie wchodzi pod linię podłogi, na której stoją postacie
 * i pod którą leżą podpisy interfejsu.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  backdrop: BackdropId = DEFAULT_BACKDROP,
): void {
  let scene = built.get(backdrop);
  if (scene === undefined) {
    scene = build(backdrop);
    built.set(backdrop, scene);
  }
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = scene.sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, GROUND_Y);
  const { colors, paths } = scene;
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    if (path === undefined) continue;
    ctx.fillStyle = colors[i] ?? scene.sky;
    ctx.fill(path);
  }
  // Ziemia zakrywa wszystko, co warstwy narysowały poniżej linii podłogi (np. dolne połowy kół).
  ctx.fillStyle = scene.ground;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);
  ctx.fillStyle = scene.floorLine;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, FLOOR_LINE_HEIGHT);
}
