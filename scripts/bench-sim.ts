// pnpm bench – pomiar budżetów symulacji (CLAUDE.md): liczba pełnych walk na sekundę,
// czas ticka i alokacje w ustalonym stanie. Z flagą --check kończy się błędem poniżej budżetu.
//
// Pomiar alokacji wymaga `node --expose-gc`; skrypt `pnpm bench` ustawia tę flagę.
import { melee, ranged, setupOf } from '../src/sim/fixtures.ts';
import { createBattle, runBattleToEnd, stepBattle } from '../src/sim/index.ts';
import { GOLDEN_SETUPS } from '../tests/golden/setups.ts';

const BATTLES_PER_SECOND_BUDGET = 2000;
const TICK_MS_BUDGET = 0.2;
/** Szum pomiaru sterty; prawdziwa alokacja co tick dałaby megabajty. */
const HEAP_NOISE_BYTES = 64 * 1024;

const check = process.argv.includes('--check');
const setup = GOLDEN_SETUPS['full-5v5'];
if (setup === undefined) throw new Error('golden setup "full-5v5" is missing');

// Rozgrzewka, żeby mierzyć kod po optymalizacji JIT.
for (let i = 0; i < 300; i++) runBattleToEnd(createBattle(setup));

// Najlepsza z kilku rund: pojedynczy pomiar waha się o kilka procent, a zakłócenia
// (inne procesy, GC) tylko wydłużają czas, więc minimum najlepiej oddaje koszt samego kodu.
const ROUNDS = 5;
const ROUND_BATTLES = 600;
let bestMs = Number.POSITIVE_INFINITY;
let ticks = 0;
for (let round = 0; round < ROUNDS; round++) {
  ticks = 0;
  const start = performance.now();
  for (let i = 0; i < ROUND_BATTLES; i++) ticks += runBattleToEnd(createBattle(setup)).ticks;
  const elapsed = performance.now() - start;
  if (elapsed < bestMs) bestMs = elapsed;
}
const battles = ROUND_BATTLES;
const battlesPerSecond = (battles / bestMs) * 1000;
const tickMs = bestMs / ticks;

// Alokacje w gorącej pętli: jedna długa walka, w której nikt nie ginie (zerowe obrażenia),
// ale działają wszystkie fazy: ruch, zamachy, pociski, odrzut, zdarzenia.
const endless = createBattle(
  setupOf(
    [melee({ attack: 0, knockback: 2560 }), ranged({ attack: 0 }), ranged({ attack: 0 })],
    [melee({ attack: 0, knockback: 1280 }), ranged({ attack: 0 }), melee({ attack: 0 })],
    { timeLimitTicks: 10_000_000 },
  ),
);
for (let i = 0; i < 20_000; i++) stepBattle(endless);
const gc = (globalThis as { gc?: () => void }).gc;
let heapDelta: number | null = null;
const HEAP_TICKS = 500_000;
if (gc !== undefined) {
  gc();
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < HEAP_TICKS; i++) stepBattle(endless);
  heapDelta = process.memoryUsage().heapUsed - before;
}

const fmt = (value: number, digits: number) => value.toFixed(digits);
console.log(`Walka: full-5v5, średnio ${fmt(ticks / battles, 0)} ticków`);
console.log(
  `Pełne walki:   ${fmt(battlesPerSecond, 0)} / s   (budżet > ${BATTLES_PER_SECOND_BUDGET})`,
);
console.log(`Czas ticka:    ${fmt(tickMs * 1e6, 0)} ns   (budżet < ${TICK_MS_BUDGET * 1e6} ns)`);
if (heapDelta === null) {
  console.log('Alokacje:      pominięte (uruchom przez `pnpm bench`, potrzebna flaga --expose-gc)');
} else {
  console.log(
    `Alokacje:      ${fmt(heapDelta / 1024, 1)} KB przyrostu sterty na ${HEAP_TICKS} ticków (budżet: 0 na tick)`,
  );
}

if (check) {
  const failures: string[] = [];
  if (battlesPerSecond < BATTLES_PER_SECOND_BUDGET) failures.push('za mało walk na sekundę');
  if (tickMs > TICK_MS_BUDGET) failures.push('tick za wolny');
  if (heapDelta !== null && heapDelta > HEAP_NOISE_BYTES) failures.push('alokacje w gorącej pętli');
  if (failures.length > 0) {
    console.error(`\nBudżet przekroczony: ${failures.join(', ')}`);
    process.exit(1);
  }
}
