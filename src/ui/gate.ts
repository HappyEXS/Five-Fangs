// Brama: dwa żelazne skrzydła z kłami, które zamykają się z lewej i z prawej i oddzielają walkę
// od reszty gry (ADR 0015, uzupełnienie). Ten moduł to tylko kolejność ruchów i stan; rysunek
// i animacje elementów są w Gate.tsx. Zależności od przeglądarki (animacje, czas, ustawienie
// „ograniczony ruch”) przychodzą z zewnątrz, więc kolejność da się sprawdzić w testach.
import { type Signal, signal } from '@preact/signals';

/** `open`: brama za kulisami; `closed`: skrzydła zwarte, zasłaniają scenę. */
export type GatePhase = 'open' | 'closing' | 'closed' | 'opening';

export interface GateMotion {
  /** Zamyka skrzydła (z uderzeniem i ryglami); rozwiązuje się, gdy brama jest zamknięta. */
  close(reduced: boolean): Promise<void>;
  /** Otwiera skrzydła; rozwiązuje się, gdy brama zniknęła ze sceny. */
  open(reduced: boolean): Promise<void>;
}

export interface GateDeps {
  readonly motion: GateMotion;
  /** Czy gracz ustawił w systemie ograniczenie ruchu. */
  reducedMotion(): boolean;
  wait(ms: number): Promise<void>;
}

/** Jak długo brama stoi zamknięta przy przejściu: nowa scena zdąży się narysować pod nią. */
export const HOLD_MS = 220;

export interface Gate {
  readonly phase: Signal<GatePhase>;
  /** Brama się rusza albo trwa przejście `pass`; inne wywołania czekają na jego koniec. */
  readonly busy: Signal<boolean>;
  close(): Promise<void>;
  open(): Promise<void>;
  /**
   * Przejście przez bramę: zamyka ją (o ile nie jest zamknięta), w zamknięciu wykonuje `change`
   * (zmianę sceny), chwilę czeka i otwiera. Wywołanie w trakcie innego ruchu jest pomijane:
   * podwójne kliknięcie nie zaczyna drugiego przejścia.
   */
  pass(change: () => void): Promise<void>;
}

export function createGate(deps: GateDeps): Gate {
  const phase = signal<GatePhase>('open');
  const busy = signal(false);
  let current: Promise<void> | null = null;

  /** Jeden ruch naraz; kolejne wywołania dostają obietnicę trwającego ruchu. */
  const exclusive = (run: () => Promise<void>): Promise<void> => {
    if (current !== null) return current;
    busy.value = true;
    current = run().finally(() => {
      current = null;
      busy.value = false;
    });
    return current;
  };

  const closeNow = async (): Promise<void> => {
    if (phase.value === 'closed') return;
    phase.value = 'closing';
    await deps.motion.close(deps.reducedMotion());
    phase.value = 'closed';
  };

  const openNow = async (): Promise<void> => {
    if (phase.value === 'open') return;
    phase.value = 'opening';
    await deps.motion.open(deps.reducedMotion());
    phase.value = 'open';
  };

  return {
    phase,
    busy,
    close: () => exclusive(closeNow),
    open: () => exclusive(openNow),
    pass: (change) =>
      exclusive(async () => {
        await closeNow();
        change();
        await deps.wait(HOLD_MS);
        await openNow();
      }),
  };
}
