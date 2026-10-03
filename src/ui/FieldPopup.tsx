// Okienko nad polem bohatera na ekranie składu: wybór runy albo drogi ewolucji. Zamyka się
// po wyborze, Escape albo kliknięciu poza okienkiem; fokus wraca do przycisku, który je otworzył.
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

export interface FieldAnchor {
  /** Środek pola bohatera jako ułamek szerokości sceny. */
  readonly at: number;
  /** Przycisk, który otworzył okienko; do niego wraca fokus. */
  readonly opener: HTMLElement;
}

/** Zamyka okienko i oddaje fokus przyciskowi, który je otworzył (o ile nadal jest na ekranie). */
export function closeTo(anchor: FieldAnchor, onClose: () => void): void {
  onClose();
  if (anchor.opener.isConnected) anchor.opener.focus();
}

export function FieldPopup(props: {
  anchor: FieldAnchor;
  label: string;
  /** Dodatkowa klasa: szerokość i układ treści zależą od rodzaju wyboru. */
  kind: string;
  /** Połowa szerokości okienka w em: tyle co najmniej od krawędzi sceny stoi jego środek. */
  halfWidth?: number;
  onClose: () => void;
  children: ComponentChildren;
}) {
  const { anchor, onClose } = props;
  const half = props.halfWidth ?? 9;
  const box = useRef<HTMLDivElement>(null);

  // Nasłuch zakładamy synchronicznie po wstawieniu okienka: Escape wciśnięty tuż po otwarciu
  // też je zamyka.
  useLayoutEffect(() => {
    box.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeTo(anchor, onClose);
    };
    const onPointer = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && box.current?.contains(target) === true) return;
      // Kliknięcie w przycisk, który otworzył okienko, obsługuje sam przycisk: zamknięcie tutaj
      // otwarłoby je od nowa.
      if (target instanceof Node && anchor.opener.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={box}
      class={`sheet field-popup ${props.kind}`}
      role="dialog"
      aria-label={props.label}
      style={{ left: `clamp(${half}em, ${anchor.at * 100}%, 100% - ${half}em)` }}
    >
      {props.children}
    </div>
  );
}
