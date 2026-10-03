// Okienka nie mogą wychodzić poza scenę gry: po wyświetleniu mierzymy je i wsuwamy do środka.
// Rozmiar okienka zależy od treści, języka i czcionki, więc nie da się go założyć z góry.
import type { RefObject } from 'preact';
import { useLayoutEffect } from 'preact/hooks';

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Przesunięcie, które wsuwa `box` do `area` z marginesem `margin` z każdej strony. Gdy `box` jest
 * w danej osi większy niż obszar, wyrównuje go do lewej albo górnej krawędzi obszaru: początek
 * treści (tytuł, pierwsze opcje) zostaje widoczny.
 */
export function shiftInside(box: Box, area: Box, margin: number): { dx: number; dy: number } {
  const axis = (start: number, end: number, from: number, to: number): number => {
    if (start < from + margin) return from + margin - start;
    if (end > to - margin) return Math.max(to - margin - end, from + margin - start);
    return 0;
  };
  return {
    dx: axis(box.left, box.right, area.left, area.right),
    dy: axis(box.top, box.bottom, area.top, area.bottom),
  };
}

/** Margines od krawędzi sceny jako ułamek jej szerokości. */
const MARGIN = 0.012;

/**
 * Trzyma element pozycjonowany absolutnie w granicach jego rodzica (ekranu sceny). Element stoi
 * środkiem w poziomie w punkcie `at` (ułamek szerokości rodzica, CSS przesuwa go o -50%),
 * w pionie tam, gdzie każe jego CSS; jeśli się nie mieści, jest przesuwany, a gdy jest wyższy
 * niż scena, dostaje przewijanie. Położenie zapisujemy w procentach, więc zostaje poprawne,
 * gdy scena skaluje się z oknem. Przelicza się przy każdej zmianie rozmiaru elementu.
 */
export function useKeepInside(ref: RefObject<HTMLElement | null>, at: number): void {
  useLayoutEffect(() => {
    const element = ref.current;
    const parent = element?.offsetParent;
    if (element === null || element === undefined || !(parent instanceof HTMLElement)) return;

    const place = (): void => {
      // Najpierw naturalne położenie: przy kotwicy, w pionie według CSS.
      element.style.left = `${at * 100}%`;
      element.style.top = '';
      element.style.bottom = '';
      const area = parent.getBoundingClientRect();
      if (area.width === 0 || area.height === 0) return;
      const margin = area.width * MARGIN;
      element.style.maxHeight = `${((area.height - 2 * margin) / area.height) * 100}%`;
      const box = element.getBoundingClientRect();
      const { dx, dy } = shiftInside(box, area, margin);
      if (dx !== 0) {
        const center = box.left + box.width / 2 + dx - area.left;
        element.style.left = `${(center / area.width) * 100}%`;
      }
      if (dy !== 0) {
        element.style.top = `${((box.top + dy - area.top) / area.height) * 100}%`;
        element.style.bottom = 'auto';
      }
    };

    place();
    // Zmiana rozmiaru (czcionka, język, skalowanie sceny z oknem) przelicza położenie w następnej
    // klatce: poprawka wewnątrz wywołania obserwatora zmieniłaby rozmiar w trakcie jego pętli.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref, at]);
}
