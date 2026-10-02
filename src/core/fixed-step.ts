// Akumulator stałego kroku. Czysta logika bez zegara: czas klatki podaje wywołujący,
// dzięki czemu pętlę da się testować na sztucznym zegarze.

export interface FixedStep {
  /** Długość kroku w milisekundach. */
  readonly stepMs: number;
  /** Górny limit czasu jednej klatki; chroni przed lawiną kroków po przestoju karty. */
  readonly maxFrameMs: number;
  accumulatorMs: number;
  /** Mnożnik prędkości gry (1, 2, 4). */
  speed: number;
  paused: boolean;
}

export function createFixedStep(stepsPerSecond: number, maxFrameMs = 250): FixedStep {
  return {
    stepMs: 1000 / stepsPerSecond,
    maxFrameMs,
    accumulatorMs: 0,
    speed: 1,
    paused: false,
  };
}

/**
 * Dolicza czas klatki i zwraca liczbę kroków do wykonania teraz.
 * W pauzie czas nie płynie i akumulator się nie zmienia.
 */
export function advanceFixedStep(loop: FixedStep, frameMs: number): number {
  if (loop.paused || !(frameMs > 0)) return 0;
  const clamped = frameMs > loop.maxFrameMs ? loop.maxFrameMs : frameMs;
  loop.accumulatorMs += clamped * loop.speed;
  const steps = Math.floor(loop.accumulatorMs / loop.stepMs);
  loop.accumulatorMs -= steps * loop.stepMs;
  return steps;
}

/** Postęp między ostatnim a następnym krokiem, 0..1; do interpolacji w rendererze. */
export function fixedStepAlpha(loop: FixedStep): number {
  return loop.accumulatorMs / loop.stepMs;
}

/** Zeruje zaległy czas, np. po powrocie do ukrytej karty. */
export function resetFixedStep(loop: FixedStep): void {
  loop.accumulatorMs = 0;
}
