// Faza 2: ruch. Jednostka idzie w stronę celu o swój krok, najdalej do granicy zasięgu.
// Sojusznicy się nie blokują. Pozycję celu bierzemy z początku ticka (`prevX`), więc wynik
// nie zależy od tego, kto ruszył się wcześniej w tej samej fazie.
import type { Battle } from './battle.ts';
import { MAX_UNITS, STATUS_MOVING } from './types.ts';

export function move(battle: Battle): void {
  const { state, specs } = battle;
  for (let i = 0; i < MAX_UNITS; i++) {
    if (state.status[i] !== STATUS_MOVING) continue;
    const myX = state.prevX[i] ?? 0;
    const delta = (state.prevX[state.target[i] ?? 0] ?? 0) - myX;
    const distance = Math.abs(delta);

    let step = distance - (specs.range[i] ?? 0);
    const maxStep = specs.moveStep[i] ?? 0;
    if (step > maxStep) step = maxStep;
    if (step <= 0) continue;

    state.x[i] = delta > 0 ? myX + step : myX - step;
  }
}
