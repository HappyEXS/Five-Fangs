// Faza 2: ruch. Jednostka idzie w stronę celu o swój krok, najdalej do granicy zasięgu.
// Sojusznicy się nie blokują. Pozycje bierzemy z początku ticka (`prevX`), więc wynik
// nie zależy od tego, kto ruszył się wcześniej w tym samym ticku.
import type { Battle } from './battle.ts';

/** Ruch jednostki `i`, która w tym ticku ma status Moving. */
export function moveUnit(battle: Battle, i: number): void {
  const { state, specs } = battle;
  const myX = state.prevX[i] ?? 0;
  const delta = (state.prevX[state.target[i] ?? 0] ?? 0) - myX;
  const distance = Math.abs(delta);

  let step = distance - (specs.range[i] ?? 0);
  const maxStep = specs.moveStep[i] ?? 0;
  if (step > maxStep) step = maxStep;
  if (step <= 0) return;

  state.x[i] = delta > 0 ? myX + step : myX - step;
}
