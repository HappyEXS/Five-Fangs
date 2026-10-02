// Klipy animacji skompilowane do tablic typowanych. Kanał to kość (kąt w radianach)
// albo przesunięcie korzenia; klatki kluczowe interpolujemy funkcją smoothstep.
import type { RawClip } from '../content/schema-rig.ts';

export interface CompiledClip {
  readonly loop: boolean;
  /** Znaczniki zdarzeń jako ułamek klipu. */
  readonly markers: Readonly<Record<string, number>>;
  /** Per kanał: indeks pierwszej klatki w `times`/`values` i liczba klatek (0 = nieanimowany). */
  readonly start: Uint16Array;
  readonly count: Uint16Array;
  readonly times: Float32Array;
  readonly values: Float32Array;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Kompiluje klip. `channels` to nazwy kanałów w kolejności indeksów pozy;
 * pierwsze `angleChannels` z nich to kąty podane w stopniach.
 */
export function compileClip(
  raw: RawClip,
  channels: readonly string[],
  angleChannels: number,
): CompiledClip {
  const start = new Uint16Array(channels.length);
  const count = new Uint16Array(channels.length);
  const times: number[] = [];
  const values: number[] = [];
  channels.forEach((name, index) => {
    const keys = raw.channels[name];
    if (keys === undefined) return;
    start[index] = times.length;
    count[index] = keys.length;
    const scale = index < angleChannels ? DEG_TO_RAD : 1;
    for (const [time, value] of keys) {
      times.push(time);
      values.push(value * scale);
    }
  });
  return {
    loop: raw.loop,
    markers: raw.markers,
    start,
    count,
    times: Float32Array.from(times),
    values: Float32Array.from(values),
  };
}

/**
 * Próbkuje klip w chwili `t` (0..1) do `out`. Kanały, których klip nie animuje,
 * dostają wartość z `rest` (postawa jednostki). Bez alokacji.
 */
export function sampleClip(
  clip: CompiledClip,
  t: number,
  rest: Float32Array,
  out: Float32Array,
  outOffset: number,
): void {
  const { start, count, times, values } = clip;
  for (let channel = 0; channel < start.length; channel++) {
    const n = count[channel] ?? 0;
    if (n === 0) {
      out[outOffset + channel] = rest[channel] ?? 0;
      continue;
    }
    const first = start[channel] ?? 0;
    let i = first;
    const last = first + n - 1;
    // Kanały mają po kilka klatek, więc przeszukiwanie liniowe jest najszybsze.
    while (i < last && (times[i + 1] ?? 1) <= t) i++;
    if (i >= last) {
      out[outOffset + channel] = values[last] ?? 0;
      continue;
    }
    const t0 = times[i] ?? 0;
    const v0 = values[i] ?? 0;
    const u = (t - t0) / ((times[i + 1] ?? 1) - t0);
    const eased = u <= 0 ? 0 : u * u * (3 - 2 * u);
    out[outOffset + channel] = v0 + ((values[i + 1] ?? 0) - v0) * eased;
  }
}
