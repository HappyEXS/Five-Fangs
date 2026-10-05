// Miniaturka postaci: popiersie w okienku z kolorem nieba sceny. Sam obrazek rysuje `game`
// z prawdziwej postaci (rig i skórka), więc miniaturka zawsze zgadza się z tym, kto stoi na
// scenie. Obrazek jest ozdobą: nazwę postaci podaje element, w którym miniaturka siedzi.
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { StageControls } from '../game/battle-stage.ts';

export function Portrait(props: {
  stage: StageControls;
  /** Id jednostki z treści gry. */
  unit: string;
  /** Postać patrzy w lewo, jak przeciwnik na scenie. */
  mirrored?: boolean;
}) {
  const { stage, unit } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  // Miniaturki powstają razem z grafikami walki; do tego czasu okienko jest puste.
  const ready = stage.assets.value === 'ready';
  useLayoutEffect(() => {
    if (ready && canvas.current !== null) stage.paintPortrait(canvas.current, unit);
  }, [stage, unit, ready]);
  return (
    <span
      class={props.mirrored === true ? 'portrait portrait-mirrored' : 'portrait'}
      aria-hidden="true"
    >
      <canvas ref={canvas} class="portrait-face" />
    </span>
  );
}
