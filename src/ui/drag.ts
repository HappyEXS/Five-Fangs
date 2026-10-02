// Przeciąganie bohaterów na Pointer Events: mysz i dotyk tym samym kodem.
// Cel upuszczenia to element z atrybutem `data-drop`; jego wartość dostaje `onDrop`.
import { type Signal, signal } from '@preact/signals';

export interface DragState {
  /** Przeciągana wartość, np. id bohatera. */
  readonly item: string;
  /** Pozycja wskaźnika w pikselach okna. */
  readonly x: number;
  readonly y: number;
  /** Cel upuszczenia pod wskaźnikiem albo null, gdy wskaźnik jest poza celami. */
  readonly over: string | null;
}

/** Ruch poniżej tej odległości to kliknięcie, nie przeciągnięcie. */
const CLICK_DISTANCE = 6;

export interface DragController {
  /** Bieżące przeciąganie albo null; komponent rysuje z niego „ducha” pod wskaźnikiem. */
  readonly state: Signal<DragState | null>;
  /** Podpinane pod `onPointerDown` elementu, który da się przeciągać. */
  start(event: PointerEvent, item: string): void;
}

/** Cel upuszczenia pod punktem okna. „Duch” ma pointer-events: none, więc go nie zasłania. */
function dropTargetAt(x: number, y: number): string | null {
  const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
  return target?.dataset.drop ?? null;
}

export function createDrag(options: {
  onDrop: (item: string, target: string) => void;
  onClick: (item: string) => void;
  /** Wołane przy każdym ruchu wskaźnika po rozpoczęciu przeciągania. */
  onMove?: (item: string, x: number, y: number) => void;
  /** Wołane po zakończeniu przeciągania (także anulowanego), przed `onDrop`. */
  onEnd?: (item: string) => void;
}): DragController {
  const state = signal<DragState | null>(null);

  return {
    state,
    start(event, item) {
      if (event.button !== 0) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let dragging = false;

      const onMove = (move: PointerEvent): void => {
        if (move.pointerId !== event.pointerId) return;
        const distance = Math.abs(move.clientX - startX) + Math.abs(move.clientY - startY);
        if (!dragging && distance < CLICK_DISTANCE) return;
        dragging = true;
        state.value = {
          item,
          x: move.clientX,
          y: move.clientY,
          over: dropTargetAt(move.clientX, move.clientY),
        };
        options.onMove?.(item, move.clientX, move.clientY);
      };
      const finish = (up: PointerEvent): void => {
        if (up.pointerId !== event.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        state.value = null;
        if (dragging) options.onEnd?.(item);
        if (up.type === 'pointercancel') return;
        if (!dragging) {
          options.onClick(item);
          return;
        }
        const drop = dropTargetAt(up.clientX, up.clientY);
        if (drop !== null) options.onDrop(item, drop);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    },
  };
}
