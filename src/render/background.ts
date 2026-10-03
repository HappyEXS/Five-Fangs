// Tło sceny: niebo, linia drzew, ziemia i linia podłogi. Płaskie kolory wycinanki, te same co
// w ui/styles/base.css; tła poszczególnych światów dojdą w M6.
import { GROUND_Y } from './camera.ts';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, type Viewport } from './viewport.ts';

const SKY = '#3f4c80';
const TREES = '#374273';
const GROUND = '#2c5446';
const FLOOR_LINE = '#241f3d';
const FLOOR_LINE_HEIGHT = 4;

/** Szerokość jednego świerka i zakres wysokości linii drzew, w jednostkach logicznych. */
const TREE_STEP = 46;
const TREE_MIN = 70;
const TREE_SPREAD = 80;

/**
 * Sylwetka linii drzew jako jedna ścieżka: rząd trójkątnych świerków o wysokościach z prostego
 * wzoru na numerze drzewa, więc tło jest zawsze takie samo.
 */
function buildTreeLine(): Path2D {
  const path = new Path2D();
  path.moveTo(0, GROUND_Y);
  for (let i = 0; i * TREE_STEP < LOGICAL_WIDTH + TREE_STEP; i++) {
    const left = i * TREE_STEP - TREE_STEP / 2;
    const height = TREE_MIN + ((i * 53 + 17) % TREE_SPREAD);
    path.lineTo(left, GROUND_Y - height * 0.35);
    path.lineTo(left + TREE_STEP / 2, GROUND_Y - height);
    path.lineTo(left + TREE_STEP, GROUND_Y - height * 0.35);
  }
  path.lineTo(LOGICAL_WIDTH, GROUND_Y);
  path.closePath();
  return path;
}

/** Ścieżka powstaje raz, przy pierwszej klatce; w pętli klatek jest tylko wypełniana. */
let treeLine: Path2D | null = null;

/** Ustawia transformację sceny (jednostki logiczne → piksele urządzenia) i rysuje tło. */
export function drawBackground(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, GROUND_Y);
  if (treeLine === null) treeLine = buildTreeLine();
  ctx.fillStyle = TREES;
  ctx.fill(treeLine);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);
  ctx.fillStyle = FLOOR_LINE;
  ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, FLOOR_LINE_HEIGHT);
}
