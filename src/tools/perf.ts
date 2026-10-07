// Pomiar budżetów renderera (/tools.html?view=perf) na walce 5 na 5, która się nie kończy.
// Parametr `backdrop=<id>` wybiera tło świata; bez niego pomiar idzie na tle domyślnym.
//
// Trzy przebiegi:
//   1. czas klatki liczonej w pętli, bez czekania na odświeżanie ekranu – koszt kodu gry
//      (symulacja + wywołania rysowania); przeglądarka opróżnia przy tym kolejkę rysowania
//      nieregularnie, stąd pojedyncze długie klatki, których przy zwykłym odtwarzaniu nie ma;
//   2. alokacje na stercie JS w stanie ustalonym, w krótkich seriach między wymuszonymi
//      odśmieceniami (dłuższa seria zapełniłaby młodą generację i silnik sam by ją opróżnił,
//      zaniżając wynik);
//   3. zwykłe odtwarzanie przez requestAnimationFrame: czas JS klatki i odstępy między
//      klatkami, które pokazują, czy przeglądarka razem z rasteryzacją nadąża z wyświetlaniem.
//
// Pomiar alokacji wymaga Chromium uruchomionego z flagami
//   --enable-precise-memory-info --js-flags=--expose-gc
// Wynik trafia do elementu #perf-result; metoda i wyniki w docs/ARCHITECTURE.md §5.7.
import { requireContent } from '../content/load.ts';
import { createBattleRunner } from '../game/battle-runner.ts';
import { attachStage, get2dContext } from '../game/stage.ts';
import { guardedLoad } from '../game/update.ts';
import { loadUnitsAtlas } from '../render/atlas.ts';
import { createCanvasRenderer } from '../render/canvas-renderer.ts';
import { debugStats } from '../render/debug.ts';
import { melee, ranged } from '../sim/fixtures.ts';
import { type BattleSetup, OUTCOME_IN_PROGRESS, validateSetup } from '../sim/index.ts';
import { backdropFromQuery } from './backdrop-param.ts';

const WARMUP_FRAMES = 1200;
const TIMED_FRAMES = 3000;
const ALLOC_ROUNDS = 40;
const ALLOC_FRAMES = 100;
const PACED_FRAMES = 600;
/** Klatki rAF pomijane na początku: przeglądarka nadrabia w nich rysowanie zaległe po pętlach. */
const PACED_SETTLE_FRAMES = 60;
const FRAME_MS = 1000 / 60;

interface ChromiumMemory {
  readonly usedJSHeapSize: number;
}

function heapUsed(): number | null {
  const memory = (performance as { memory?: ChromiumMemory }).memory;
  return memory === undefined ? null : memory.usedJSHeapSize;
}

/** Wartość na pozycji `fraction` w posortowanej próbce. */
function quantile(sorted: Float64Array, fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function mean(values: Float64Array): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/**
 * Dziesięć jednostek, które walczą bez końca: ogromne HP i brak limitu czasu. Pracują wszystkie
 * ścieżki renderera: chód, zamachy, pociski zwykłe, przebijające i wycelowane (lot łukiem),
 * cięciwy, błyski, liczby obrażeń i leczenia, odrzut (różne wartości po obu stronach, żeby
 * front się przesuwał).
 */
function endlessSetup(arena: BattleSetup['arena']): BattleSetup {
  const tank = { maxHp: 100_000_000, attack: 37 };
  const team = (knockback: number) => [
    melee({ ...tank, knockback }),
    melee({ ...tank, knockback }),
    ranged(tank),
    ranged({ ...tank, pierce: true }),
    ranged({
      ...tank,
      healAmount: 25,
      healInterval: 20,
      healTeam: true,
      targetLast: true,
      range: arena.width,
    }),
  ];
  return {
    arena: { ...arena, timeLimitTicks: 100_000_000 },
    player: team(2560),
    enemy: team(1280),
  };
}

export async function startPerf(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  ui: HTMLElement,
): Promise<void> {
  const content = requireContent();
  const ctx = get2dContext(canvas);
  const viewport = attachStage(stage, canvas);
  const atlas = await guardedLoad('atlas:units', loadUnitsAtlas);
  const renderer = createCanvasRenderer(ctx, { atlas, rigs: content.rigs });
  const backdrop = backdropFromQuery(new URLSearchParams(location.search));
  if (backdrop !== null) renderer.setBackdrop(backdrop);

  const setup = endlessSetup(content.arena);
  const problems = validateSetup(setup);
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const sword = content.heroes.get('swordsman_a')?.visual ?? null;
  const bow = content.heroes.get('archer_a')?.visual ?? null;
  const visuals = [sword, sword, bow, bow, bow, sword, sword, bow, bow, bow];
  const runner = createBattleRunner(setup, visuals, renderer);

  const runFrames = (frames: number): void => {
    for (let i = 0; i < frames; i++) runner.frame(viewport, FRAME_MS);
  };
  // Dla profilera (DevTools albo protokół CDP): `ffPerfFrames(n)` liczy n klatek tej walki.
  (globalThis as { ffPerfFrames?: (frames: number) => void }).ffPerfFrames = runFrames;

  runFrames(WARMUP_FRAMES);

  // 1. Czas klatki w pętli. Zegar przeglądarki ma rozdzielczość 0,005–0,1 ms, więc pojedyncze
  // próbki są zgrubne; średnie liczymy z czasu całej pętli i z sum, w których błąd się uśrednia.
  const loopTimes = new Float64Array(TIMED_FRAMES);
  let simMs = 0;
  let renderMs = 0;
  let drawCalls = 0;
  const timedStart = performance.now();
  for (let i = 0; i < TIMED_FRAMES; i++) {
    const started = performance.now();
    runner.frame(viewport, FRAME_MS);
    loopTimes[i] = performance.now() - started;
    simMs += debugStats.simMs;
    renderMs += debugStats.renderMs;
    drawCalls += debugStats.drawCalls;
  }
  const timedTotal = performance.now() - timedStart;
  loopTimes.sort();

  // 2. Alokacje: bajty przybyłe na stercie w serii klatek zaczętej tuż po odśmieceniu.
  const gc = (globalThis as { gc?: () => void }).gc;
  let allocation = 'niedostępne (uruchom przeglądarkę z flagami z nagłówka src/tools/perf.ts)';
  if (gc !== undefined && heapUsed() !== null) {
    const perFrame = new Float64Array(ALLOC_ROUNDS);
    for (let round = 0; round < ALLOC_ROUNDS; round++) {
      gc();
      const before = heapUsed() ?? 0;
      runFrames(ALLOC_FRAMES);
      perFrame[round] = ((heapUsed() ?? 0) - before) / ALLOC_FRAMES;
    }
    perFrame.sort();
    allocation = `mediana ${quantile(perFrame, 0.5).toFixed(0)} B na klatkę, min ${quantile(perFrame, 0).toFixed(0)}, max ${quantile(perFrame, 1).toFixed(0)} (${ALLOC_ROUNDS} serii po ${ALLOC_FRAMES} klatek)`;
  }

  // 3. Zwykłe odtwarzanie przez requestAnimationFrame.
  const intervals = new Float64Array(PACED_FRAMES);
  const pacedTimes = new Float64Array(PACED_FRAMES);
  await new Promise<void>((resolve) => {
    let last = 0;
    let count = -PACED_SETTLE_FRAMES;
    const onFrame = (now: number): void => {
      if (count >= 0) intervals[count] = now - last;
      last = now;
      const started = performance.now();
      runner.frame(viewport, FRAME_MS);
      if (count >= 0) pacedTimes[count] = performance.now() - started;
      count++;
      if (count < PACED_FRAMES) requestAnimationFrame(onFrame);
      else resolve();
    };
    requestAnimationFrame(onFrame);
  });
  const pacedMean = mean(pacedTimes);
  const intervalMean = mean(intervals);
  intervals.sort();
  pacedTimes.sort();
  // Zgubiona klatka: odstęp wyraźnie dłuższy od typowego dla tego ekranu.
  const typical = quantile(intervals, 0.5);
  let dropped = 0;
  for (const interval of intervals) if (interval > typical * 1.5) dropped++;

  const { state } = runner.battle;
  const result = document.createElement('pre');
  result.id = 'perf-result';
  result.className = 'sandbox-panel';
  result.textContent = [
    `walka 5 na 5, canvas ${canvas.width}x${canvas.height}, DPR ${window.devicePixelRatio}, ${(drawCalls / TIMED_FRAMES).toFixed(0)} drawImage na klatkę`,
    `klatka w pętli (${TIMED_FRAMES}): średnio ${(timedTotal / TIMED_FRAMES).toFixed(3)} ms (symulacja ${(simMs / TIMED_FRAMES).toFixed(4)}, render ${(renderMs / TIMED_FRAMES).toFixed(3)}), mediana ${quantile(loopTimes, 0.5).toFixed(2)}, p99 ${quantile(loopTimes, 0.99).toFixed(2)}, max ${quantile(loopTimes, 1).toFixed(2)}`,
    `alokacje: ${allocation}`,
    `odtwarzanie rAF (${PACED_FRAMES}): czas JS klatki średnio ${pacedMean.toFixed(3)} ms, p99 ${quantile(pacedTimes, 0.99).toFixed(2)}, max ${quantile(pacedTimes, 1).toFixed(2)}`,
    `  odstęp klatek średnio ${intervalMean.toFixed(2)} ms, mediana ${typical.toFixed(2)}, p99 ${quantile(intervals, 0.99).toFixed(2)}, max ${quantile(intervals, 1).toFixed(2)}, zgubione klatki ${dropped}`,
    `stan końcowy: tick ${state.tick}, pociski w locie ${state.projCount}, walka ${state.outcome === OUTCOME_IN_PROGRESS ? 'trwa' : 'ZAKOŃCZONA (pomiar nieważny)'}`,
  ].join('\n');
  ui.append(result);
}
