// Publiczne API symulacji walki (docs/ARCHITECTURE.md §3.6).
export { type Battle, createBattle } from './battle.ts';
export { isAlive } from './decide.ts';
export * from './events.ts';
export { hashState } from './hash.ts';
export { type BattleResult, battleResult, drainEvents, runBattleToEnd } from './result.ts';
export type { BattleState, UnitSpecs } from './state.ts';
export { stepBattle } from './step.ts';
export * from './types.ts';
export { projectileBound, validateSetup, validateUnitSpec } from './validate-setup.ts';
