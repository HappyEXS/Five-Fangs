// Pętla klatek na requestAnimationFrame. Podaje czas od poprzedniej klatki;
// krok symulacji wylicza z niego akumulator z core/fixed-step.

export interface FrameLoop {
  start(): void;
  stop(): void;
}

export function createFrameLoop(onFrame: (frameMs: number) => void): FrameLoop {
  let handle = 0;
  let last = -1;
  let running = false;

  const tick = (now: number): void => {
    if (!running) return;
    const frameMs = last < 0 ? 0 : now - last;
    last = now;
    onFrame(frameMs);
    handle = requestAnimationFrame(tick);
  };

  // Ukryta karta nie dostaje klatek; po powrocie nie doliczamy czasu przestoju.
  const onVisibilityChange = (): void => {
    last = -1;
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = -1;
      document.addEventListener('visibilitychange', onVisibilityChange);
      handle = requestAnimationFrame(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(handle);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
