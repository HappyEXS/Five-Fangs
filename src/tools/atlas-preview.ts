// Podgląd atlasu postaci i jego wariantów (/tools.html?view=atlas).
import { createFrameLoop } from '../game/frame-loop.ts';
import { attachStage, get2dContext } from '../game/stage.ts';
import { guardedLoad } from '../game/update.ts';
import { loadUnitsAtlas } from '../render/atlas.ts';
import { drawBackground } from '../render/background.ts';
import { LOGICAL_WIDTH } from '../render/viewport.ts';

const LABELS = ['zwykły', 'przyciemniony (tylne kończyny)', 'biała sylwetka (błysk trafienia)'];

export async function startAtlasPreview(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  const atlas = await guardedLoad('atlas:units', loadUnitsAtlas);

  const scale = Math.min(1, (LOGICAL_WIDTH - 40) / atlas.width);
  const rowHeight = atlas.height * scale * 0.82;
  createFrameLoop(() => {
    drawBackground(ctx, viewport);
    ctx.font = '14px ui-monospace, Consolas, monospace';
    for (let variant = 0; variant < atlas.images.length; variant++) {
      const image = atlas.images[variant];
      if (image === undefined) continue;
      const y = 28 + variant * (rowHeight + 22);
      ctx.fillStyle = '#aab3c2';
      ctx.fillText(LABELS[variant] ?? '', 20, y - 6);
      ctx.drawImage(image, 20, y, atlas.width * scale * 0.82, rowHeight);
    }
  }).start();
}
