// Edytor animacji (/tools.html?view=anim): podgląd postaci, suwaki kanałów, oś czasu,
// znaczniki, eksport i import klipu.
//
// Klawisze: spacja – odtwarzanie, przecinek i kropka – poprzednia i następna klatka kluczowa.
import { render } from 'preact';
import { requireContent } from '../../content/load.ts';
import type { RawRig } from '../../content/schema-rig.ts';
import { createFrameLoop } from '../../game/frame-loop.ts';
import { attachStage, get2dContext } from '../../game/stage.ts';
import { guardedLoad } from '../../game/update.ts';
import { loadUnitsAtlas } from '../../render/atlas.ts';
import { AnimPanel } from './AnimPanel.tsx';
import { createRigPreview, skinsFor } from './preview.ts';
import { createAnimEditor } from './state.ts';

export async function startAnimEditor(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  ui: HTMLElement,
): Promise<void> {
  const content = requireContent();
  const query = new URLSearchParams(location.search);
  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  const atlas = await guardedLoad('atlas:units', loadUnitsAtlas);

  const skinsOf = (rig: RawRig): string[] => skinsFor(atlas, rig);
  const editor = createAnimEditor(content.rigs, skinsOf);
  const preview = createRigPreview(ctx, atlas);

  // Stan początkowy z adresu, np. ?view=anim&clip=slash&skin=swordsman_a&stance=sword&t=0.5
  const clip = query.get('clip');
  if (clip !== null) editor.selectClip(clip);
  const skin = query.get('skin');
  if (skin !== null && skinsOf(editor.rig.value).includes(skin)) editor.skin.value = skin;
  const stance = query.get('stance');
  if (stance !== null && stance in editor.rig.value.stances) editor.stance.value = stance;
  const time = Number(query.get('t') ?? '0');
  if (Number.isFinite(time)) editor.setTime(time);
  editor.pivots.value = query.get('pivots') === '1';

  window.addEventListener('keydown', (event) => {
    // Klawisze nie mogą przeszkadzać w wypełnianiu pól panelu.
    const target = event.target;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
    if (
      target instanceof HTMLInputElement &&
      target.type !== 'range' &&
      target.type !== 'checkbox'
    ) {
      return;
    }
    if (event.key === ' ') {
      editor.playing.value = !editor.playing.value;
      event.preventDefault();
    } else if (event.key === ',') {
      editor.stepKey(-1);
    } else if (event.key === '.') {
      editor.stepKey(1);
    }
  });

  render(<AnimPanel editor={editor} skinsOf={skinsOf} />, ui);

  createFrameLoop((frameMs) => {
    if (editor.playing.value) {
      const next = editor.time.value + frameMs / 1000 / editor.duration.value;
      // Klip jednorazowy też zawijamy: w podglądzie chodzi o oglądanie go w kółko.
      editor.time.value = next >= 1 ? next - Math.floor(next) : next;
    }
    preview.draw(viewport, {
      rig: editor.rig.value,
      skin: editor.skin.value,
      stance: editor.stance.value,
      clipName: editor.clipName.value,
      time: editor.time.value,
      pivots: editor.pivots.value,
    });
  }).start();
}
