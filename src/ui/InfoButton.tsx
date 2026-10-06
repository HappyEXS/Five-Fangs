// Przycisk „i” i jego okienko. Wyjaśnienia, których gracz nie potrzebuje stale przed oczami, nie
// zajmują miejsca na scenie: czekają pod okrągłym przyciskiem. Otwarte może być jedno okienko
// naraz. Wisi pod swoim przyciskiem i nigdy nie wychodzi poza scenę (keep-inside.ts). Zamyka je
// ponowne kliknięcie przycisku, Escape, kliknięcie gdziekolwiek indziej albo zmiana tego, co opisuje.
import { signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { t } from '../game/i18n.ts';
import { InfoMark } from './icons.tsx';
import { useKeepInside } from './keep-inside.ts';

interface Tip {
  /** Kolejny numer otwarcia: nowe okienko jest nowym elementem i mierzy się od zera. */
  readonly serial: number;
  readonly opener: HTMLElement;
  /** Akapity okienka, jeden na wiersz tekstu. */
  readonly text: string;
  /** Środek przycisku jako ułamek szerokości sceny. */
  readonly at: number;
  /** Dolna krawędź przycisku jako ułamek wysokości sceny. */
  readonly below: number;
}

/** Jedno okienko na cały interfejs: przyciski są w różnych miejscach drzewa, okienko w jednym. */
const openTip = signal<Tip | null>(null);
let serial = 0;

function close(): void {
  openTip.value = null;
}

/**
 * Okrągły przycisk „i”. `topic` trafia do etykiety dla czytnika ekranu („Informacje: Sklep”),
 * `lines` to akapity okienka. Przycisk musi leżeć wewnątrz ekranu sceny (`.screen`): względem
 * niego liczymy miejsce okienka, w ułamkach, więc zostaje poprawne, gdy scena skaluje się z oknem.
 */
export function InfoButton(props: { topic: string; lines: readonly string[] }) {
  const button = useRef<HTMLButtonElement>(null);
  const text = props.lines.join('\n');

  // Okienko opisuje to, co było na ekranie w chwili otwarcia. Gdy treść się zmienia (wybrano
  // innego bohatera) albo przycisk znika (inny ekran), zamykamy je, zamiast pokazywać nieaktualne.
  useEffect(() => {
    const element = button.current;
    return () => {
      const tip = openTip.peek();
      if (tip !== null && tip.opener === element && tip.text === text) close();
    };
  }, [text]);

  const toggle = (): void => {
    const element = button.current;
    if (element === null) return;
    if (openTip.peek()?.opener === element) {
      close();
      return;
    }
    const area = element.closest('.screen')?.getBoundingClientRect();
    if (area === undefined || area.width === 0 || area.height === 0) return;
    const rect = element.getBoundingClientRect();
    serial += 1;
    openTip.value = {
      serial,
      opener: element,
      text,
      at: (rect.left + rect.width / 2 - area.left) / area.width,
      below: (rect.bottom - area.top) / area.height,
    };
  };

  const tip = openTip.value;
  return (
    <button
      ref={button}
      type="button"
      class="info-btn"
      aria-label={t('info.about', { topic: props.topic })}
      aria-expanded={tip !== null && tip.opener === button.current}
      onClick={toggle}
    >
      <InfoMark />
    </button>
  );
}

function InfoPopup(props: { tip: Tip }) {
  const { tip } = props;
  const box = useRef<HTMLDivElement>(null);
  useKeepInside(box, tip.at);

  // Nasłuch zakładamy synchronicznie po wstawieniu okienka: Escape wciśnięty tuż po otwarciu
  // też je zamyka.
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent): void => {
      const target = event.target;
      // Kliknięcie w przycisk obsługuje on sam: zamknięcie tutaj otwarłoby okienko od nowa.
      if (target instanceof Node && tip.opener.contains(target)) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [tip]);

  return (
    <div ref={box} class="sheet info-popup" style={{ '--info-below': `${tip.below * 100}%` }}>
      {tip.text.split('\n').map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

/**
 * Miejsce na okienko: raz, w warstwie sceny, za ekranem. Region „status” istnieje stale, więc
 * czytnik ekranu odczytuje treść, gdy się w nim pojawia; fokus zostaje na przycisku.
 */
export function InfoOutlet() {
  const tip = openTip.value;
  return <div role="status">{tip !== null && <InfoPopup key={tip.serial} tip={tip} />}</div>;
}
