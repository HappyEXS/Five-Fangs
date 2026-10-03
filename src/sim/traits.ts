// Faza 5: cechy okresowe (ADR 0009). Efekty trafiają do tej samej kolejki co obrażenia,
// więc leczenie z danego ticka może uratować jednostkę przed śmiercią w tym samym ticku.
import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import { TEAM_SIZE } from './types.ts';

/** Leczenie okresowe: co `healInterval` ticków od początku walki leczy siebie albo całą drużynę. */
export function applyPeriodicHeals(battle: Battle): void {
  const { state, specs, pending, healers } = battle;
  for (let h = 0; h < healers.length; h++) {
    const i = healers[h] ?? 0;
    if (!isAlive(state.status[i] ?? 0)) continue;
    const timer = (state.traitTimer[i] ?? 0) + 1;
    if (timer < (specs.healInterval[i] ?? 0)) {
      state.traitTimer[i] = timer;
      continue;
    }
    state.traitTimer[i] = 0;

    const amount = specs.healAmount[i] ?? 0;
    if ((specs.healTeam[i] ?? 0) === 0) {
      pending.heal[i] = (pending.heal[i] ?? 0) + amount;
      state.healingDone[i] = (state.healingDone[i] ?? 0) + amount;
      continue;
    }
    const first = i < TEAM_SIZE ? 0 : TEAM_SIZE;
    for (let ally = first; ally < first + TEAM_SIZE; ally++) {
      if (!isAlive(state.status[ally] ?? 0)) continue;
      pending.heal[ally] = (pending.heal[ally] ?? 0) + amount;
      state.healingDone[i] = (state.healingDone[i] ?? 0) + amount;
    }
  }
}
